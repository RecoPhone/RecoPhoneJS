import { NextResponse } from 'next/server';
import { verifyCredentials, createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ ok: false, error: 'Requête invalide' }, { status: 400 });
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Identifiants invalides' }, { status: 401 });
    }
    
    const res = NextResponse.json({ ok: true });
    await createSession(user); // utilise cookies().set()
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
