import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ───────── Rate limit local ───────── */
type Bucket = { tokens: number; ts: number };
const BUCKETS: Record<string, Bucket> = {};
const CAP = 60;               // 60 req/min
const WINDOW_MS = 60_000;

function allow(ip: string) {
  const now = Date.now();
  const b = BUCKETS[ip] || { tokens: CAP, ts: now };
  const elapsed = now - b.ts;
  const refill = (elapsed / WINDOW_MS) * CAP;
  b.tokens = Math.min(CAP, b.tokens + refill);
  b.ts = now;
  if (b.tokens < 1) { BUCKETS[ip] = b; return false; }
  b.tokens -= 1; BUCKETS[ip] = b; return true;
}
function getIP(req: NextRequest) {
  const xf = req.headers.get("x-forwarded-for"); if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "0.0.0.0";
}

/* ───────── Helpers ───────── */
function parseLatLon(s: string): { lat: number; lon: number } | null {
  const m = s.split(",");
  if (m.length !== 2) return null;
  const lat = parseFloat(m[0]), lon = parseFloat(m[1]);
  if (!isFinite(lat) || !isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}
function withTimeout<T>(p: Promise<T>, ms: number, _signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject(Object.assign(new Error("Timeout"), { name: "AbortError" }));
    }, ms);
    p.then((v) => { clearTimeout(id); resolve(v); })
     .catch((e) => { clearTimeout(id); reject(e); });
  });
}

/* ───────── Handler ───────── */
export async function GET(req: NextRequest) {
  const ip = getIP(req);
  if (!allow(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  if (!fromStr || !toStr) {
    return NextResponse.json({ error: "Missing 'from' or 'to'" }, { status: 400 });
  }
  const from = parseLatLon(fromStr);
  const to = parseLatLon(toStr);
  if (!from || !to) {
    return NextResponse.json({ error: "Invalid 'from' or 'to' format (lat,lon)" }, { status: 400 });
  }

  const controller = new AbortController();
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false&alternatives=false`;

  try {
    const res = await withTimeout(
      fetch(osrmUrl, { method: "GET", cache: "no-store", signal: controller.signal }),
      4000,
      controller.signal
    );
    if (res.ok) {
      const j = await res.json();
      const route = j && j.routes && j.routes[0];
      if (route && typeof route.distance === "number") {
        const distanceKm = route.distance / 1000;
        const durationMin = route.duration ? route.duration / 60 : undefined;
        return NextResponse.json({ distanceKm, durationMin, mode: "osrm" as const }, { status: 200 });
      }
    }
    // sinon, fallback
  } catch (__) {
    // timeout ou erreur -> fallback
  }

  // Fallback Haversine (vol d'oiseau)
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return NextResponse.json({ distanceKm: d, mode: "haversine" as const }, { status: 200 });
}
