"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ===================== Types ===================== */
export type ClientAddress = {
  street: string;
  number: string;
  postalCode: string;
  city: string;
};

export type ClientInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes?: string;
  payInTwo: boolean;
  signatureDataUrl?: string | null;
  aDomicile: boolean;
  address?: ClientAddress | null;
  cgvAccepted: boolean;

  // Distance & frais
  distanceKm?: number | null;
  travelFee?: number | null;
};

export type StepInfoProps = {
  value: ClientInfo;
  onChange: (val: ClientInfo) => void;
  onValidityChange?: (isValid: boolean) => void;
};

/* ===================== Constantes ===================== */
// Base atelier (tu peux déplacer ça dans un fichier config si tu veux)
const BASE_ADDRESS_TEXT = "Rte de Saussin 38/23a, 5190 Jemeppe-sur-Sambre, Belgique";
const FREE_RADIUS_KM = 15;
const RATE_EUR_PER_KM = 3.5;

// Caches (sessionStorage) TTL 15 min
const CACHE_TTL_MS = 15 * 60 * 1000;

/* ===================== Utils ===================== */
const emailOk = (v: string) => /\S+@\S+\.\S+/.test(v);
const phoneDigits = (v: string) => v.replace(/\D/g, "");

const phoneOk = (v: string) => {
  const d = phoneDigits(v);
  // Heuristique BE simple: 9 à 12 chiffres (ex: 04xx..., 0032..., +32...)
  return d.length >= 9 && d.length <= 12;
};

const eur = (n: number) =>
  new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n);

function buildAddressText(addr?: ClientAddress | null) {
  if (!addr) return "";
  return `${addr.street} ${addr.number}, ${addr.postalCode} ${addr.city}, Belgique`;
}

// session cache helpers
function cacheGet<T>(k: string): T | null {
  try {
    const raw = sessionStorage.getItem(k);
    if (!raw) return null;
    const obj = JSON.parse(raw) as { v: T; e: number };
    if (!obj.e || Date.now() > obj.e) {
      sessionStorage.removeItem(k);
      return null;
    }
    return obj.v;
  } catch {
    return null;
  }
}
function cacheSet<T>(k: string, v: T) {
  try {
    sessionStorage.setItem(k, JSON.stringify({ v, e: Date.now() + CACHE_TTL_MS }));
  } catch {}
}

