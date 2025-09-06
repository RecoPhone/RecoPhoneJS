// src/types/utopya.ts

export type UtopyaItem = {
  sku: string | null;
  name: string | null;
  price: string | null;            // "€ 181,95"
  price_raw_eur: number | null;    // 181.95
  capacity: string | null;         // "256Go"
  grade: string | null;            // "Grade A"
  state: string | null;            // "Reconditionné" | "Fonctionnel"
  stock: string | null;            // parfois répète la capacité
  url: string | null;
  image: string | null;
  color: string | null;            // "Blanc" | "Mix Color" | ...
  variant_id: string | null;
  scraped_at: number | null;

  // infos fournisseur (si présentes)
  price_source?: string | null;         // "101€95"
  price_source_raw_eur?: number | null; // 101.95
  margin_eur?: number | null;           // 80.0
};

export type UtopyaPayload = UtopyaItem[];

export function asUtopyaItem(input: unknown): UtopyaItem {
  const s = (k: string) => (typeof (input as any)?.[k] === 'string' ? (input as any)[k] : null);
  const n = (k: string) => (typeof (input as any)?.[k] === 'number' ? (input as any)[k] : null);

  return {
    sku: s('sku'),
    name: s('name'),
    price: s('price'),
    price_raw_eur: n('price_raw_eur'),
    capacity: s('capacity'),
    grade: s('grade'),
    state: s('state'),
    stock: s('stock'),
    url: s('url'),
    image: s('image'),
    color: s('color'),
    variant_id: s('variant_id'),
    scraped_at: n('scraped_at'),

    price_source: s('price_source'),
    price_source_raw_eur: n('price_source_raw_eur'),
    margin_eur: n('margin_eur'),
  };
}

export function asUtopyaPayload(input: unknown): UtopyaPayload {
  if (!Array.isArray(input)) return [];
  return input.map(asUtopyaItem);
}
