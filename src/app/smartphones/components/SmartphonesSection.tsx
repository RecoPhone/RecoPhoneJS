'use client';

import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
// ⚠️ adapte ce chemin si besoin (dans ton projet, c'est souvent "@/components/cart/CartProvider")
import { useCart } from '@/components/CartProvider';
import type { UtopyaItem } from '@/types/smartphones';

const passthroughLoader = ({ src }: { src: string }) => src;

/* =========================================================
   Prix (TTC) : parsing robuste + affichage
========================================================= */
function parsePriceTTC(price?: string | null): number | null {
  if (!price) return null;
  const s = price.replace(/\u00A0/g, ' ').trim();

  // cas "242€95"
  const euroMiddle = s.match(/(^|\s)(\d+)\s*€\s*(\d{1,2})(\D|$)/);
  if (euroMiddle) {
    const intPart = euroMiddle[2];
    const decPart = euroMiddle[3].padEnd(2, '0');
    const n = Number(`${intPart}.${decPart}`);
    return Number.isFinite(n) ? n : null;
  }

  // général
  let t = s.replace(/[^\d,.\s-]/g, '').replace(/\s/g, '');
  if (t.includes(',') && t.lastIndexOf(',') > t.lastIndexOf('.')) {
    t = t.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  } else {
    t = t.replace(/,/g, '');
  }
  const n = Number(t);
  if (Number.isFinite(n)) return n;

  // filet de sécu
  const alt = s.match(/(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)(?!.*\d)/);
  if (alt) {
    let u = alt[1].replace(/\s/g, '');
    if (u.includes(',') && u.lastIndexOf(',') > u.lastIndexOf('.')) {
      u = u.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
    } else {
      u = u.replace(/,/g, '');
    }
    const n2 = Number(u);
    if (Number.isFinite(n2)) return n2;
  }
  return null;
}

function formatTTCDisplay(ttc: number | null, fallback?: string | null) {
  if (ttc == null) return fallback ?? 'Prix sur demande';
  return ttc.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' });
}

function getPriceTTCFromItem(
  it: Partial<UtopyaItem> & { price_raw_eur?: number | null }
): number | null {
  const raw = it?.price_raw_eur;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return parsePriceTTC(it?.price ?? null);
}

/* =========================================================
   Normalisation produit (marque, grade, récence…)
========================================================= */
function brandTag(name?: string | null): 'iPhone' | 'Samsung' | 'iPad' | 'Autre' {
  if (!name) return 'Autre';
  const s = name.toLowerCase();
  if (/\bipad\b/.test(s)) return 'iPad';
  if (/\biphone|iphones\b/.test(s) || /\bapple\b/.test(s)) return 'iPhone';
  if (/samsung|galaxy|note|z\s?(flip|fold)/.test(s)) return 'Samsung';
  return 'Autre';
}

function fallbackCapacity(name?: string | null): string | null {
  if (!name) return null;
  const m = name.match(/(\d+)\s?(GB|Go|TB)/i);
  if (!m) return null;
  return `${m[1]} ${m[2].toUpperCase().replace('GO', 'GB')}`;
}

type GradeKey = 'A' | 'B' | 'C' | 'MixABC' | 'Autre' | string;

function detectGrade(input: { grade?: string | null; name?: string | null; url?: string | null }): GradeKey {
  const raw = [input.grade, input.name, input.url].filter(Boolean).join(' ');
  if (!raw) return 'Autre';

  const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const t = stripAccents(raw).toLowerCase();

  if (/(mix\s*abc|mixabc)/.test(t)) return 'MixABC';
  if (/\bgrade?\s*a\+?\b|\ba\+?\b/.test(t)) return 'A';
  if (/\bgrade?\s*b\+?\b|\bb\+?\b/.test(t)) return 'B';
  if (/\bgrade?\s*c\+?\b|\bc\+?\b/.test(t)) return 'C';

  const m = t.match(/\bgrade?\s*([a-z0-9\+]+)/);
  if (m?.[1]) return m[1].toUpperCase();

  return 'Autre';
}

