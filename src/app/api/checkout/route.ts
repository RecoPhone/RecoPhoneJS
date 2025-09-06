// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { PRICE_IDS, type PlanKey } from "@/lib/pricing";

type CartItem = {
  id: string;
  title: string;
  type?: "plan" | "product" | string; // tout sauf "plan" => one-shot
  unitPrice: number; // CENTIMES pour les produits one-shot
  qty: number;
  meta?: Record<string, any>;
};

function isPlan(item: CartItem) {
  return item.type === "plan";
}

function toInt(n: unknown, fallback = 0) {
  const v = Number.parseInt(String(n ?? ""), 10);
  return Number.isFinite(v) ? v : fallback;
}

// Construit une description lisible pour les smartphones (meta.capacity, meta.color, meta.grade)
function productDescription(meta: Record<string, any> | undefined) {
  if (!meta) return "";
  const parts: string[] = [];
  const color = meta.color ? String(meta.color).trim() : "";
  const cap = meta.capacity ? String(meta.capacity).trim() : "";
  let grade = meta.grade ? String(meta.grade).trim() : "";

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
      const planKey = (plan.meta?.planKey ?? "").toString() as PlanKey;
      const priceId = PRICE_IDS[planKey];

      if (!priceId) {
        return NextResponse.json({ error: "Offre inconnue." }, { status: 400 });
      }

      // Validation minimale des modèles d’appareils
      const devices: string[] = Array.isArray(plan.meta?.devices) ? plan.meta.devices : [];
      const devicesCount = Number((plan.meta?.devicesCount ?? devices.length) ?? 0);
      if (!devicesCount || devices.length !== devicesCount) {
        return NextResponse.json({ error: "Modèles d’appareils invalides." }, { status: 400 });
      }

      const customerEmail = plan.meta?.customer?.email || undefined;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        allow_promotion_codes: true,
        automatic_tax: { enabled: true }, // coupe si tu gères la TVA en TTC fixe
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          metadata: {
            planKey,
            devicesCount: String(devicesCount),
            devices: devices.join(" | "),
            customerName: plan.meta?.customer?.name ?? "",
            customerPhone: plan.meta?.customer?.phone ?? "",
          },
        },
      });

      return NextResponse.json({ url: session.url }, { status: 200 });
    }

    // ---------- ONE-SHOT (smartphones / accessoires) (mode: payment)
    // Tout ce qui n’est PAS "plan" est traité comme produit payable une fois
    const line_items = oneShotItems.map((p) => {
      const name = (p.title || "Article RecoPhone").toString().slice(0, 127);
      const description = productDescription(p.meta);
      const unit_amount = Math.max(50, toInt(p.unitPrice)); // minimum 0,50€ pour la sécurité
      const quantity = Math.max(1, toInt(p.qty, 1));

      return {
        price_data: {
          currency: "eur",
          product_data: {
            name,
            ...(description ? { description } : {}),
          },
          unit_amount,
        },
        quantity,
      };
    });

    if (line_items.length === 0) {
      return NextResponse.json({ error: "Aucun article payable trouvé." }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      line_items,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("checkout error", err);
    return NextResponse.json({ error: "Impossible de créer la session de paiement." }, { status: 500 });
  }
}
