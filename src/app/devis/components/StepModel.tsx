"use client";

import React, { FC, useEffect, useMemo, useState } from "react";

/** ===== Types alignés sur prices.json (format catégories) ===== */
type Reparation = { type: string; prix: number };
type Modele = { nom: string; reparations: Reparation[] };
export type Categorie = { categorie: string; modeles: Modele[] };

export type StepModelProps = {
  data: Categorie[];
  selectedCategory?: string;
  selectedModel?: string;
  onSelect: (category: string, model: string) => void;
  className?: string;
};

type Brand = "Apple" | "Samsung" | "Xiaomi" | "Autre";

function brandOfCategory(label: string): Brand {
  const s = label.toLowerCase();
  if (s.indexOf("iphone") !== -1 || s.indexOf("ipad") !== -1 || s.indexOf("apple") === 0) return "Apple";
  if (s.indexOf("samsung") !== -1 || s.indexOf("galaxy") !== -1) return "Samsung";
  if (s.indexOf("xiaomi") !== -1 || s.indexOf("redmi") !== -1 || s.indexOf("poco") !== -1 || s.indexOf(" mi") !== -1) return "Xiaomi";
  return "Autre";
}

const StepModel: FC<StepModelProps> = ({
  data,
  selectedCategory,
  selectedModel,
  onSelect,
  className,
}) => {
  /* 1) Brands (ordre fixé) — sans Set/Map */
  const brands: Brand[] = useMemo(() => {
    const seen: { [K in Brand]?: true } = {};
    const order: Brand[] = ["Apple", "Samsung", "Xiaomi", "Autre"];
    for (let i = 0; i < data.length; i++) {
      seen[brandOfCategory(data[i].categorie)] = true;
    }
    const out: Brand[] = [];
    for (let i = 0; i < order.length; i++) {
      const b = order[i];
      if (seen[b]) out.push(b);
    }
    return out;
  }, [data]);

  /* 2) Catégories par brand — sans Map */
  const categoriesByBrand = useMemo(() => {
    const map: Record<Brand, string[]> = { Apple: [], Samsung: [], Xiaomi: [], Autre: [] };
    for (let i = 0; i < data.length; i++) {
      const c = data[i];
      const b = brandOfCategory(c.categorie);
      if (map[b].indexOf(c.categorie) === -1) map[b].push(c.categorie);
    }
    return map;
  }, [data]);

  /* 3) Modèles par catégorie — sans Map */
  const modelsByCategory = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (let i = 0; i < data.length; i++) {
      const c = data[i];
      const list: string[] = [];
      for (let j = 0; j < c.modeles.length; j++) {
        const name = c.modeles[j].nom;
        if (list.indexOf(name) === -1) list.push(name);
      }
      map[c.categorie] = list;
    }
    return map;
  }, [data]);

  /* 4) UI state */
  const [brand, setBrand] = useState<Brand | "">("");
  const [category, setCategory] = useState<string>("");
  const [model, setModel] = useState<string>("");

  /* 5) Options dynamiques — tri Apple: iPhone avant iPad */
  const categoryOptions: string[] = useMemo(() => {
    if (!brand) return [];
    const arr = categoriesByBrand[brand] || [];
    if (brand !== "Apple") return arr;
    // iPhone d’abord, puis iPad, puis le reste
    const rank = (s: string) => {
      const x = s.toLowerCase();
      if (x.startsWith("iphone")) return 0;
      if (x.startsWith("ipad")) return 1;
      return 2;
    };
    const copy = arr.slice();
    copy.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });
    return copy;
  }, [brand, categoriesByBrand]);

  const modelOptions: string[] = useMemo(() => {
    if (!category) return [];
    return modelsByCategory[category] || [];
  }, [category, modelsByCategory]);

  /* 6) Auto-sélections */
  useEffect(() => {
    if (!brand) return;
    if (!category) {
      if (categoryOptions.length === 1) setCategory(categoryOptions[0]);
    } else if (categoryOptions.indexOf(category) === -1) {
      setCategory("");
      setModel("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, categoryOptions.join("|")]);

  useEffect(() => {
    if (!category) return;
    if (!model) {
      if (modelOptions.length === 1) {
        const m = modelOptions[0];
        setModel(m);
        onSelect(category, m);
      }
    } else if (modelOptions.indexOf(model) === -1) {
      setModel("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, modelOptions.join("|")]);

  /* 7) Sync externe */
  useEffect(() => {
    if (selectedCategory) {
      const inferred = brandOfCategory(selectedCategory);
      if (brands.indexOf(inferred) !== -1) setBrand(inferred);
      setCategory(selectedCategory);
    }
    if (selectedModel) setModel(selectedModel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedModel]);

  /* 8) Handlers */
  const onChangeBrand = (val: string) => {
    setBrand(val as Brand);
    setCategory("");
    setModel("");
  };
  const onChangeCategory = (val: string) => {
    setCategory(val);
    setModel("");
  };
  const onChangeModel = (val: string) => {
    setModel(val);
    if (val) onSelect(category, val);
  };

  /* 9) UI (design inchangé) */
  return (
    <section aria-labelledby="step-model-title" className={className ?? "w-full"}>
      <header className="mb-4">
        <h2 id="step-model-title" className="text-xl font-semibold text-[#222]">
          1) Choisissez votre appareil
        </h2>
        <p className="text-sm text-gray-600">
          Sélectionnez <strong>Marque</strong>, puis <strong>Série</strong>, puis <strong>Modèle</strong>.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Marque */}
        <div className="col-span-1">
          <label htmlFor="brand" className="block text-xs font-medium text-gray-700 mb-1">
            Marque
          </label>
          <select
            id="brand"
            value={brand}
            onChange={(e) => onChangeBrand(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
          >
            <option value="" disabled>— Sélectionnez une marque —</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Catégorie / Série */}
        <div className="col-span-1">
          <label htmlFor="category" className="block text-xs font-medium text-gray-700 mb-1">
            Série / Catégorie
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => onChangeCategory(e.target.value)}
            disabled={!brand}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#54b435] disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="" disabled>— Sélectionnez une série —</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Modèle */}
        <div className="col-span-1">
          <label htmlFor="model" className="block text-xs font-medium text-gray-700 mb-1">
            Modèle
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => onChangeModel(e.target.value)}
            disabled={!category}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#54b435] disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="" disabled>— Sélectionnez un modèle —</option>
            {modelOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mini-résumé compact */}
      <div className="mt-3 text-xs text-gray-600">
        {brand && <span className="mr-2">Marque : <strong>{brand}</strong></span>}
        {category && <span className="mr-2">Série : <strong>{category}</strong></span>}
        {model && <span>Modèle : <strong>{model}</strong></span>}
      </div>

      {/* Reset */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => { setBrand(""); setCategory(""); setModel(""); }}
          className="text-[11px] text-gray-600 hover:underline"
        >
          Réinitialiser la sélection
        </button>
      </div>
    </section>
  );
};

export default StepModel;
