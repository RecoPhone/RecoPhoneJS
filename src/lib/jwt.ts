import { SignJWT, jwtVerify } from 'jose';

/**
 * Priorité de lecture du secret:
 * 1) AUTH_SECRET_B64 (Base64)
 * 2) AUTH_SECRET_HEX (hex)
 * 3) AUTH_SECRET (utf8)
 * -> Longueur minimale 32 octets (256 bits) recommandée.
 */
function getSecretKey(): Uint8Array {
  const b64 = process.env.AUTH_SECRET_B64?.trim();
  if (b64) {
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 32) {
      throw new Error('AUTH_SECRET_B64 trop court: minimum 32 octets après décodage.');
    }
    return new Uint8Array(buf);
  }

  const hex = process.env.AUTH_SECRET_HEX?.trim();
  if (hex) {
    if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
      throw new Error('AUTH_SECRET_HEX invalide (doit être une chaîne hex valide).');
    }
    const buf = Buffer.from(hex, 'hex');
    if (buf.length < 32) {
      throw new Error('AUTH_SECRET_HEX trop court: minimum 32 octets.');
    }
    return new Uint8Array(buf);
  }

  const utf8 = process.env.AUTH_SECRET?.trim();
  if (!utf8) {
    throw new Error('Aucun secret fourni. Renseigne AUTH_SECRET_B64, AUTH_SECRET_HEX ou AUTH_SECRET.');
  }
  const enc = new TextEncoder().encode(utf8);
  if (enc.length < 32) {
    throw new Error('AUTH_SECRET (utf8) trop court: minimum 32 octets. Utilise B64/HEX de préférence.');
  }
  return enc;
}

const secret = getSecretKey();

export type JWTPayload = { sub: string; name?: string; role: 'admin' };

export async function signAuthJWT(payload: JWTPayload, maxAgeSec: number) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secret);
}

export async function verifyAuthJWT<T = JWTPayload>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as T;
  } catch {
    return null;
  }
}
