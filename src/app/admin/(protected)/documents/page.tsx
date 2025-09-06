import { listRootFolders } from '@/lib/ftp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DocumentsRootPage() {
  const folders = await listRootFolders();
  const total = folders.length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Documents générés</h1>
        <p className="text-sm text-gray-600">
          {total === 0 ? 'Aucun dossier trouvé.' : `${total} dossier${total>1?'s':''} dans le stockage.`}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {folders.map((f) => (
          <div key={f.name} className="rounded-2xl bg-white p-4 shadow-sm border">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium truncate">{f.name}</div>
              <span className="text-[11px] px-2 py-1 rounded-full bg-[#edfbe2] text-[#222] border">
                {new Date(f.lastActivity).toLocaleString('fr-BE')}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-gray-50 border p-3">
                <div className="text-xs text-gray-500">Fichiers</div>
                <div className="text-lg font-semibold">{f.fileCount}</div>
              </div>
              <div className="rounded-xl bg-gray-50 border p-3">
                <div className="text-xs text-gray-500">Sous-dossiers</div>
                <div className="text-lg font-semibold">{f.subfolderCount}</div>
              </div>
            </div>
            <a
              href={`/admin/documents/browse?path=${encodeURIComponent('/'+f.name)}`}
              className="inline-block mt-3 text-sm font-medium text-[#54b435] hover:underline"
            >
              Ouvrir
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
