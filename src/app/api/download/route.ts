import { NextRequest } from 'next/server';
import { Readable } from 'stream';
import { getSessionUser } from '@/lib/auth';
import { openReadStream } from '@/lib/ftp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function guessContentType(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

export async function GET(req: NextRequest) {
  // Sécurise l’accès
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const rel = searchParams.get('path');
  if (!rel) return new Response('Paramètre "path" manquant', { status: 400 });

  // inline = prévisualisation (PDF dans l’onglet) ; default = attachment (téléchargement)
  const disposition = (searchParams.get('disposition') ?? 'attachment').toLowerCase() === 'inline'
    ? 'inline'
    : 'attachment';

  try {
    const { stream, name, size } = await openReadStream(rel);

    // Node stream -> Web stream si dispo (Node 18+)
    const body =
      (Readable as any).toWeb
        ? (Readable as any).toWeb(stream)
        : (stream as any);

    const headers = new Headers();
    headers.set('Content-Type', guessContentType(name));

    // Content-Disposition robuste (RFC 5987 pour UTF-8)
    const asciiFallback = name.replace(/[^\x20-\x7E]/g, '_'); // fallback safe
    headers.set(
      'Content-Disposition',
      `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(name)}`
    );
    if (size) headers.set('Content-Length', String(size));
    // pas de cache côté navigateur
    headers.set('Cache-Control', 'no-store');

    return new Response(body as any, { headers, status: 200 });
  } catch (e: any) {
    const msg = e?.message ?? 'Erreur téléchargement';
    return new Response(msg, { status: 500 });
  }
}
