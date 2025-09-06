import SmartphonesSection from './components/SmartphonesSection';
import type { UtopyaItem } from '@/types/smartphones';
import { requiredEnv } from '@/lib/env';

export const dynamic = 'force-dynamic'; // évite un cache trop agressif en dev
// export const revalidate = 300;       // en prod, préfère ça pour du ISR

async function fetchUtopya(): Promise<UtopyaItem[]> {
  const url = requiredEnv('UTOPYA_FEED_URL');
  const token = process.env.UTOPYA_TOKEN; // optionnel

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    // next: { revalidate: 300 }, // en prod: remets le revalidate
    cache: 'no-store',            // en dev: évite de garder du vide en cache
  });

  if (!res.ok) {
    // Console claire pour dev
    console.error('[Utopya] fetch failed', res.status, await res.text());
    throw new Error(`Utopya fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as UtopyaItem[] | { items?: UtopyaItem[] };
  // si ton endpoint renvoie { items: [...] }
  const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  return items;
}

export default async function Page() {
  let items: UtopyaItem[] = [];
  try {
    items = await fetchUtopya();
  } catch (e) {
    console.error(e);
    // Affiche un placeholder côté UI (plutôt que rien du tout)
  }

  return <SmartphonesSection initialItems={items} />;
}