function recencyScore(name?: string | null): number {
  if (!name) return 0;
  const s = name.toLowerCase();

  const mIph = s.match(/iphone\s*(\d{1,2})/);
  if (mIph) {
    let base = Number(mIph[1]);
    if (/pro\s*max/.test(s)) base += 0.3;
    else if (/pro/.test(s)) base += 0.2;
    else if (/plus/.test(s)) base += 0.1;
    return 1000 + base;
  }
  if (/iphone\s*se/.test(s)) return 1010;

  if (/\bipad\b/.test(s)) {
    let base = 920;
    if (/pro/.test(s)) base += 0.3;
    else if (/air/.test(s)) base += 0.2;
    else if (/mini/.test(s)) base += 0.1;
    const y = s.match(/20(1\d|2\d|3\d|4\d)/);
    if (y) base += Number(y[0].slice(2)) / 100;
    return base;
  }

  const mZFold = s.match(/z\s*fold\s*(\d+)/);
  if (mZFold) return 950 + Number(mZFold[1]);
  const mZFlip = s.match(/z\s*flip\s*(\d+)/);
  if (mZFlip) return 940 + Number(mZFlip[1]);
  const mSGal = s.match(/\bs\s?(\d{2})\b/);
  if (mSGal) return 900 + Number(mSGal[1]);
  const mNote = s.match(/note\s*(\d+)/);
  if (mNote) return 880 + Number(mNote[1]);
  const mA = s.match(/\ba\s?(\d{2,3})\b/);
  if (mA) return 800 + Number(mA[1]) / 10;

  return 0;
}

/* =========================================================
   ID stable (FNV-1a)
========================================================= */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

function buildItemId(p: Partial<UtopyaItem> & {
  capacity?: string | null; grade?: string | null; state?: string | null; color?: string | null;
}): string {
  const base = [
    p.sku ?? '',
    p.url ?? '',
    p.name ?? '',
    p.capacity ?? '',
    String(p.grade ?? ''),
    String(p.state ?? ''),
    String(p.color ?? ''),
  ].join('|');
  return `utp_${fnv1a(base)}`;
}

/* =========================================================
   Panier (bridge)
========================================================= */
type LocalCartItem = {
  id: string;
  title: string;
  type: 'device' | 'quote' | 'subscription' | string;
  unitPrice: number; // cents
  qty: number;
  meta?: Record<string, unknown>;
};

function asStringOrNull(v: unknown): string | null {
  if (v == null) return null;
  return typeof v === 'string' ? v : String(v);
}

function useCartBridge() {
  const cart = useCart();
  const ids = useMemo(() => new Set(cart.items.map((it) => String(it.id))), [cart.items]);
  const addCartItem = (item: LocalCartItem) => cart.addItem(item as never);
  return { ids, addCartItem };
}

/* =========================================================
   Couleur (détection robuste)
========================================================= */
type ColorExtraction = {
  raw: string | null;
  normalized: string | null;
  source: 'field' | 'url' | 'name' | 'image' | null;
};

const AMBIGUOUS = ['mix color', 'mix', 'assorti', 'assorted', 'various', 'random', 'multi', 'multicolor'];

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normText(s?: string | null) {
  if (!s) return '';
  return stripAccents(String(s).toLowerCase()).replace(/[_-]+/g, ' ');
}

const COLOR_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bminuit\b|\bmidnight\b/, label: 'Minuit' },
  { re: /\bstarlight\b/, label: 'Starlight' },
  { re: /\bbleu\s?nuit\b|\bnavy\b/, label: 'Bleu nuit' },
  { re: /\bnoir\b|\bblack\b|\bgraphite\b/, label: 'Noir' },
  { re: /\bblanc\b|\bwhite\b/, label: 'Blanc' },
  { re: /\bbleu\b|\bblue\b/, label: 'Bleu' },
  { re: /\bvert\b|\bgreen\b/, label: 'Vert' },
  { re: /\brouge\b|\bred\b|\bproduct\s*red\b/, label: 'Product RED' },
  { re: /\bviolet\b|\bpurple\b|\bpourpre\b/, label: 'Violet' },
  { re: /\brose\b|\bpink\b|\bcorail\b|\bcoral\b/, label: 'Rose' },
  { re: /\bjaune\b|\byellow\b/, label: 'Jaune' },
  { re: /\bargent\b|\bsilver\b/, label: 'Argent' },
  { re: /\bor\b|\bgold\b/, label: 'Or' },
  { re: /\bgris\s*sideral\b|\bspace\s*gray\b/, label: 'Gris sidéral' },
  { re: /\bblac\b/, label: 'Noir' }, // typo
];

