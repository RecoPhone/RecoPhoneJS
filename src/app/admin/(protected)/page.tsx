import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { listRootFolders } from '@/lib/ftp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CardBase = { title: string; value: string; hint: string };
type CardLink = CardBase & { href: string };
type Card = CardBase | CardLink;

export default async function AdminHome() {
  await requireAdmin();

  let docCount = '—';
  try {
    const folders = await listRootFolders();
    docCount = String(folders.length);
  } catch {}

  const cards: readonly Card[] = [
    { title: 'Documents générés', value: docCount, hint: 'PDF devis + contrats', href: '/admin/documents' },
    { title: 'Commandes smartphones', value: '—', hint: 'Flux fournisseur' },
    { title: 'Visites du site', value: '—', hint: 'Matomo/Gtag' },
    { title: 'Abonnements en cours', value: '—', hint: 'Stripe' },
    { title: 'Articles du blog', value: '—', hint: 'Éditeur à venir' },
  ] as const;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold mb-3">Tableau de bord</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl bg-white p-4 shadow-sm border">
              <div className="text-sm text-gray-600">{c.title}</div>
              <div className="text-3xl font-bold mt-1">{c.value}</div>
              <div className="text-xs text-gray-500 mt-2">{c.hint}</div>
              {'href' in c && (
                <Link href={c.href} className="inline-block mt-3 text-sm font-medium text-[#54b435] hover:underline">
                  Ouvrir
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
