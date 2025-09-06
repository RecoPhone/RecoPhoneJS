import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ───────── Cache mémoire simple (TTL + bornage) ───────── */
type GeoPayload = { lat: number; lon: number; display_name: string };
type CacheEntry<T> = { v: T; e: number; t: number };
const GEO_CACHE: Record<string, CacheEntry<GeoPayload>> = {};
const GEO_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const GEO_CACHE_MAX = 500;

function cacheGet(k: string): GeoPayload | null {
  const hit = GEO_CACHE[k];
  if (!hit) return null;
  if (Date.now() > hit.e) { delete GEO_CACHE[k]; return null; }
  hit.t = Date.now(); // LRU
  return hit.v;
}
function cacheSet(k: string, v: GeoPayload) {
  GEO_CACHE[k] = { v, e: Date.now() + GEO_TTL_MS, t: Date.now() };
  const keys = Object.keys(GEO_CACHE);
  if (keys.length > GEO_CACHE_MAX) {
    keys.sort((a, b) => (GEO_CACHE[a].t - GEO_CACHE[b].t)); // old → new
    const toDrop = Math.max(0, keys.length - GEO_CACHE_MAX);
    for (let i = 0; i < toDrop; i++) delete GEO_CACHE[keys[i]];
  }
}

/* ───────── Rate limit naïf (token bucket en mémoire) ───────── */
type Bucket = { tokens: number; ts: number };
const BUCKETS: Record<string, Bucket> = {};
const CAP = 30;               // 30 req
const WINDOW_MS = 60_000;     // par minute

function allow(ip: string) {
  const now = Date.now();
  const b = BUCKETS[ip] || { tokens: CAP, ts: now };
  // refill linéaire
  const elapsed = now - b.ts;
  const refill = (elapsed / WINDOW_MS) * CAP;
  b.tokens = Math.min(CAP, b.tokens + refill);
  b.ts = now;
  if (b.tokens < 1) { BUCKETS[ip] = b; return false; }
  b.tokens -= 1;
  BUCKETS[ip] = b;
  return true;
}

function getIP(req: NextRequest) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "0.0.0.0";
}

/* ───────── Helpers ───────── */
function withTimeout<T>(p: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      // abort côté fetch si possible
      try { (signal as any)?.throwIfAborted?.(); } catch {}
      reject(Object.assign(new Error("Timeout"), { name: "AbortError" }));
    }, ms);
    p.then((v) => { clearTimeout(id); resolve(v); })
     .catch((e) => { clearTimeout(id); reject(e); });
  });
}

function sanitizeQuery(s: string) {
  return s.replace(/\s+/g, " ").trim().slice(0, 140);
}

/* ───────── Handler GET ───────── */
export async function GET(req: NextRequest) {
  const ip = getIP(req);
  if (!allow(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const country = (searchParams.get("country") || "be").toLowerCase();

  if (!q || q.trim() === "") {
    return NextResponse.json({ error: "Missing 'q'" }, { status: 400 });
  }

  const query = sanitizeQuery(q);
  const key = `${country}|${query}`;
  const hit = cacheGet(key);
  if (hit) return NextResponse.json(hit, { status: 200 });

  const controller = new AbortController();
  const ua = process.env.GEOCODE_UA || "recophone-devis/1.0 (contact: admin@recophone.be)";
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=${encodeURIComponent(country)}&q=${encodeURIComponent(query)}`;

  try {
    const res = await withTimeout(
      fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": ua,
          "Accept-Language": "fr-BE,fr;q=0.9,en;q=0.6",
          "Accept": "application/json",
          "Referer": "https://recophone.be/",
        },
        cache: "no-store",
      }),
      4000,
      controller.signal
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
    }
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const first = arr[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    if (!isFinite(lat) || !isFinite(lon)) {
      return NextResponse.json({ error: "Invalid upstream coords" }, { status: 502 });
    }
    const payload: GeoPayload = { lat, lon, display_name: String(first.display_name || query) };
    cacheSet(key, payload);
    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    const aborted = err?.name === "AbortError";
    return NextResponse.json({ error: aborted ? "Timeout" : "Geocode error" }, { status: aborted ? 504 : 500 });
  }
}