function canonicalizeColor(raw: string): string | null {
  const t = normText(raw);
  if (!t) return null;
  if (AMBIGUOUS.some((a) => t.includes(a))) return null;
  for (const { re, label } of COLOR_PATTERNS) if (re.test(t)) return label;
  return null;
}

function extractColorFromItem(p: Partial<UtopyaItem>): ColorExtraction {
  if (p?.color) {
    const norm = canonicalizeColor(p.color);
    if (norm) return { raw: p.color, normalized: norm, source: 'field' };
  }
  if (p?.url) {
    const slug = String(p.url).split('/').filter(Boolean).pop();
    const norm = canonicalizeColor(slug || p.url);
    if (norm) return { raw: slug || p.url, normalized: norm, source: 'url' };
  }
  if (p?.name) {
    const norm = canonicalizeColor(p.name);
    if (norm) return { raw: p.name, normalized: norm, source: 'name' };
  }
  if (p?.image) {
    const file = String(p.image).split('/').pop();
    const norm = canonicalizeColor(file || p.image);
    if (norm) return { raw: file || p.image, normalized: norm, source: 'image' };
  }
  return { raw: null, normalized: null, source: null };
}

/* =========================================================
   UI réassurance
========================================================= */
function InfoSection() {
  const Bullet = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-3">
      <svg className="mt-0.5 h-5 w-5 flex-none text-[#54b435]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9 16.17l-3.88-3.88-1.41 1.41L9 19 20.29 7.71l-1.41-1.41z" />
      </svg>
      <span className="text-sm text-gray-700">{children}</span>
    </li>
  );
  return (
    <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-[#222]">Qualité & garanties RecoPhone</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        <Bullet>Garantie légale 24&nbsp;mois (hors casse/oxydation/liquides).</Bullet>
        <Bullet>Batterie testée/équivalente performance avant expédition.</Bullet>
        <Bullet>Débloqué tout opérateur, IMEI vérifié, réinitialisé.</Bullet>
        <Bullet>Tests multipoints (audio, caméras, capteurs, réseaux…).</Bullet>
      </ul>
      <p className="mt-4 text-xs text-gray-500">
        Les visuels sont non contractuels. Détails et accessoires selon la fiche produit.
      </p>
    </section>
  );
}

/* =========================================================
   Composant principal
========================================================= */
type SortKey = 'name_asc' | 'price_asc' | 'price_desc';
type Props = { initialItems: UtopyaItem[] };

const PAGE_SIZE = 12;
const DEFAULT_BRAND = 'all';
const ALLOWED_BRANDS = ['all', 'iPhone', 'Samsung', 'iPad'] as const;

type EnrichedItem = UtopyaItem & {
  __id: string;
  brandTag: 'iPhone' | 'Samsung' | 'iPad' | 'Autre';
  recency: number;

  priceTTC?: number | null;
  displayPrice?: string | null;
  inCart?: boolean;
  colorNormalized?: string | null;
  gradeKey?: string | null;
  scraped_at?: string | null;

  // champs optionnels parfois présents dans le flux
  sku?: string | null;
  state?: string | null;
  url?: string | null;
  image?: string | null;
  price?: string | null;
};

