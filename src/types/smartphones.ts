export type UtopyaItem = {
  sku: string | null;
  name: string | null;
  price: string | null;           
  price_raw_eur: number | null;    
  capacity: string | null;      
  grade: string | null;           
  state: string | null;        
  stock: string | null;            
  url: string | null;
  image: string | null;
  color: string | null;            
  variant_id: string | null;
  scraped_at: number | null;


  price_source?: string | null;         
  price_source_raw_eur?: number | null; 
  margin_eur?: number | null;           
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

export interface UtopyaPrice {
  amount: number;
  currency: string;
  updatedAt?: string;
}

export interface UtopyaImage {
  url: string;
  alt?: string;
}

export interface UtopyaDevice {
  id: string;
  brand: string;
  model: string;
  storage?: string;
  condition?: string;
  grade?: string;
  color?: string;
  price: UtopyaPrice;
  images?: UtopyaImage[];
  image?: string;
  name?: string;
  [key: string]: unknown;
}

export type UtopyaDeviceList = UtopyaDevice[];