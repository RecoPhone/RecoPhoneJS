"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import Stepper from "./components/Stepper";
import StepModel from "./components/StepModel";
import StepRepairs from "./components/StepRepairs";
import StepInfo, { ClientInfo } from "./components/StepInfo";
import QuoteCard, { QuoteDevice, QuoteItem } from "./components/QuoteCard";
import StepResume, { StepResumeHandle } from "./components/StepResume";
import StepSchedule from "./components/StepSchedule";

export const dynamic = 'force-dynamic';

const DevisFallback = () => (
  <div className="p-4 text-sm text-gray-600">Chargement du devis…</div>
);

/* ───────── Types "catégories" + adaptateur inline v2 -> catégories ───────── */
type Reparation = { type: string; prix: number };
type Modele = { nom: string; reparations: Reparation[] };
type Categorie = { categorie: string; modeles: Modele[] };

type PricesV2 = { version: number; devices: Array<{ brand: string; family: string; model: string }> };

type DeviceState = { id: string; category: string; model: string; items: QuoteItem[] };

type Appointment = { dateISO?: string; slot?: string };
type ClientInfoEx = ClientInfo & { appointment?: Appointment | null };

/* ───────── Util: marque de la catégorie (pour tri des familles) ───────── */
function brandOfCategory(label: string): "Apple" | "Samsung" | "Xiaomi" | "Autre" {
  const s = label.toLowerCase();
  if (s.includes("iphone") || s.includes("ipad") || s.startsWith("apple")) return "Apple";
  if (s.includes("samsung") || s.includes("galaxy")) return "Samsung";
  if (s.includes("xiaomi") || s.includes("redmi") || s.includes("poco") || s.includes(" mi")) return "Xiaomi";
  return "Autre";
}

/* ───────── v2 -> libellé de catégorie ───────── */
function categoryLabelFromV2(brand: string, family: string): string {
  const b = brand.toLowerCase();
  const f = family.toLowerCase();
  if (b === "apple") return family; // iPhone / iPad
  if (b === "samsung") {
    if (/galaxy\s*s/.test(f)) return "Samsung - Série S";
    if (/galaxy\s*a/.test(f)) return "Samsung - Série A";
    if (/tab\s*s/.test(f)) return "Samsung - Tab S";
    if (/tab\s*a/.test(f)) return "Samsung - Tab A";
    if (/note/.test(f)) return "Samsung - Note";
    return "Samsung - " + family;
  }
  if (b === "xiaomi") {
    if (/redmi\s*note/.test(f)) return "Xiaomi - Redmi Note";
    if (/redmi/.test(f)) return "Xiaomi - Redmi";
    if (/poco/.test(f)) return "Xiaomi - Poco";
    if (/mi/.test(f)) return "Xiaomi - Mi";
    return "Xiaomi - " + family;
  }
  return brand + " " + family;
}

/* ───────── Tri chronologique des modèles (ancien → récent) ───────── */
function romanToInt(s: string): number {
  const m: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0, prev = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const v = m[s[i].toUpperCase()] ?? 0;
    if (v < prev) total -= v;
    else { total += v; prev = v; }
  }
  return total;
}
function extractYear(name: string): number {
  const m = name.match(/(20\d{2}|19\d{2})/);
  return m ? parseInt(m[1], 10) : 0;
}
function extractNumber(name: string): number {
  // iPhone X/XS/XR → 10
  if (/\biphone\b/i.test(name) && /\bx(s|r)?\b/i.test(name)) return 10;
  const roman = name.match(/\b[IVXLCDM]{1,6}\b/i);
  if (roman && roman[0].toUpperCase() !== "SE") {
    const val = romanToInt(roman[0].toUpperCase());
    if (val >= 2 && val <= 20) return val;
  }
  const m = name.match(/(\d{1,3})/);
  if (m) return parseInt(m[1], 10);
  const m2 = name.match(/\b(air|mini|pro)\s*(\d{1,2})\b/i);
  if (m2) return parseInt(m2[2], 10);
  return 0;
}
function variantRank(name: string): number {
  const s = name.toLowerCase();
  if (/\bmini\b/.test(s)) return 1;
  if (/\bse\b/.test(s)) return 2;
  if (/\bplus\b/.test(s)) return 3;
  if (/\bpro\b/.test(s) && !/\bmax\b/.test(s)) return 4;
  if (/\bultra\b/.test(s)) return 5;
  if (/\bmax\b/.test(s)) return 6;
  return 0;
}
function chronoKey(modelName: string): number {
  const year = extractYear(modelName);
  const num = extractNumber(modelName);
  const varRank = variantRank(modelName);
  if (year) return year * 100 + varRank;
  return num * 100 + varRank;
}
function sortModelsChronologically(category: string, names: string[]): string[] {
  const arr = names.slice();
  arr.sort((a, b) => {
    const ka = chronoKey(a);
    const kb = chronoKey(b);
    if (ka !== kb) return ka - kb; // ancien → récent
    return a.localeCompare(b);
  });
  return arr;
}

