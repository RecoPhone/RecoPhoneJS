import Link from 'next/link';
import { listPath } from '@/lib/ftp';

export const dynamic = 'force-dynamic';

function crumbs(pathStr: string) {
  const segs = (pathStr || '/').split('/').filter(Boolean);
  const out: Array<{ label: string; href: string }> = [{ label: 'racine', href: '/admin/documents/browse?path=%2F' }];
  let acc = '';
  for (const s of segs) {
    acc += '/' + s;
    out.push({ label: s, href: `/admin/documents/browse?path=${encodeURIComponent(acc)}` });
  }
  return out;
}

export default async function BrowsePage({ searchParams }: { searchParams: { path?: string } }) {
  const rel = searchParams.path || '/';
  const entries = await listPath(rel);
  const trail = crumbs(rel);

  return (
    <div className="space-y-6">
      <header className="flex items-center flex-wrap gap-2">
        {trail.map((c, i) => (
          <span key={c.href} className="text-sm">
            {i > 0 && <span className="text-gray-400 mx-1">/</span>}
            <Link href={c.href} className="text-[#54b435] hover:underline">{c.label}</Link>
          </span>
        ))}
      </header>

      <div className="rounded-2xl bg-white border shadow-sm">
        <div className="grid grid-cols-12 px-4 py-2 text-xs text-gray-500 border-b">
          <div className="col-span-6">Nom</div>
          <div className="col-span-2 text-right">Taille</div>
          <div className="col-span-3">Modifié</div>
          <div className="col-span-1 text-right">—</div>
        </div>

        {entries.map((e) => (
          <div key={e.name} className="grid grid-cols-12 px-4 py-3 border-b last:border-b-0 items-center">
            <div className="col-span-6 truncate">
              {e.type === 'dir' ? '📁' : '📄'}{' '}
              {e.type === 'dir' ? (
                <Link
                  href={`/admin/documents/browse?path=${encodeURIComponent((rel === '/' ? '' : rel) + '/' + e.name)}`}
                  className="text-[#222] hover:underline"
                >
                  {e.name}
                </Link>
              ) : (
                <span>{e.name}</span>
              )}
            </div>
            <div className="col-span-2 text-right text-sm text-gray-600">
              {e.type === 'dir' ? '—' : formatSize(e.size)}
            </div>
            <div className="col-span-3 text-sm text-gray-600">
              {new Date(e.mtime).toLocaleString('fr-BE')}
            </div>
            <div className="col-span-1 text-right">
              {e.type === 'file' && (
                <a
                  className="text-sm font-medium text-[#54b435] hover:underline"
                  href={`/api/download?path=${encodeURIComponent((rel === '/' ? '' : rel) + '/' + e.name)}`}
                >
                  Télécharger
                </a>
              )}
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-600">Dossier vide.</div>
        )}
      </div>

      <div>
        <Link
          href="/admin/documents"
          className="inline-block text-sm font-medium text-[#54b435] hover:underline"
        >
          ← Retour aux dossiers
        </Link>
      </div>
    </div>
  );
}

function formatSize(n: number) {
  if (!n || n <= 0) return '0';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