/* ===================== Component ===================== */
const StepInfo: React.FC<StepInfoProps> = ({ value, onChange, onValidityChange }) => {
  const v = value;

  /* ---------- Validation globale step ---------- */
  const isBaseValid =
    v.firstName.trim() !== "" &&
    v.lastName.trim() !== "" &&
    emailOk(v.email) &&
    phoneOk(v.phone);

  const isPay2xValid = !v.payInTwo || !!v.signatureDataUrl;

  const addr = v.address;
  const isAddressComplete =
    !!addr &&
    addr.street.trim() !== "" &&
    addr.number.trim() !== "" &&
    addr.postalCode.trim() !== "" &&
    addr.city.trim() !== "";

  // Pour valider l’étape on garde la contrainte CGV si aDomicile
  const isAddrValidForStep = !v.aDomicile || (isAddressComplete && v.cgvAccepted === true);

  const isValid = isBaseValid && isPay2xValid && isAddrValidForStep;

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  /* ---------- Signature Canvas ---------- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // redimensionne le canvas proprement
  const setupCanvas = (preserveImage?: string | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const width = Math.min(parent?.clientWidth ?? 320, 640);
    const height = 160;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#222";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);

    // réappliquer une image existante (si signature enregistrée)
    if (preserveImage) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = preserveImage;
    }
  };

  // Setup quand on active "payer en deux fois" ou au premier rendu si déjà actif
  useEffect(() => {
    if (v.payInTwo) {
      setupCanvas(v.signatureDataUrl ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.payInTwo]);

  // Re-setup on resize (préserve signature enregistrée si existante)
  useEffect(() => {
    const onResize = () => {
      if (v.payInTwo) setupCanvas(v.signatureDataUrl ?? null);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.payInTwo, v.signatureDataUrl]);

  const startDraw = (x: number, y: number) => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!ctx || !c) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };
  const drawTo = (x: number, y: number) => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!ctx || !isDrawing) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasDrawn(true);
  };

  /* ---------- Handlers génériques ---------- */
  const merge = (patch: Partial<ClientInfo>) => onChange({ ...v, ...patch });
  const mergeAddr = (patch: Partial<ClientAddress>) =>
    onChange({
      ...v,
      address: { ...(v.address ?? { street: "", number: "", postalCode: "", city: "" }), ...patch },
    });

  // Si on décoche "à domicile", on nettoie l’adresse & CGV & distance/frais
  // + on annule les éventuelles requêtes en cours
  const abortRef = useRef<{ g1?: AbortController; g2?: AbortController; d?: AbortController }>({});
  useEffect(() => {
    if (!v.aDomicile) {
      // abort inflight
      try {
        abortRef.current.g1?.abort();
        abortRef.current.g2?.abort();
        abortRef.current.d?.abort();
      } catch {}
      onChange({ ...v, address: null, cgvAccepted: false, distanceKm: null, travelFee: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.aDomicile]);

  /* ---------- Auto-calcul distance & frais (debounce + cache + abort) ---------- */
  const [loadingDist, setLoadingDist] = useState(false);
  const clientAddressText = useMemo(() => buildAddressText(addr), [addr]);

  // ID de requête pour ignorer les résultats obsolètes
  const reqIdRef = useRef(0);

  useEffect(() => {
  if (v.aDomicile && v.cgvAccepted) {
    merge({ cgvAccepted: false });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [addr?.street, addr?.number, addr?.postalCode, addr?.city]);

  useEffect(() => {
    if (!(v.aDomicile && isAddressComplete)) return;

    const handle = setTimeout(async () => {
      const myReqId = ++reqIdRef.current;
      setLoadingDist(true);

      try {
        // 1) geocode origin (atelier) — cache
        const keyFrom = `geo:${BASE_ADDRESS_TEXT}`;
        let from = cacheGet<{ lat: number; lon: number }>(keyFrom);
        if (!from) {
          const ac = new AbortController();
          abortRef.current.g1 = ac;
          const res = await fetch(
            `/api/geocode?q=${encodeURIComponent(BASE_ADDRESS_TEXT)}&country=be`,
            { signal: ac.signal }
          );
          if (!res.ok) throw new Error("geocode-from");
          const j = await res.json();
          if (!j?.lat || !j?.lon) throw new Error("geocode-from");
          from = { lat: j.lat, lon: j.lon };
          cacheSet(keyFrom, from);
        }

        // 2) geocode destination (client) — cache
        const keyTo = `geo:${clientAddressText}`;
        let to = cacheGet<{ lat: number; lon: number }>(keyTo);
        if (!to) {
          const ac = new AbortController();
          abortRef.current.g2 = ac;
          const res = await fetch(
            `/api/geocode?q=${encodeURIComponent(clientAddressText)}&country=be`,
            { signal: ac.signal }
          );
          if (!res.ok) throw new Error("geocode-to");
          const j = await res.json();
          if (!j?.lat || !j?.lon) throw new Error("geocode-to");
          to = { lat: j.lat, lon: j.lon };
          cacheSet(keyTo, to);
        }

        // Si une nouvelle requête est partie entre temps, on ignore
        if (reqIdRef.current !== myReqId) return;

        // 3) distance — cache
        const keyDist = `dist:${from.lat},${from.lon}|${to.lat},${to.lon}`;
        let d = cacheGet<{ distanceKm: number }>(keyDist);
        if (!d) {
          const ac = new AbortController();
          abortRef.current.d = ac;
          const res = await fetch(
            `/api/distance?from=${encodeURIComponent(`${from.lat},${from.lon}`)}&to=${encodeURIComponent(`${to.lat},${to.lon}`)}`,
            { signal: ac.signal }
          );
          if (!res.ok) throw new Error("distance");
          d = await res.json();
          if (typeof d?.distanceKm !== "number") throw new Error("distance");
          cacheSet(keyDist, d);
        }

        // 4) calcul travelFee
        const distanceKm = d.distanceKm ?? 0;
        const beyond = Math.max(0, distanceKm - FREE_RADIUS_KM);
        const travelFee = parseFloat((beyond * RATE_EUR_PER_KM).toFixed(2));

        if (reqIdRef.current !== myReqId) return;
        onChange({ ...v, distanceKm, travelFee });
      } catch {
        if (reqIdRef.current !== myReqId) return;
        onChange({ ...v, distanceKm: null, travelFee: null });
      } finally {
        if (reqIdRef.current === myReqId) setLoadingDist(false);
      }
    }, 600); // debounce 600ms

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.aDomicile, addr?.street, addr?.number, addr?.postalCode, addr?.city]);

  /* ===================== UI ===================== */
  const emailInvalid = v.email.trim() !== "" && !emailOk(v.email);
  const phoneInvalid = v.phone.trim() !== "" && !phoneOk(v.phone);

  const canAcceptCgv =
  !v.aDomicile || (
    !loadingDist &&
    (v.distanceKm ?? null) !== null &&
    (v.travelFee ?? null) !== null
  );

  return (
    <section aria-labelledby="step-info-title" className="w-full">
      <header className="mb-3">
        <h2 id="step-info-title" className="text-xl font-semibold text-[#222]">3) Vos informations</h2>
        <p className="text-sm text-gray-600">Renseignez vos coordonnées. Options supplémentaires selon votre choix.</p>
      </header>

      {/* Coordonnées de base */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
          <input
            id="firstName"
            type="text"
            value={v.firstName}
            onChange={(e) => merge({ firstName: e.target.value })}
            className="w-full rounded-xl bg-white border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
          <input
            id="lastName"
            type="text"
            value={v.lastName}
            onChange={(e) => merge({ lastName: e.target.value })}
            className="w-full rounded-xl bg-white border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
          <input
            id="email"
            type="email"
            value={v.email}
            onChange={(e) => merge({ email: e.target.value })}
            aria-invalid={emailInvalid}
            className={[
              "w-full rounded-xl bg-white border px-3 py-2 text-sm focus:outline-none focus:ring-2",
              emailInvalid ? "border-red-300 focus:ring-red-300" : "border-gray-300 focus:ring-[#54b435]"
            ].join(" ")}
          />
          {emailInvalid && <p className="mt-1 text-[11px] text-red-500">Adresse email invalide.</p>}
        </div>
        <div>
          <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-1">Téléphone *</label>
          <input
            id="phone"
            type="tel"
            value={v.phone}
            onChange={(e) => merge({ phone: e.target.value })}
            aria-invalid={phoneInvalid}
            className={[
              "w-full rounded-xl bg-white border px-3 py-2 text-sm focus:outline-none focus:ring-2",
              phoneInvalid ? "border-red-300 focus:ring-red-300" : "border-gray-300 focus:ring-[#54b435]"
            ].join(" ")}
          />
          {phoneInvalid && <p className="mt-1 text-[11px] text-red-500">Numéro invalide.</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="notes" className="block text-xs font-medium text-gray-700 mb-1">Précisions (facultatif)</label>
          <textarea
            id="notes"
            value={v.notes ?? ""}
            onChange={(e) => merge({ notes: e.target.value })}
            rows={3}
            className="w-full rounded-xl bg-white border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
          />
        </div>
      </div>

      {/* Options */}
      <div className="mt-4 space-y-4">
        {/* Payer en deux fois */}
        <div className="rounded-2xl border border-gray-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-[#222]">Payer en deux fois</span>
              <p className="text-[11px] text-gray-500">Une signature manuscrite est requise.</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={v.payInTwo}
                onChange={(e) =>
                  merge({ payInTwo: e.target.checked, signatureDataUrl: e.target.checked ? v.signatureDataUrl ?? null : null })
                }
              />
              <span className="w-11 h-6 bg-gray-300 rounded-full relative transition peer-checked:bg-[#54b435]">
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:left-6" />
              </span>
            </label>
          </div>

          {v.payInTwo && (
            <div className="px-4 pb-4">
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs text-gray-600 mb-2">Signez ci-dessous :</p>
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    className="w-full rounded-lg border border-gray-300 touch-none bg-white"
                    onPointerDown={(e) => {
                      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
                      const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
                      startDraw(e.clientX - r.left, e.clientY - r.top);
                    }}
                    onPointerMove={(e) => {
                      const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
                      drawTo(e.clientX - r.left, e.clientY - r.top);
                    }}
                    onPointerUp={() => endDraw()}
                  />
                  {!hasDrawn && !v.signatureDataUrl && !isDrawing && (
                    <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
                      Tracez votre signature…
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setupCanvas();
                      setHasDrawn(false);
                      merge({ signatureDataUrl: null });
                    }}
                    className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Effacer
                  </button>
                  <button
                    type="button"
                    disabled={!hasDrawn}
                    onClick={() => {
                      const c = canvasRef.current;
                      if (!c) return;
                      merge({ signatureDataUrl: c.toDataURL("image/png") });
                    }}
                    className={[
                      "rounded-xl px-3 py-1.5 text-sm text-white",
                      hasDrawn ? "" : "opacity-60 cursor-not-allowed"
                    ].join(" ")}
                    style={{ backgroundColor: "#54b435" }}
                  >
                    Enregistrer
                  </button>
                  {v.signatureDataUrl && (
                    <span className="text-[11px] text-gray-500">✓ Signature enregistrée</span>
                  )}
                </div>
                {!isPay2xValid && <p className="mt-2 text-[11px] text-red-500">Signature requise.</p>}
              </div>
            </div>
          )}
        </div>

        {/* À domicile */}
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-[#222]">Réparation à domicile</span>
              <p className="text-[11px] text-gray-500">
                Belgique uniquement. 15 km offerts, {RATE_EUR_PER_KM.toFixed(1)} €/km au-delà.
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={v.aDomicile}
                onChange={(e) => merge({ aDomicile: e.target.checked })}
              />
              <span className="w-11 h-6 bg-gray-300 rounded-full relative transition peer-checked:bg-[#54b435]">
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:left-6" />
              </span>
            </label>
          </div>

          {v.aDomicile && (
            <div className="px-4 pb-4">
              {/* Adresse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="street" className="block text-xs font-medium text-gray-700 mb-1">Rue *</label>
                  <input
                    id="street"
                    type="text"
                    value={addr?.street ?? ""}
                    onChange={(e) => mergeAddr({ street: e.target.value })}
                    className="w-full rounded-xl bg-white border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
                  />
                </div>
                <div>
                  <label htmlFor="number" className="block text-xs font-medium text-gray-700 mb-1">N° *</label>
                  <input
                    id="number"
                    type="text"
                    value={addr?.number ?? ""}
                    onChange={(e) => mergeAddr({ number: e.target.value })}
                    className="w-full rounded-xl bg-white border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
                  />
                </div>
                <div>
                  <label htmlFor="postalCode" className="block text-xs font-medium text-gray-700 mb-1">Code postal *</label>
                  <input
                    id="postalCode"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={addr?.postalCode ?? ""}
                    onChange={(e) => {
                      // digits only
                      const digits = e.target.value.replace(/\D/g, "");
                      mergeAddr({ postalCode: digits });
                    }}
                    className="w-full rounded-xl bg-white border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-xs font-medium text-gray-700 mb-1">Ville *</label>
                  <input
                    id="city"
                    type="text"
                    value={addr?.city ?? ""}
                    onChange={(e) => mergeAddr({ city: e.target.value })}
                    className="w-full rounded-xl bg-white border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
                  />
                </div>
              </div>

              {/* Résultat auto-calcul */}
              <div className="mt-3">
                {loadingDist ? (
                  <span className="text-sm text-gray-700">Calcul de la distance…</span>
                ) : (v.distanceKm ?? null) !== null ? (
                  <span className="text-sm text-gray-700">
                    Distance estimée : <strong>{(v.distanceKm ?? 0).toFixed(1)} km</strong> — Frais :
                    <strong> {eur(v.travelFee ?? 0)}</strong>
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">Renseignez l’adresse pour estimer les frais de déplacement.</span>
                )}
              </div>

              {/* CGV */}
              <div className="mt-3">
                <label className="inline-flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#54b435] focus:ring-[#54b435]"
                    checked={v.cgvAccepted}
                    onChange={(e) => merge({ cgvAccepted: e.target.checked })}
                    disabled={!canAcceptCgv} // <-- on bloque tant que le calcul n'est pas OK
                  />
                  <span>
                    J’ai lu et j’accepte les <a href="/cgv" className="text-[#54b435] underline">CGV</a>.*
                  </span>
                </label>
                {/* Aides visuelles */}
                {v.aDomicile && !canAcceptCgv && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Veuillez attendre la fin du calcul de distance avant d’accepter les CGV.
                  </p>
                )}
                {!isAddrValidForStep && v.aDomicile && (
                  <p className="mt-1 text-[11px] text-red-500">
                    Adresse complète et acceptation des CGV requises.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!isValid && (
        <div className="mt-3 text-[12px] text-red-600">
          Merci de compléter les champs requis avant de continuer.
        </div>
      )}
    </section>
  );
};

export default StepInfo;