/* ───────── v2 -> catégories + tri chrono ───────── */
function adaptPricesV2ToCategories(v2: PricesV2): Categorie[] {
  const dict: { [cat: string]: { [model: string]: 1 } } = {};
  for (let i = 0; i < v2.devices.length; i++) {
    const d = v2.devices[i];
    const cat = categoryLabelFromV2(d.brand, d.family);
    if (!dict[cat]) dict[cat] = {};
    dict[cat][d.model] = 1;
  }
  const order: Array<"Apple" | "Samsung" | "Xiaomi" | "Autre"> = ["Apple", "Samsung", "Xiaomi", "Autre"];
  const catNames = Object.keys(dict).sort((A, B) => {
       const ia = order.indexOf(brandOfCategory(A));
       const ib = order.indexOf(brandOfCategory(B));
       if (ia !== ib) return ia - ib;
       return A.localeCompare(B);
  });
  const out: Categorie[] = [];
  for (let c = 0; c < catNames.length; c++) {
    const categorie = catNames[c];
    const sorted = sortModelsChronologically(categorie, Object.keys(dict[categorie]));
    const modeles: Modele[] = [];
    for (let j = 0; j < sorted.length; j++) {
      modeles.push({ nom: sorted[j], reparations: [] });
    }
    out.push({ categorie, modeles });
  }
  return out;
}

/* ───────── Normalisation v1 (catégories) + tri chrono ───────── */
function normalizeCatalogV1Chrono(cats: Categorie[]): Categorie[] {
  const copy: Categorie[] = [];
  const order: Array<"Apple" | "Samsung" | "Xiaomi" | "Autre"> = ["Apple", "Samsung", "Xiaomi", "Autre"];
  const sortedCats = cats.slice().sort((A, B) => {
    const ia = order.indexOf(brandOfCategory(A.categorie));
    const ib = order.indexOf(brandOfCategory(B.categorie));
    if (ia !== ib) return ia - ib;
    return A.categorie.localeCompare(B.categorie);
  });
  for (let i = 0; i < sortedCats.length; i++) {
    const c = sortedCats[i];
    const names = c.modeles.map((m) => m.nom);
    const sortedNames = sortModelsChronologically(c.categorie, names);
    const modeles: Modele[] = [];
    for (let j = 0; j < sortedNames.length; j++) {
      const found = c.modeles.find((m) => m.nom === sortedNames[j]);
      modeles.push(found || { nom: sortedNames[j], reparations: [] });
    }
    copy.push({ categorie: c.categorie, modeles });
  }
  return copy;
}

/* ───────────────────────── Steps (base) ────────────── */
const BASE_STEPS = [
  { key: "model",   label: "Appareil" },
  { key: "repairs", label: "Réparations" },
  { key: "info",    label: "Infos client" },
  { key: "resume",  label: "Résumé" },
];

/* ───────── Helpers réparation interdite à domicile (Apple châssis/back) ───────── */
function isBackOrFrame(it: QuoteItem): boolean {
  const lbl = (it.label || "").toLowerCase();
  if (it?.meta?.partKind === "back" || it?.meta?.partKind === "frame") return true;
  if (lbl.includes("châssis") || lbl.includes("chassis")) return true;
  if (lbl.includes("face arrière") || lbl.includes("back glass")) return true;
  return false;
}

