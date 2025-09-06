// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { PRICE_IDS, type PlanKey } from "@/lib/pricing";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SafeDict = Record<string, unknown>;

type CartItem = {
  id: string;
  title: string;
  type?: "plan" | "product" | string; // tout sauf "plan" => one-shot
  unitPrice: number; // CENTIMES pour les produits one-shot
  qty: number;
  meta?: SafeDict;
};

function isPlan(item: CartItem) {
  return item.type === "plan";
}

function toInt(n: unknown, fallback = 0) {
  const v = Number.parseInt(String(n ?? ""), 10);
  return Number.isFinite(v) ? v : fallback;
}

function getMetaStr(meta: SafeDict | undefined, key: string): string {
  const v = meta?.[key];
  const s = typeof v === 'string' ? v.trim() : '';
  return s;
}

// Construit une description lisible pour les smartphones (meta.capacity, meta.color, meta.grade)
function productDescription(meta: SafeDict | undefined) {
  if (!meta) return "";
  const parts: string[] = [];
  const color = getMetaStr(meta, 'color');
  const cap = getMetaStr(meta, 'capacity');
  let grade = getMetaStr(meta, 'grade');

  if (color) parts.push(color.charAt(0).toUpperCase() + color.slice(1));
  if (cap) parts.push(cap);
  if (grade) {
    grade = grade.replace(/grade\s*/i, "").toUpperCase();
    if (grade) parts.push(`Grade ${grade}`);
  }
  return parts.join(" • ");
}

export async function POST(req: Request) {
  try {
    const { items } = (await req.json()) as { items: CartItem[] };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 });
    }

    const planItems = items.filter(isPlan);
    const oneShotItems = items.filter((i) => !isPlan(i));

    // Règle simple : pas de mix plan + produits (on gère séparément)
    if (planItems.length > 0 && oneShotItems.length > 0) {
      return NextResponse.json(
        { error: "Veuillez finaliser l’abonnement séparément des articles à l’achat." },
        { status: 400 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const successUrl = `${origin}/abonnements/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/panier`;

    // ---------- ABONNEMENT (mode: subscription)
    if (planItems.length > 0) {
      if (planItems.length > 1) {
        return NextResponse.json({ error: "Un seul abonnement à la fois." }, { status: 400 });
      }

      const plan = planItems[0];
      const planKey = String(plan.meta?.planKey ?? "") as PlanKey;
      const priceId = PRICE_IDS[planKey];

      if (!priceId) {
        return NextResponse.json({ error: "Offre inconnue." }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return NextResponse.json({ url: session.url }, { status: 200 });
    }

    // ---------- ONE SHOT (mode: payment)
    const lineItems = oneShotItems.map((it) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: it.title,
          description: productDescription(it.meta),
        },
        unit_amount: toInt(it.unitPrice, 0),
      },
      quantity: toInt(it.qty, 1),
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
