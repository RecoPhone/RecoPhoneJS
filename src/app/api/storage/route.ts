import { NextRequest } from 'next/server';
import { Readable } from 'stream';
import { getSessionUser } from '@/lib/auth';
import { openReadStream } from '@/lib/ftp';

export const runtime = 'nodejs';

function guessContentType(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

export async function GET(req: NextRequest) {
  // Protège l'API : admin connecté uniquement
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const rel = searchParams.get('path');
  if (!rel) return new Response('Paramètre "path" manquant', { status: 400 });

  try {
    const { stream, name, size } = await openReadStream(rel);

    const body =
      (Readable as any).toWeb
        ? (Readable as any).toWeb(stream)
        : stream;

    const headers = new Headers();
    headers.set('Content-Type', guessContentType(name));
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(name)}"`);
    if (size) headers.set('Content-Length', String(size));

    return new Response(body as any, { headers, status: 200 });
  } catch (e: any) {
    return new Response(e?.message ?? 'Erreur téléchargement', { status: 500 });
  }
}
