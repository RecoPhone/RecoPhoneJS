import { Client, AccessOptions, FileInfo } from 'basic-ftp';
import path from 'path';
import { PassThrough } from 'stream';

export type FolderStat = { name: string; fileCount: number; subfolderCount: number; lastActivity: string };
export type Entry = { name: string; type: 'dir' | 'file'; size: number; mtime: string };

const RAW_FTP_HOST = (process.env.FTP_HOST ?? '').trim();
const FTP_HOST = RAW_FTP_HOST.replace(/\.$/, ''); // retire un éventuel '.' final
const FTP_PORT = Number(process.env.FTP_PORT ?? 21);
const FTP_USER = (process.env.FTP_USER ?? '').trim();
const FTP_PASSWORD = process.env.FTP_PASSWORD ?? '';
const FTP_SECURE = String(process.env.FTP_SECURE ?? 'true').toLowerCase() === 'true';
const FTP_TLS_SERVERNAME = (process.env.FTP_TLS_SERVERNAME ?? '').trim() || undefined;
const FTP_TLS_INSECURE = String(process.env.FTP_TLS_INSECURE ?? 'false').toLowerCase() === 'true';

// IMPORTANT: si ton compte est chrooté sur recophone_storage, mets "/" ou "." ici
const RAW_BASE = (process.env.FTP_BASE_DIR ?? '/').trim();
const FTP_BASE_DIR = RAW_BASE === '.' ? '/' : RAW_BASE; // normalise
// Pas de trailing slash
const BASE_DIR_NORM = FTP_BASE_DIR.replace(/\/+$/, '') || '/';

if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
  throw new Error('FTP_HOST, FTP_USER et FTP_PASSWORD sont requis dans .env.local');
}

function isDir(it: any): boolean {
  if (!it) return false;
  if (typeof it.isDirectory === 'boolean') return it.isDirectory;
  if (typeof it.type === 'string') {
    const t = it.type.toLowerCase();
    return t === 'd' || t === 'dir' || t === 'directory';
  }
  return false;
}

function mtimeMs(it: any): number {
  const d: Date | undefined = it.modifiedAt ?? it.date;
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
}
const toISO = (ms: number) => new Date(ms || Date.now()).toISOString();

/** Construit un chemin relatif à la base courante */
function joinRel(rel: string) {
  const cleaned = ('/' + (rel || '/')).replace(/\/+/g, '/');
  return cleaned === '/' ? '.' : cleaned.slice(1); // './' racine -> ".", '/foo' -> 'foo'
}

async function getClient() {
  const client = new Client(15000);
  const access: AccessOptions = {
    host: FTP_HOST,
    port: FTP_PORT,
    user: FTP_USER,
    password: FTP_PASSWORD,
    secure: FTP_SECURE,
    secureOptions: FTP_TLS_INSECURE
      ? { rejectUnauthorized: false }
      : FTP_TLS_SERVERNAME
      ? { servername: FTP_TLS_SERVERNAME }
      : undefined,
  };
  await client.access(access);

  // Tente de se placer dans la base demandée
  // Si l'user est chrooté à cette base, 'cd BASE' échouera -> on reste en "."
  if (BASE_DIR_NORM !== '/' && BASE_DIR_NORM !== '.') {
    try {
      await client.cd(BASE_DIR_NORM);
    } catch {
      // probable chroot : on ignore et on reste en "."
    }
  }
  return client;
}

/** Dossiers racine (dans la base) */
export async function listRootFolders(): Promise<FolderStat[]> {
  const client = await getClient();
  try {
    const rootItems: FileInfo[] = await client.list('.'); // on liste depuis la base courante
    const folders = rootItems.filter((it) => isDir(it));

    const MAX_CONC = 5;
    const out: FolderStat[] = [];
    let i = 0;

    const worker = async () => {
      while (i < folders.length) {
        const f = folders[i++];
        const absRel = f.name; // chemin relatif depuis la base
        try {
          const childs: FileInfo[] = await client.list(absRel);
          let fileCount = 0, subfolderCount = 0, last = 0;
          for (const c of childs) {
            if (isDir(c)) subfolderCount++;
            else fileCount++;
            const m = mtimeMs(c);
            if (m > last) last = m;
          }
          out.push({ name: f.name, fileCount, subfolderCount, lastActivity: toISO(last || mtimeMs(f)) });
        } catch {
          out.push({ name: f.name, fileCount: 0, subfolderCount: 0, lastActivity: toISO(mtimeMs(f)) });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_CONC, folders.length) }, () => worker()));
    out.sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1));
    return out;
  } finally {
    client.close();
  }
}

/** Liste un chemin relatif à la base (ex: '/', '/DOSSIER', '/DOSSIER/sous') */
export async function listPath(relPath: string = '/'): Promise<Entry[]> {
  const client = await getClient();
  try {
    const rel = joinRel(relPath);
    const items: FileInfo[] = await client.list(rel);
    const mapped: Entry[] = items.map((it) => ({
      name: it.name,
      type: isDir(it) ? 'dir' : 'file',
      size: Number((it as any).size ?? 0),
      mtime: toISO(mtimeMs(it)),
    }));
    mapped.sort((a, b) => (a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name, 'fr')));
    return mapped;
  } finally {
    client.close();
  }
}

/** Téléchargement streaming (pas de tmp) — relFilePath : '/DOSSIER/fichier.pdf' */
export async function openReadStream(relFilePath: string) {
  const client = await getClient();
  const rel = joinRel(relFilePath);
  const name = path.posix.basename(rel);
  let size: number | undefined;
  try { size = await client.size(rel); } catch {}
  const pass = new PassThrough();
  client.downloadTo(pass, rel)
    .then(() => client.close())
    .catch(err => { pass.destroy(err); client.close(); });
  return { stream: pass, name, size };
}
