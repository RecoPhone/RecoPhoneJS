"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Categorie } from "./StepModel";
import type { QuoteItem } from "./QuoteCard";

/** ========= Schéma minimal du prices.json v2 ========= */
type PricesV2 = {
  version: number;
  devices: Array<{
    brand: string;
    family: string;
    model: string;
    colors?: string[];
    repairs?: Array<{
      type: string;                         // ex: "Écran", "Batterie", ...
      label?: string;                       // libellé d’affichage (optionnel)
      variants: Array<{ price: number; sku?: string; grade?: string }>;
    }>;
  }>;
};

export type StepRepairsProps = {
  /** Facultatif: données v1 (catégories). Utilisées seulement si v2 indisponible. */
  data?: Categorie[];
  selectedCategory?: string;
  selectedModel?: string;
  items: QuoteItem[];                      // sélection actuelle
  onChangeItems: (items: QuoteItem[]) => void;
};

type Row = { id: string; label: string; price: number; group: "part" | "extra" };

const formatPrice = (n: number) =>
  new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n);

/* ────────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────────────── */
function requiresColor(label: string): { part: "back" | "frame" } | null {
  const l = label.toLowerCase();
  if (/(face arrière|dos|back (glass|cover)|coque arrière)/i.test(l)) return { part: "back" };
  if (/(châssis|chassis|frame)/i.test(l)) return { part: "frame" };
  return null;
}

function eq(a: string, b: string) {
  const na = a.toLowerCase().replace(/\s+/g, " ").trim();
  const nb = b.toLowerCase().replace(/\s+/g, " ").trim();
  return na === nb;
}

/** Catégorie label -> (brand, family) pour matcher le v2 */
function parseCategory(category?: string): { brand: string | null; family: string | null } {
  if (!category) return { brand: null, family: null };
  const c = category.toLowerCase();
  // Apple
  if (c.startsWith("iphone")) return { brand: "Apple", family: "iPhone" };
  if (c.startsWith("ipad")) return { brand: "Apple", family: "iPad" };
  // Samsung
  if (c.includes("samsung")) {
    if (c.includes("série s") || c.includes("serie s") || c.includes("galaxy s")) return { brand: "Samsung", family: "Galaxy S" };
    if (c.includes("série a") || c.includes("serie a") || c.includes("galaxy a")) return { brand: "Samsung", family: "Galaxy A" };
    if (c.includes("tab s")) return { brand: "Samsung", family: "Tab S" };
    if (c.includes("tab a")) return { brand: "Samsung", family: "Tab A" };
    if (c.includes("note")) return { brand: "Samsung", family: "Note" };
  }
  // Xiaomi
  if (c.includes("xiaomi") || c.includes("redmi") || c.includes("poco")) {
    if (c.includes("redmi note")) return { brand: "Xiaomi", family: "Redmi Note" };
    if (c.includes("redmi")) return { brand: "Xiaomi", family: "Redmi" };
    if (c.includes("poco")) return { brand: "Xiaomi", family: "Poco" };
    if (c.includes("mi")) return { brand: "Xiaomi", family: "Mi" };
  }
  // Fallback
  const parts = category.split(" ");
  return { brand: parts[0] || null, family: parts.slice(1).join(" ") || null };
}

/** Ordonne les réparations (écran → batterie → charge → caméras → …) */
function rowRank(label: string): number {
  const s = label.toLowerCase();
  if (/écran|ecran|screen|lcd|oled/.test(s)) return 1;
  if (/batterie|battery/.test(s)) return 2;
  if (/charge|port|connecteur/.test(s)) return 3;
  if (/(cam(é|e)ra).*(arri|rear)/.test(s)) return 4;
  if (/(cam(é|e)ra).*(avant|front)/.test(s)) return 5;
  if (/haut.*parleur|speaker/.test(s)) return 6;
  if (/micro/.test(s)) return 7;
  if (/bouton|power|volume|home|vibreur|taptic/.test(s)) return 8;
  if (/capteur|proximit|face id|touch id/.test(s)) return 9;
  if (/antenne|réseau|reseau|wifi|bluetooth|nfc/.test(s)) return 10;
  if (/dos|face arrière|back (glass|cover)|coque arrière/.test(s)) return 98;
  if (/châssis|chassis|frame/.test(s)) return 99;
  return 50;
}

/* ────────────────────────────────────────────────────────────────────────────
   Composant
   ──────────────────────────────────────────────────────────────────────────── */