export default function DevisPage() {
  const search = useSearchParams();
  const [showSuccess, setShowSuccess] = React.useState(false);

  const [current, setCurrent] = React.useState(0);

  // Sélection courante (avant ajout) pilotée par StepModel
  const [category, setCategory] = React.useState<string>("");
  const [model, setModel] = React.useState<string>("");

  // Catalogue (déjà trié chrono)
  const [catalog, setCatalog] = React.useState<Categorie[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Appareils ajoutés
  const [devices, setDevices] = React.useState<DeviceState[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const [clientInfo, setClientInfo] = React.useState<ClientInfoEx>({
    firstName: "", lastName: "", email: "", phone: "",
    notes: "", payInTwo: false, signatureDataUrl: null,
    aDomicile: false, address: null, cgvAccepted: false,
    distanceKm: null, travelFee: null,
    appointment: null, // informatif uniquement
  });
  const [isInfoValid, setIsInfoValid] = React.useState(false);

  // ⬇️ RDV choisi (ISO) — source de vérité côté page
  const [appointmentISO, setAppointmentISO] = React.useState<string | null>(null);

  // Callback fourni à StepSchedule
  const handleScheduleChange = React.useCallback((iso: string | null) => {
    setAppointmentISO(iso);
    console.debug("[DevisPage] appointmentISO <-", iso);
  }, []);

  // Si le client décoche "à domicile", on purge le RDV
  React.useEffect(() => {
    if (!clientInfo.aDomicile) setAppointmentISO(null);
  }, [clientInfo.aDomicile]);

  const clientSummary = React.useMemo(() => {
    const addressText =
      clientInfo.aDomicile && clientInfo.address
        ? `${clientInfo.address.street} ${clientInfo.address.number}, ${clientInfo.address.postalCode} ${clientInfo.address.city}`
        : undefined;

    return {
      firstName: clientInfo.firstName,
      lastName: clientInfo.lastName,
      email: clientInfo.email,
      phone: clientInfo.phone,
      aDomicile: clientInfo.aDomicile,
      addressText,
      travelFee: clientInfo.aDomicile
        ? (typeof clientInfo.travelFee === "number" ? clientInfo.travelFee : undefined)
        : undefined,
      payInTwo: clientInfo.payInTwo,
      appointmentISO: clientInfo.aDomicile ? appointmentISO : null, // affiche dans QuoteCard
    };
  }, [clientInfo, appointmentISO]);

  // Charger catalog v1/v2 et trier chrono
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let mod: any = null;
        try {
          mod = await import("@/app/devis/data/prices.json");
        } catch {
          try {
            const res = await fetch("/data/prices.json", { cache: "force-cache" });
            if (res.ok) mod = await res.json();
          } catch {}
        }
        if (!mod) throw new Error("prices.json introuvable");
        const data = (mod.default || mod) as any;

        if (Array.isArray(data) && data.length && data[0].categorie && data[0].modeles) {
          const normalized = normalizeCatalogV1Chrono(data as Categorie[]);
          if (alive) setCatalog(normalized);
          return;
        }
        if (data && data.version === 2 && Array.isArray(data.devices)) {
          const cats = adaptPricesV2ToCategories(data as PricesV2);
          if (alive) setCatalog(cats);
          return;
        }
        throw new Error("Format de prices.json non reconnu");
      } catch (e: any) {
        if (alive) setLoadError(e?.message || "Erreur de chargement du catalogue");
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ───────── Helpers multi-device ───────── */
  const idCounter = React.useRef(1);
  const genId = () => String(idCounter.current++);

  const addCurrentDevice = () => {
    if (!category || !model) return;
    const next: DeviceState = { id: genId(), category, model, items: [] };
    setDevices((prev) => prev.concat(next));
    setActiveId((prev) => prev ?? next.id);
    setCategory("");
    setModel("");
  };

  const removeDevice = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    if (activeId === id) {
      setActiveId((_prev) => {
        const left = devices.filter((d) => d.id !== id);
        return left.length ? left[0].id : null;
      });
    }
  };

  const totalSelectedItems = React.useMemo(() => {
    let n = 0;
    for (let i = 0; i < devices.length; i++) n += devices[i].items.length;
    return n;
  }, [devices]);

  const quoteDevices: QuoteDevice[] = React.useMemo(() => {
    const out: QuoteDevice[] = [];
    for (let i = 0; i < devices.length; i++) {
      const d = devices[i];
      out.push({ id: d.id, category: d.category, model: d.model, items: d.items });
    }
    return out;
  }, [devices]);

  const handleNavigate = (index: number) => {
    // navigation arrière autorisée
    if (index <= current) setCurrent(index);
  };

  const fees: QuoteItem[] = React.useMemo(() => {
    const out: QuoteItem[] = [];
    if (clientInfo.aDomicile && typeof clientInfo.travelFee === "number") {
      out.push({ key: "travel_fee", label: "Frais de déplacement (estim.)", price: clientInfo.travelFee });
    }
    return out;
  }, [clientInfo.aDomicile, clientInfo.travelFee]);

  // ───────── Interdiction domicile : Apple + (châssis|back glass)
  const hasForbiddenAppleJob = React.useMemo(() => {
    return devices.some((d) =>
      brandOfCategory(d.category) === "Apple" && d.items.some(isBackOrFrame)
    );
  }, [devices]);

  // ───────── Steps dynamiques : on insère "RDV" uniquement si à domicile
  const steps = React.useMemo(() => {
    return clientInfo.aDomicile
      ? [
          { key: "model",   label: "Appareil" },
          { key: "repairs", label: "Réparations" },
          { key: "info",    label: "Infos client" },
          { key: "schedule",label: "RDV" },
          { key: "resume",  label: "Résumé" },
        ]
      : BASE_STEPS;
  }, [clientInfo.aDomicile]);

  // index utile pour savoir où se trouve chaque étape
  const scheduleIndex = clientInfo.aDomicile ? 3 : -1;
  const resumeIndex   = clientInfo.aDomicile ? 4 : 3;

  // ───────── Ref pour StepResume.finalize()
  const resumeRef = React.useRef<StepResumeHandle>(null);

  const resetAll = () => {
    setCategory("");
    setModel("");
    setDevices([]);
    setActiveId(null);
    setClientInfo({
      firstName: "", lastName: "", email: "", phone: "",
      notes: "", payInTwo: false, signatureDataUrl: null,
      aDomicile: false, address: null, cgvAccepted: false,
      distanceKm: null, travelFee: null,
      appointment: null,
    });
    setIsInfoValid(false);
    setAppointmentISO(null);
    setCurrent(0);

    // purge éventuels brouillons locaux
    try {
      const prefixes = ["recophone:", "quote:", "rp:", "rp-"];
      const toDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (prefixes.some((p) => k.startsWith(p))) toDelete.push(k);
      }
      toDelete.forEach((k) => localStorage.removeItem(k));
    } catch {}
  };

  // — À l’arrivée avec ?success=1 : reset + alerte
  React.useEffect(() => {
    if (search.get("success") === "1") {
      resetAll();
      setShowSuccess(true);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
      const t = setTimeout(() => setShowSuccess(false), 6000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Conditions supplémentaires pour verrouiller "Continuer" sur l'étape Infos Client
  const infoStepBlocked =
    !isInfoValid ||
    (clientInfo.aDomicile && (
      hasForbiddenAppleJob ||
      clientInfo.distanceKm == null ||
      clientInfo.travelFee == null ||
      !clientInfo.cgvAccepted
    ));

  /* ───────── Rendu ───────── */
  return (
    <React.Suspense fallback={<DevisFallback />}>
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Alerte succès */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[#54b435] text-white px-4 py-2 shadow-lg">
          Devis envoyé avec succès. Un e-mail vous a été adressé.
        </div>
      )}

      <Stepper steps={steps} current={current} onNavigate={handleNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne gauche : contenu */}
        <div className="lg:col-span-8">
          {/* Étape 1 : Choix & ajout d’appareils */}
          {current === 0 && (
            <>
              {!catalog && !loadError && (
                <div className="rounded-xl border border-gray-200 p-4 bg-white text-sm text-gray-600" role="status" aria-busy="true">
                  Chargement du catalogue…
                </div>
              )}
              {loadError && (
                <div className="rounded-xl border border-red-200 p-4 bg-red-50 text-sm text-red-700" role="alert">
                  {loadError}
                </div>
              )}

              {catalog && (
                <>
                  <StepModel
                    data={catalog}
                    selectedCategory={category || undefined}
                    selectedModel={model || undefined}
                    onSelect={(cat, mod) => {
                      setCategory(cat);
                      setModel(mod);
                    }}
                  />

                  {/* Actions d’ajout */}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={addCurrentDevice}
                      disabled={!category || !model}
                      className={[
                        "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold transition",
                        !category || !model ? "bg-gray-300 cursor-not-allowed" : "bg-[#54b435] hover:brightness-95"
                      ].join(" ")}
                    >
                      Ajouter cet appareil
                      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                        <path d="M10 5a1 1 0 011 1v3h3a1 1 0 010 2h-3v3a1 1 0 01-2 0v-3H6a1 1 0 010-2h3V6a1 1 0 011-1z"/>
                      </svg>
                    </button>

                    <div className="text-xs text-gray-600">
                      {devices.length === 0
                        ? "Aucun appareil ajouté pour l’instant."
                        : `${devices.length} appareil(s) ajouté(s).`}
                    </div>
                  </div>

                  {/* Liste des appareils déjà ajoutés */}
                  {devices.length > 0 && (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-white">
                      <ul className="divide-y">
                        {devices.map((d) => (
                          <li key={d.id} className="p-3 flex items-center gap-3">
                            <div className="flex-1 text-sm text-[#222]">
                              <span className="font-medium">{d.category}</span>
                              <span className="mx-1">•</span>
                              <span>{d.model}</span>
                              {d.items.length > 0 && (
                                <span className="ml-2 text-xs text-gray-500">({d.items.length} réparation(s))</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => { setActiveId(d.id); setCurrent(1); }}
                                className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
                              >
                                Réparations
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDevice(d.id)}
                                className="px-3 py-1.5 rounded-lg text-sm border border-red-200 text-red-600 hover:bg-red-50"
                              >
                                Supprimer
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* CTA Suivant */}
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeId && devices.length) setActiveId(devices[0].id);
                        setCurrent(1);
                      }}
                      disabled={devices.length === 0}
                      className={[
                        "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold transition",
                        devices.length === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-[#54b435] hover:brightness-95"
                      ].join(" ")}
                    >
                      Continuer
                      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                        <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Étape 2 : Réparations par appareil */}
          {current === 1 && (
            <div className="rounded-xl border border-gray-200 p-6 bg-white">
              <h3 className="text-lg font-semibold text-[#222] mb-3">2) Réparations</h3>

              {devices.length === 0 ? (
                <div className="text-sm text-gray-600">
                  Aucun appareil. <button className="underline" onClick={() => setCurrent(0)}>Ajouter un appareil</button>.
                </div>
              ) : (
                <>
                  {/* Sélecteur d’appareil (tabs simples) */}
                  <div className="mb-4 overflow-auto">
                    <div className="flex gap-2">
                      {devices.map((d) => {
                        const active = d.id === activeId;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setActiveId(d.id)}
                            className={
                              "whitespace-nowrap px-3 py-1.5 rounded-lg text-sm border transition " +
                              (active
                                ? "bg-[#edfbe2] border-[#54b435]/30 text-[#1f3d0e] font-medium"
                                : "bg-white border-gray-300 hover:bg-gray-50")
                            }
                            title={`${d.category} • ${d.model}`}
                          >
                            {d.category} • {d.model}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Form repairs du device actif */}
                  {(() => {
                    const d = devices.find((x) => x.id === activeId) || devices[0];
                    return (
                      <StepRepairs
                        data={catalog || []}
                        selectedCategory={d.category}
                        selectedModel={d.model}
                        items={d.items}
                        onChangeItems={(nextItems) => {
                          setDevices((prev) => {
                            const out: DeviceState[] = [];
                            for (let i = 0; i < prev.length; i++) {
                              const cur = prev[i];
                              if (cur.id === d.id) out.push({ ...cur, items: nextItems });
                              else out.push(cur);
                            }
                            return out;
                          });
                        }}
                      />
                    );
                  })()}

                  {/* Actions step */}
                  <div className="mt-4 flex justify-between">
                    <button className="text-sm text-gray-700 underline" onClick={() => setCurrent(0)}>← Ajouter un autre appareil</button>
                    <button
                      className="px-5 py-2.5 rounded-xl bg-[#54b435] text-white font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                      onClick={() => setCurrent(2)}
                      disabled={totalSelectedItems === 0}
                    >
                      Continuer
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Étape 3 : Infos client */}
          {current === 2 && (
            <div className="rounded-xl border border-gray-200 p-6 bg-white">
              <h3 className="text-lg font-semibold text-[#222] mb-2">3) Infos client</h3>

              <StepInfo
                value={clientInfo}
                onChange={setClientInfo}
                onValidityChange={setIsInfoValid}
              />

              <div className="mt-4 flex justify-between">
                <button className="text-sm text-gray-700 underline" onClick={() => setCurrent(1)}>← Retour</button>
                <button
                  className="px-5 py-2.5 rounded-xl bg-[#54b435] text-white font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                  onClick={() => setCurrent((i) => i + 1)}   // avance (RDV si domicile, sinon résumé)
                  disabled={infoStepBlocked}
                  title={
                    clientInfo.aDomicile && infoStepBlocked
                      ? "Adresse/Distance/CGV incomplètes ou intervention interdite à domicile (châssis/face arrière iPhone)."
                      : undefined
                  }
                >
                  Continuer
                </button>
              </div>

              {clientInfo.aDomicile && hasForbiddenAppleJob && (
                <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ Les remplacements de face arrière et de châssis d'iPhone se font uniquement en atelier.
                </p>
              )}
            </div>
          )}

          {/* Étape 4 (optionnelle) : RDV à domicile (samedi) */}
          {clientInfo.aDomicile && current === scheduleIndex && (
            <div className="rounded-xl border border-gray-200 p-6 bg-white">
              <h3 className="text-lg font-semibold text-[#222] mb-2">4) Rendez-vous à domicile</h3>

              <StepSchedule
                selectedISO={appointmentISO}
                onChange={handleScheduleChange}
                autoSelectNextSaturday
                forbiddenAtHome={hasForbiddenAppleJob}
                forbiddenReason="Remplacement de châssis / face arrière d’iPhone : intervention uniquement en atelier."
              />

              <div className="mt-4 flex justify-between">
                <button className="text-sm text-gray-700 underline" onClick={() => setCurrent(2)}>← Retour</button>
                <button
                  className="px-5 py-2.5 rounded-xl bg-[#54b435] text-white font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                  onClick={() => setCurrent(resumeIndex)}
                  disabled={!appointmentISO || hasForbiddenAppleJob}
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* Étape finale : Résumé + Terminer */}
          {current === resumeIndex && (
            <div className="rounded-xl border border-gray-200 p-6 bg-white">
              <h3 className="text-lg font-semibold text-[#222] mb-2">
                {clientInfo.aDomicile ? "5) Résumé" : "4) Résumé"}
              </h3>

              <StepResume
                ref={resumeRef}
                devices={quoteDevices}
                payInTwo={clientInfo.payInTwo}
                signatureDataUrl={clientInfo.signatureDataUrl}
                aDomicile={clientInfo.aDomicile}
                address={clientInfo.address}
                appointment={appointmentISO ? { dateISO: appointmentISO } : null}
                client={{
                  firstName: clientInfo.firstName,
                  lastName: clientInfo.lastName,
                  email: clientInfo.email,
                  phone: clientInfo.phone,
                  notes: clientInfo.notes,
                  travelFee: typeof clientInfo.travelFee === "number" ? clientInfo.travelFee : undefined,
                }}
              />

              <div className="mt-6 flex justify-between">
                <button
                  className="text-sm text-gray-700 underline"
                  onClick={() => setCurrent(clientInfo.aDomicile ? scheduleIndex : 2)}
                >
                  ← Retour
                </button>

                <button
                  className="px-5 py-2.5 rounded-xl bg-[#54b435] text-white font-semibold"
                  onClick={async () => {
                    try {
                      await resumeRef.current?.finalize();
                      // La redirection /devis?success=1 est gérée dans StepResume
                    } catch {
                      // Erreur déjà gérée dans StepResume
                    }
                  }}
                >
                  Terminer
                </button>
              </div>
            </div>
          )}

          {/* QuoteCard en mobile */}
          <div className="mt-6 lg:hidden">
            <QuoteCard
              devices={quoteDevices}
              fees={fees}
              client={clientSummary}
              onClear={() => {
                setCategory("");
                setModel("");
                setDevices([]);
                setActiveId(null);
                setAppointmentISO(null);
                setCurrent(0);
              }}
            />
          </div>
        </div>

        {/* Colonne droite : QuoteCard sticky (desktop) */}
        <aside className="lg:col-span-4 hidden lg:block">
          <div className="lg:sticky lg:top-24">
            <QuoteCard
              devices={quoteDevices}
              fees={fees}
              client={clientSummary}
              onClear={() => {
                setCategory("");
                setModel("");
                setDevices([]);
                setActiveId(null);
                setAppointmentISO(null);
                setCurrent(0);
              }}
            />
          </div>
        </aside>
      </div>
    </main>
     </React.Suspense>
  );
}
