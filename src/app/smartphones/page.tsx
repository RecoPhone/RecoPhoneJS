// src/app/smartphones/page.tsx
import UtopyaBrowser from './components/SmartphonesSection';
import GradesExplainer from './components/GradeExplanation';
import { asUtopyaPayload, type UtopyaItem } from '@/types/smartphones';

function unwrapArrayLike(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    const keys = ['items', 'data', 'products', 'results', 'listings', 'devices', 'entries'];
    for (const k of keys) {
      const v = obj[k];
      if (Array.isArray(v)) return v as unknown[];
    }
  }
  return [];
}

async function fetchUtopya(): Promise<UtopyaItem[]> {
  const url =
    process.env.UTOPYA_FEED_URL ||
    process.env.NEXT_PUBLIC_UTOPYA_FEED_URL || '';

  if (!url) return [];

  try {
    const res = await fetch(url, { next: { revalidate: 300 } }); // 5 min
    if (!res.ok) return [];

    const raw = await res.json();
    const arr = unwrapArrayLike(raw);
    const items = asUtopyaPayload(arr);
    return items.filter((it) => it?.name);
  } catch {
    return [];
  }
}

export default async function Page() {
  const initialItems = await fetchUtopya();

  return (
    <main className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#222]">Smartphones reconditionnés</h1>
        <p className="mt-2 text-gray-600">Des modèles testés et garantis, prêts à l’emploi.</p>
      </header>

      <UtopyaBrowser initialItems={initialItems} />
      <GradesExplainer />
    </main>
  );
}
