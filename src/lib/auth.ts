import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { signAuthJWT, verifyAuthJWT, JWTPayload } from './jwt';

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'rp_session';
const COOKIE_MAX_AGE = Number(process.env.AUTH_COOKIE_MAX_AGE ?? 60 * 60 * 24 * 7);

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} manquant dans .env.local`);
  return v;
}

function readAdminHash(): string {
  const b64 = process.env.ADMIN_PASSWORD_HASH_B64?.trim();
  if (b64 && b64.length > 0) {
    const decoded = Buffer.from(b64, 'base64').toString('utf8').trim();
    // Doit ressembler à un hash bcrypt standard: $2a$/$2b$/$2y$
    if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(decoded)) {
      throw new Error('ADMIN_PASSWORD_HASH_B64 invalide (après décodage, ce n’est pas un hash bcrypt).');
    }
    return decoded;
  }
  const hash = requireEnv('ADMIN_PASSWORD_HASH').trim();
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash)) {
    throw new Error('ADMIN_PASSWORD_HASH invalide (doit être un hash bcrypt).');
  }
  return hash;
}

export async function verifyCredentials(email: string, password: string) {
  const adminEmail = requireEnv('ADMIN_EMAIL');
  const hash = readAdminHash();

  if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) return null;

  const ok = await bcrypt.compare(password, hash);
  if (!ok) return null;

  return { email: adminEmail, name: process.env.ADMIN_NAME ?? 'Admin', role: 'admin' as const };
}

export async function createSession(user: { email: string; name?: string }) {
  const token = await signAuthJWT(
    { sub: user.email, name: user.name, role: 'admin' },
    COOKIE_MAX_AGE
  );
  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function destroySession() {
  cookies().set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<JWTPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyAuthJWT<JWTPayload>(token);
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');
  return user;
}