const StepRepairs: React.FC<StepRepairsProps> = ({
  data,
  selectedCategory,
  selectedModel,
  items,
  onChangeItems,
}) => {
  const [loading, setLoading] = useState(false);
  const [modelColors, setModelColors] = useState<string[]>([]);
  const [partRows, setPartRows] = useState<Row[]>([]);

  // Pré-sélection de couleurs par libellé (stock local au step)
  const [colorByLabel, setColorByLabel] = useState<Record<string, string | null>>({});

  // 1) Charge d’abord prices.json v2 (réparations + couleurs). Fallback v1.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!selectedCategory || !selectedModel) {
        if (alive) {
          setModelColors([]);
          setPartRows([]);
        }
        return;
      }
      setLoading(true);

      // 1) v2
      let v2: PricesV2 | null = null;
      try {
        const mod = await import("@/app/devis/data/prices.json");
        // @ts-ignore — selon config TS le JSON peut être sous .default
        v2 = (mod.default || mod) as PricesV2;
      } catch {
        try {
          const res = await fetch("/data/prices.json", { cache: "force-cache" });
          if (res.ok) v2 = (await res.json()) as PricesV2;
        } catch {}
      }

      const parsed = parseCategory(selectedCategory);

      if (v2 && v2.version === 2 && Array.isArray(v2.devices)) {
        // trouver device
        let dev = null;
        for (let i = 0; i < v2.devices.length; i++) {
          const d = v2.devices[i];
          if (parsed.brand && parsed.family && eq(d.brand, parsed.brand) && eq(d.family, parsed.family) && eq(d.model, selectedModel)) {
            dev = d;
            break;
          }
        }

        if (dev) {
          // couleurs
          const colors = dev.colors || [];
          // réparations -> lignes (prix = min variants)
          const rows: Row[] = [];
          const rs = dev.repairs || [];
          for (let i = 0; i < rs.length; i++) {
            const r = rs[i];
            const label = (r.label || r.type || "").trim();
            if (!label) continue;
            let min = Infinity;
            const vs = r.variants || [];
            for (let j = 0; j < vs.length; j++) {
              const p = Number(vs[j].price);
              if (!isNaN(p) && p >= 0 && p < min) min = p;
            }
            if (min === Infinity) continue; // pas de prix exploitable
            rows.push({ id: `p-${i}`, label, price: min, group: "part" });
          }
          // tri lisible
          rows.sort((a, b) => {
            const ra = rowRank(a.label);
            const rb = rowRank(b.label);
            if (ra !== rb) return ra - rb;
            if (a.price !== b.price) return a.price - b.price;
            return a.label.localeCompare(b.label);
          });

          if (alive) {
            setModelColors(colors);
            setPartRows(rows);
            setLoading(false);
          }
          return;
        }
      }

      // 2) Fallback v1 (data: Categorie[]) — seulement réparations, pas de couleurs
      if (data && data.length) {
        const rows: Row[] = [];
        // trouver modèle
        let found = null;
        for (let i = 0; i < data.length; i++) {
          if (data[i].categorie === selectedCategory) {
            const ms = data[i].modeles;
            for (let j = 0; j < ms.length; j++) {
              if (ms[j].nom === selectedModel) {
                found = ms[j];
                break;
              }
            }
            break;
          }
        }
        const reps = (found && found.reparations) || [];
        for (let k = 0; k < reps.length; k++) {
          const r = reps[k];
          rows.push({ id: `p-${k}`, label: r.type, price: r.prix, group: "part" });
        }
        rows.sort((a, b) => {
          const ra = rowRank(a.label);
          const rb = rowRank(b.label);
          if (ra !== rb) return ra - rb;
          if (a.price !== b.price) return a.price - b.price;
          return a.label.localeCompare(b.label);
        });

        if (alive) {
          setModelColors([]); // v1: pas de couleurs
          setPartRows(rows);
          setLoading(false);
        }
        return;
      }

      if (alive) {
        setModelColors([]);
        setPartRows([]);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [data, selectedCategory, selectedModel]);

  // 2) Services supplémentaires (fixes)
  const extraRows: Row[] = useMemo(
    () => [
      { id: "x-desoxy", label: "Désoxydation", price: 80, group: "extra" },
      { id: "x-data", label: "Récupération / Transfert de données", price: 50, group: "extra" },
      { id: "x-clean", label: "Nettoyage & Diagnostic", price: 15, group: "extra" },
    ],
    []
  );

  // 3) Sélection actuelle → accès rapide
  const selectedKeys = useMemo(() => items.map((it) => it.key), [items]);
  const isChecked = (row: Row) => selectedKeys.indexOf(row.label) !== -1;

  // 4) Changer couleur d’un row (et propager dans items si déjà coché)
  const setRowColor = (row: Row, value: string | null, partKind: "back" | "frame") => {
    setColorByLabel((m) => ({ ...m, [row.label]: value }));
    if (isChecked(row)) {
      const next = items.map((it) =>
        it.key === row.label ? { ...it, meta: { ...(it.meta ?? {}), color: value, partKind } } : it
      );
      onChangeItems(next);
    }
  };

  // 5) (Dé)sélectionner une réparation/extra
  const allRows = useMemo<Row[]>(() => partRows.concat(extraRows), [partRows, extraRows]);

  const toggle = (row: Row) => {
    const nextSelected = new Set<string>(selectedKeys);
    if (nextSelected.has(row.label)) nextSelected.delete(row.label);
    else nextSelected.add(row.label);

    // Reconstruire la liste d’items dans l’ordre affiché (pièces puis extras)
    const nextItems: QuoteItem[] = [];
    for (let i = 0; i < allRows.length; i++) {
      const r = allRows[i];
      if (!nextSelected.has(r.label)) continue;
      const base: QuoteItem = { key: r.label, label: r.label, price: r.price };
      const need = requiresColor(r.label);
      if (need) {
        base.meta = { ...(base.meta ?? {}), partKind: need.part, color: colorByLabel[r.label] ?? null };
      }
      nextItems.push(base);
    }
    onChangeItems(nextItems);
  };

  /* ───────────────────────────── UI ───────────────────────────── */
  if (!selectedCategory || !selectedModel) {
    return (
      <div className="text-sm text-gray-600 bg-gray-50 border border-dashed border-gray-300 p-4 rounded-xl">
        Sélectionnez d’abord un <strong>appareil</strong>.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-600 bg-white border border-gray-200 p-4 rounded-xl" role="status" aria-busy="true">
        Chargement des réparations…
      </div>
    );
  }

  const hasParts = partRows.length > 0;

  return (
    <section aria-labelledby="step-repairs-title" className="w-full">
      <header className="mb-3">
        <h2 id="step-repairs-title" className="text-xl font-semibold text-[#222]">
          2) Choisissez vos réparations
        </h2>
        <p className="text-sm text-gray-600">
          Cochez les éléments à réparer. Certains nécessitent la <strong>couleur</strong> (dos/châssis).
        </p>
      </header>

      {/* Pièces du device */}
      {hasParts ? (
        <ul className="rounded-2xl border border-gray-200 bg-white divide-y">
          {partRows.map((row) => {
            const checked = isChecked(row);
            const need = requiresColor(row.label);
            const showColorPicker = !!need && checked;

            return (
              <li key={row.id} className="p-3">
                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* Checkbox */}
                  <div className="col-span-2 sm:col-span-1 flex items-center">
                    <input
                      id={`p-${row.id}`}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-[#54b435] focus:ring-[#54b435]"
                      checked={checked}
                      onChange={() => toggle(row)}
                    />
                  </div>

                  {/* Label */}
                  <label htmlFor={`p-${row.id}`} className="col-span-7 sm:col-span-8 text-sm text-[#222] cursor-pointer">
                    {row.label}
                  </label>

                  {/* Prix */}
                  <div className="col-span-3 sm:col-span-3 text-right text-sm font-medium">
                    <span className={checked ? "" : "text-gray-500"}>{formatPrice(row.price)}</span>
                  </div>
                </div>

                {/* Choix couleur si requis */}
                {showColorPicker && (
                  <div className="mt-2 pl-7 sm:pl-10">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs text-gray-700 mb-1">
                        Couleur {need?.part === "back" ? "— Face arrière" : "— Châssis"}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <select
                          className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
                          value={colorByLabel[row.label] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : e.target.value;
                            setRowColor(row, val, need.part);
                          }}
                        >
                          <option value="">Je ne sais pas</option>
                          {modelColors.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>

                        {modelColors.length === 0 && (
                          <span className="text-[11px] text-gray-500">
                            Aucune couleur définie pour ce modèle.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-sm text-gray-600 bg-gray-50 border border-dashed border-gray-300 p-4 rounded-xl">
          Aucune réparation spécifique listée pour <strong>{selectedModel}</strong>.
        </div>
      )}

      {/* Services supplémentaires */}
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-[#222]">Services (optionnel)</h3>
        <ul className="rounded-2xl border border-gray-200 bg-white divide-y">
          {extraRows.map((row) => {
            const checked = isChecked(row);
            return (
              <li key={row.id} className="p-3 grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2 sm:col-span-1 flex items-center">
                  <input
                    id={`x-${row.id}`}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-[#54b435] focus:ring-[#54b435]"
                    checked={checked}
                    onChange={() => toggle(row)}
                  />
                </div>
                <label htmlFor={`x-${row.id}`} className="col-span-7 sm:col-span-8 text-sm text-[#222] cursor-pointer">
                  {row.label}
                </label>
                <div className="col-span-3 sm:col-span-3 text-right text-sm font-medium">
                  <span className={checked ? "" : "text-gray-500"}>{formatPrice(row.price)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-2 text-[11px] text-gray-500">
        Astuce : vous pouvez sélectionner plusieurs éléments (ex. écran + désoxydation).
      </p>
    </section>
  );
};

export default StepRepairs;
