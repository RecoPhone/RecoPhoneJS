import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";          // Pas d'Edge: on a besoin du raw body
export const dynamic = "force-dynamic";

// Helper: récupère l'ID de subscription d'une invoice de manière TS-safe
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // 1) Essai direct (certains typings Stripe ne déclarent pas .subscription)
  const direct = (invoice as any)?.subscription;
  if (typeof direct === "string") return direct;

  // 2) Fallback: on cherche sur les lignes (selon les versions/types)
  for (const line of invoice.lines?.data ?? []) {
    const lineSub = (line as any)?.subscription;
    if (typeof lineSub === "string") return lineSub;
  }
  return null;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return new Response("Webhook misconfiguré", { status: 400 });
  }

  // Stripe attend le RAW payload (pas de JSON.parse)
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch (err: any) {
    console.error("❌ Signature invalide:", err.message);
    return new Response(`Signature invalid: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.subscription) {
          const subId = String(session.subscription);
          const subscription = await stripe.subscriptions.retrieve(subId);

          console.log("✅ Subscription created:", {
            subId,
            status: subscription.status,
            metadata: subscription.metadata,
            email: session.customer_details?.email,
          });

          // TODO: persister en base (subId, status, metadata, email client)
        } else {
          // Paiement one-shot
          console.log("✅ Checkout payment completed:", session.id);
          // TODO: persister commande one-shot si nécessaire
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`ℹ️ Subscription ${event.type}:`, {
          id: subscription.id,
          status: subscription.status,
          metadata: subscription.metadata,
        });
        // TODO: sync DB (statut actif/annulé, dates, etc.)
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = getInvoiceSubscriptionId(invoice);
        console.log("💚 Invoice paid:", { id: invoice.id, subId });
        // TODO: marquer paiement OK pour subId en base
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = getInvoiceSubscriptionId(invoice);
        console.warn("❌ Invoice failed:", { id: invoice.id, subId });
        // TODO: marquer paiement KO + relance / email
        break;
      }

      default: {
        // Autres événements non traités
        // console.log(`Unhandled event type ${event.type}`);
        break;
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Webhook handler error", { status: 500 });
  }
}