export default function SmartphonesSection({ initialItems }: Props) {
  const { ids: cartIds, addCartItem } = useCartBridge();

  // Filtres
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState<string>(DEFAULT_BRAND);
  const [capacity, setCapacity] = useState<string>('all');
  const [grade, setGrade] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>(''); // €
  const [maxPrice, setMaxPrice] = useState<string>(''); // €
  const [sort, setSort] = useState<SortKey>('price_desc');
  const [visible, setVisible] = useState<number>(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<EnrichedItem | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Enrichissement
const enriched = useMemo<EnrichedItem[]>(() => {
  return (initialItems ?? []).map((it) => {
    const btag = brandTag(it.name);
    const cap = it.capacity ?? fallbackCapacity(it.name);
    const priceTTC = getPriceTTCFromItem(it);
    const displayPrice = formatTTCDisplay(priceTTC, it.price);
    const __id = buildItemId({ ...it, capacity: cap });
    const inCart = cartIds.has(__id);
    const colorEx = extractColorFromItem(it);

    // Accès "souple" aux champs potentiels du flux sans any
    const loose = it as unknown as Record<string, unknown>;
    const utopyaFields = {
      sku: asStringOrNull(loose.sku),
      state: asStringOrNull(loose.state),
      url: asStringOrNull(loose.url),
      image: asStringOrNull(loose.image),
      price: asStringOrNull(loose.price),
      scraped_at: asStringOrNull(loose.scraped_at), // 👈 string|null assuré
    };

    const item = {
      ...it,
      ...utopyaFields,
      __id,
      brandTag: btag,
      capacity: cap ?? null,                
      priceTTC,
      displayPrice,
      recency: recencyScore(it.name),        
      inCart,
      colorNormalized: colorEx.normalized,
      gradeKey: detectGrade({ grade: it.grade, name: it.name, url: it.url }),
    };

    return item as EnrichedItem;
  });
}, [initialItems, cartIds]);


  // Options dynamiques
  const options = useMemo(() => {
    const caps = new Set<string>();
    const grades = new Set<string>();

    enriched.forEach((i) => {
      if (i.capacity) caps.add(i.capacity);
      if (i.gradeKey && i.gradeKey !== 'Autre') grades.add(i.gradeKey);
    });

    const capacityOpts = ['all', ...Array.from(caps).sort((a, b) => {
      const na = Number(a.replace(/\D/g, '')) || 0;
      const nb = Number(b.replace(/\D/g, '')) || 0;
      return na - nb || a.localeCompare(b);
    })];

    const order = (g: string) => {
      if (g === 'MixABC') return 0;
      if (g === 'A') return 1;
      if (g === 'B') return 2;
      if (g === 'C') return 3;
      return 10; // autres ensuite (A+, etc.)
    };
    const gradeOpts = ['all', ...Array.from(grades).sort((a, b) => order(a) - order(b) || a.localeCompare(b))];

    return { capacities: capacityOpts, grades: gradeOpts };
  }, [enriched]);

  // Filtrage + tri (recency non optionnel => pas d'undefined)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const min = minPrice ? Number(minPrice.replace(',', '.')) : NaN;
    const max = maxPrice ? Number(maxPrice.replace(',', '.')) : NaN;

    let arr = enriched.filter((i) => {
      const okQ = !needle || (i.name?.toLowerCase().includes(needle) ?? false);
      const okBrand = brand === 'all' || i.brandTag === brand;
      const okCap = capacity === 'all' || i.capacity === capacity;
      const okGrade = grade === 'all' || i.gradeKey === grade;
      const okMin = Number.isNaN(min) || (i.priceTTC ?? Infinity) >= min;
      const okMax = Number.isNaN(max) || (i.priceTTC ?? -Infinity) <= max;
      return okQ && okBrand && okCap && okGrade && okMin && okMax;
    });

    switch (sort) {
      case 'price_asc':
        arr = arr.sort(
          (a, b) =>
            (a.priceTTC ?? Number.POSITIVE_INFINITY) -
              (b.priceTTC ?? Number.POSITIVE_INFINITY) ||
            b.recency - a.recency
        );
        break;
      case 'price_desc':
        arr = arr.sort(
          (a, b) =>
            (b.priceTTC ?? Number.NEGATIVE_INFINITY) -
              (a.priceTTC ?? Number.NEGATIVE_INFINITY) ||
            b.recency - a.recency
        );
        break;
      default:
        arr = arr.sort(
          (a, b) => (a.name ?? '').localeCompare(b.name ?? '') || b.recency - a.recency
        );
    }
    return arr;
  }, [enriched, q, brand, capacity, grade, minPrice, maxPrice, sort]);

  useEffect(() => setVisible(PAGE_SIZE), [q, brand, capacity, grade, minPrice, maxPrice, sort]);

  // Modal helpers
  function closeModal() {
    setOpen(false);
    setCurrent(null);
  }
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function handleAddToCart(p: EnrichedItem) {
    if (p?.priceTTC == null) return;
    const unitPriceCents = Math.round(Number(p.priceTTC) * 100);
    const id = String(p.__id);
    const color = p.colorNormalized ?? extractColorFromItem(p).normalized;

    const item: LocalCartItem = {
      id,
      title: p.name ?? 'Smartphone reconditionné',
      type: 'device',
      unitPrice: unitPriceCents,
      qty: 1,
      meta: {
        source: 'utopya',
        sku: p.sku ?? null,
        capacity: p.capacity ?? null,
        grade: p.grade ?? null,
        state: p.state ?? null,
        priceTTC: p.priceTTC ?? null,
        displayPrice: p.displayPrice ?? p.price ?? null,
        url: p.url ?? null,
        scrapedAt: p.scraped_at ?? null,
        brandTag: p.brandTag,
        color,
      },
    };
    addCartItem(item);
  }

  const pageItems = filtered.slice(0, visible);

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pt-6 md:pt-10" style={{ colorScheme: 'light' }}>
      {/* Barre de filtres */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <input
            placeholder="Rechercher un modèle (ex: iPhone 15)"
            className="w-full md:w-[320px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Rechercher"
          />
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="relative">
            <select
              className="w-[150px] appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-[#222] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              aria-label="Marque"
            >
              {ALLOWED_BRANDS.map((b) => (
                <option key={b} value={b}>{b === 'all' ? 'Toutes marques' : b}</option>
              ))}
            </select>
            <Chevron />
          </div>

          <div className="relative">
            <select
              className="w-[150px] appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-[#222] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              aria-label="Capacité"
            >
              {options.capacities.map((c) => (
                <option key={c} value={c}>{c === 'all' ? 'Toutes capacités' : c}</option>
              ))}
            </select>
            <Chevron />
          </div>

          <div className="relative">
            <select
              className="w-[140px] appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-[#222] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              aria-label="Grade"
            >
              {options.grades.map((g) => (
                <option key={g} value={g}>{g === 'all' ? 'Tous grades' : `Grade ${g}`}</option>
              ))}
            </select>
            <Chevron />
          </div>

          <input
            inputMode="decimal"
            placeholder="€ min"
            className="w-[90px] rounded-xl border border-gray-300 bg-white px-2 py-2 text-sm text-[#222] placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            aria-label="Prix minimum"
          />
          <span className="text-gray-400">—</span>
          <input
            inputMode="decimal"
            placeholder="€ max"
            className="w-[90px] rounded-xl border border-gray-300 bg-white px-2 py-2 text-sm text-[#222] placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            aria-label="Prix maximum"
          />

          <div className="relative">
            <select
              className="w-[160px] appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-[#222] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Trier"
            >
              <option value="price_desc">Prix : plus cher</option>
              <option value="price_asc">Prix : moins cher</option>
              <option value="name_asc">Nom (A→Z)</option>
            </select>
            <Chevron />
          </div>
        </div>

        {/* Toggle filtres mobile */}
        <button
          className="md:hidden inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-[#222] shadow-sm"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          Filtres
        </button>
      </div>

      {/* Panneau filtres mobile */}
      {showFilters && (
        <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-3 md:hidden" style={{ colorScheme: 'light' }}>
          <SelectMobile value={brand} onChange={setBrand} options={ALLOWED_BRANDS.map((b) => [b, b === 'all' ? 'Toutes marques' : b] as const)} />
          <SelectMobile value={capacity} onChange={setCapacity} options={options.capacities.map((c) => [c, c === 'all' ? 'Toutes capacités' : c] as const)} />
          <SelectMobile value={grade} onChange={setGrade} options={options.grades.map((g) => [g, g === 'all' ? 'Tous grades' : `Grade ${g}`] as const)} />
          <div className="flex items-center gap-2">
            <input
              inputMode="decimal"
              placeholder="€ min"
              className="w-full rounded-xl border border-gray-300 bg-white px-2 py-2 text-sm text-[#222] placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <input
              inputMode="decimal"
              placeholder="€ max"
              className="w-full rounded-xl border border-gray-300 bg-white px-2 py-2 text-sm text-[#222] placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          <SelectMobile
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            options={[
              ['price_desc', 'Prix : plus cher'],
              ['price_asc', 'Prix : moins cher'],
              ['name_asc', 'Nom (A→Z)'],
            ]}
          />
        </div>
      )}

      {/* Compteur résultats */}
      <div className="mb-3 text-sm text-gray-600">
        <span className="font-medium text-[#222]">{filtered.length}</span> résultats
        {brand !== 'all' ? <> · <span className="capitalize">{brand}</span></> : null}
        {capacity !== 'all' ? <> · {capacity}</> : null}
        {grade !== 'all' ? <> · Grade {grade}</> : null}
        {q ? <> · “{q}”</> : null}
      </div>

      {/* Grid cartes */}
      {pageItems.length === 0 ? (
        <p className="text-gray-600">Aucun résultat avec ces filtres.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-5 lg:gap-6">
            {pageItems.map((p, idx) => {
              const key = String(p.__id ?? buildItemId(p) ?? idx);
              const inCart = Boolean(p.inCart || cartIds.has(key));

              return (
                <article
                  key={key}
                  className={`group flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md ${
                    inCart ? 'border-emerald-300' : 'border-gray-200'
                  }`}
                >
                  <div className="relative mb-3 h-[168px] w-full overflow-hidden rounded-xl border border-gray-100">
                    <Image
                      src={p.image ?? '/placeholder.png'}
                      alt={p.name ?? 'Produit reconditionné'}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-contain p-3 transition-transform duration-200 group-hover:scale-[1.02]"
                      loading="lazy"
                      unoptimized
                      loader={passthroughLoader}
                    />
                  </div>

                  <h3 className="min-h-[40px] text-[15px] font-semibold text-[#222] line-clamp-2">
                    {p.name ?? 'Modèle inconnu'}
                  </h3>

                  <div className="mt-2 flex min-h-[24px] flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                    {p.capacity && <span className="rounded-full border px-2 py-0.5">{p.capacity}</span>}
                    {p.gradeKey && p.gradeKey !== 'Autre' && (
                      <span className="rounded-full border px-2 py-0.5">
                        {p.gradeKey === 'MixABC' ? 'MixABC' : `Grade ${p.gradeKey}`}
                      </span>
                    )}
                    {p.colorNormalized && (
                      <span className="rounded-full border px-2 py-0.5">{p.colorNormalized}</span>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <p className="text-lg font-bold text-[#54b435]">
                      {p.displayPrice ?? p.price ?? 'Prix sur demande'}
                    </p>
                    {inCart && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Dans le panier
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex gap-2 pt-3">
                    <button
                      onClick={() => handleAddToCart(p)}
                      disabled={inCart || p.priceTTC == null}
                      className={`inline-flex h-9 flex-1 items-center justify-center rounded-xl px-3 text-sm font-medium transition ${
                        inCart || p.priceTTC == null
                          ? 'text-white bg-emerald-600 cursor-default'
                          : 'text-white bg-[#54b435] hover:opacity-90'
                      }`}
                      aria-live="polite"
                      title={inCart ? 'Déjà dans le panier' : 'Ajouter au panier'}
                    >
                      {inCart ? 'Dans le panier' : 'Ajouter'}
                    </button>

                    <button
                      onClick={() => {
                        setCurrent(p);
                        setOpen(true);
                      }}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border px-3 text-sm font-medium text-[#222] hover:bg-gray-50"
                      aria-haspopup="dialog"
                    >
                      Détails
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {filtered.length > visible && (
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium text-[#222] hover:bg-gray-50"
              >
                Voir plus ({Math.min(PAGE_SIZE, filtered.length - visible)} de plus)
              </button>
            </div>
          )}
        </>
      )}

      {/* Réassurance */}
      <InfoSection />

      {/* Modal détails */}
      {open && current && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="utopya-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
              setCurrent(null);
            }
          }}
        >
          <div className="w-full max-w-full sm:max-w-xl sm:rounded-2xl rounded-none bg-white shadow-2xl ring-1 ring-black/5 max-h-[100vh] sm:max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b px-4 sm:px-5 py-3">
              <h2 id="utopya-modal-title" className="text-base sm:text-lg font-semibold text-[#222] line-clamp-2 pr-4">
                {current.name ?? 'Détails du produit'}
              </h2>
              <button
                ref={closeBtnRef}
                onClick={() => {
                  setOpen(false);
                  setCurrent(null);
                }}
                className="inline-flex items-center justify-center rounded-xl border px-3 py-1.5 text-sm font-medium text-[#222] hover:bg-gray-50"
                aria-label="Fermer la fenêtre"
              >
                Fermer
              </button>
            </div>

            <div className="grid gap-4 p-4 sm:p-5 sm:grid-cols-2">
              <div className="col-span-1 flex items-center justify-center rounded-xl border border-gray-100 bg-white p-3">
                <Image
                  src={current.image ?? '/placeholder.png'}
                  alt={current.name ?? 'Produit reconditionné'}
                  width={400}
                  height={400}
                  className="max-h-72 w-auto object-contain"
                />
              </div>

              <div className="col-span-1 space-y-2 text-sm text-gray-700">
                <p><span className="text-gray-500">Modèle :</span> <strong>{current.name ?? '—'}</strong></p>
                <p><span className="text-gray-500">Capacité :</span> <strong>{current.capacity ?? fallbackCapacity(current.name) ?? '—'}</strong></p>
                <p><span className="text-gray-500">Couleur :</span> <strong>{extractColorFromItem(current).normalized ?? '—'}</strong></p>
                {(() => {
                  const g = detectGrade({ grade: current.grade, name: current.name, url: current.url });
                  return g && g !== 'Autre' ? (
                    <p>
                      <span className="text-gray-500">Grade :</span>{' '}
                      <strong>{g === 'MixABC' ? 'MixABC' : `Grade ${g}`}</strong>
                    </p>
                  ) : null;
                })()}

                <div className="pt-2 rounded-xl bg-[#edfbe2] px-3 py-2 text-[#222]">
                  <p className="text-sm font-semibold">Inclus :</p>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    <li>Un câble de charge</li>
                    <li>Un verre trempé posé</li>
                  </ul>
                </div>

                <div className="pt-2">
                  {(() => {
                    const key = String(
                      buildItemId({
                        ...current,
                        capacity: current.capacity ?? fallbackCapacity(current.name),
                      })
                    );
                    const inCart = cartIds.has(key);
                    const unitPrice = getPriceTTCFromItem(current);
                    return (
                      <button
                        onClick={() => {
                          if (!inCart && unitPrice != null) {
                            const color = extractColorFromItem(current).normalized;
                            const item: LocalCartItem = {
                              id: key,
                              title: current.name ?? 'Smartphone reconditionné',
                              type: 'device',
                              unitPrice: Math.round(unitPrice * 100),
                              qty: 1,
                              meta: {
                                source: 'utopya',
                                sku: current.sku ?? null,
                                capacity: current.capacity ?? fallbackCapacity(current.name),
                                grade: current.grade ?? null,
                                state: current.state ?? null,
                                priceTTC: unitPrice,
                                displayPrice: current.price ?? null,
                                url: current.url ?? null,
                                scrapedAt: current.scraped_at ?? null,
                                brandTag: brandTag(current.name),
                                color,
                              },
                            };
                            addCartItem(item);
                          }
                        }}
                        disabled={inCart || unitPrice == null}
                        className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-sm font-medium transition ${
                          inCart ? 'text-white bg-emerald-600 cursor-default' : 'text-white bg-[#54b435] hover:opacity-90'
                        }`}
                      >
                        {inCart ? 'Dans le panier' : 'Ajouter au panier'}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   UI helpers pour selects
========================================================= */
function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.127l3.71-3.896a.75.75 0 111.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
    </svg>
  );
}

function SelectMobile<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<readonly [T, string]>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-[#222] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#54b435]"
      >
        {options.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      <Chevron />
    </div>
  );
}
