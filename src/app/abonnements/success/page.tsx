// src/app/abonnements/success/page.tsx
import { stripe } from "@/lib/stripe";

function formatEUR(cents: number | null | undefined) {
  const v = (cents ?? 0) / 100;
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(v);
}

type Props = { searchParams: { session_id?: string } };

export default async function SuccessPage({ searchParams }: Props) {
  const sessionId = searchParams.session_id;
  if (!sessionId) {
    return (
      <main className="max-w-3xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-[#222]">Session introuvable</h1>
        <p className="text-gray-700 mt-2">Aucune session de paiement n’a été fournie.</p>
      </main>
    );
  }

  // 1) Récupère la session Checkout
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });

  const email =
    session.customer_details?.email ||
    (typeof session.customer === "string" ? "" : (session.customer as any)?.email) ||
    "";

  const isSubscription = Boolean(session.subscription);

  // 2) Si abonnement → on lit la souscription (metadata plan / devices)
  if (isSubscription) {
    const subscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : (session.subscription as any);

    const meta = (subscription?.metadata ?? {}) as Record<string, string | undefined>;
    const planKey = (meta.planKey || "—").toString().toUpperCase();
    const devicesCount = meta.devicesCount || "—";
    const devices = (meta.devices || "")
      .split(" | ")
      .map((s) => s.trim())
      .filter(Boolean);

    return (
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-extrabold text-[#222]">Merci ! 🎉</h1>
        <p className="text-gray-700 mt-2">Votre abonnement a bien été activé.</p>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-[#222]">Récapitulatif abonnement</h2>
          <ul className="mt-4 space-y-1 text-sm text-gray-700">
            <li>
              <span className="font-medium">Email :</span> {email || "—"}
            </li>
            <li>
              <span className="font-medium">Offre :</span> {planKey}
            </li>
            <li>
              <span className="font-medium">Appareils couverts :</span> {devicesCount}
            </li>
          </ul>

          {devices.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-[#222] mb-2">Modèles enregistrés</p>
              <div className="flex flex-wrap gap-2">
                {devices.map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex px-2 py-0.5 rounded-full border border-gray-200 text-gray-700 text-xs"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-6">
            Vous recevrez un email de confirmation. Pour toute question : hello@recophone.be
          </p>
        </section>

        <div className="mt-6">
          <a
            href="/accueil"
            className="inline-flex items-center rounded-xl bg-[#54b435] text-white px-5 py-3 font-semibold hover:opacity-95"
          >
            Retour à l’accueil
          </a>
        </div>
      </main>
    );
  }

  // 3) Sinon → achat one-shot : on liste les articles de la session
  //    (listLineItems est sûr et simple)
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 100,
  });

  // Calcule un total à partir des lignes (au cas où)
  const items = lineItems.data.map((li) => {
    // li.description contient le nom du produit (et parfois la description courte)
    const name = li.description || "Article RecoPhone";
    const qty = li.quantity ?? 1;
    // amount_total dispo sur les line items de Checkout Sessions (fallback: amount_subtotal)
    const lineTotal = (li as any).amount_total ?? (li as any).amount_subtotal ?? 0;
    const unit = Math.round(Number(lineTotal) / Math.max(1, qty));
    return { name, qty, unit, lineTotal };
  });

  const grandTotal = items.reduce((acc, it) => acc + (it.lineTotal ?? 0), 0);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-[#222]">Merci ! 🎉</h1>
      <p className="text-gray-700 mt-2">Votre paiement a bien été confirmé.</p>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-[#222]">Récapitulatif de votre commande</h2>

        {email && (
          <p className="mt-2 text-sm text-gray-700">
            Un reçu sera envoyé à <span className="font-medium">{email}</span>.
          </p>
        )}

        <div className="mt-4 divide-y divide-gray-100">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-start justify-between py-3">
              <div className="pr-4">
                <p className="text-sm font-medium text-[#222]">{it.name}</p>
                <p className="text-xs text-gray-600">Quantité : {it.qty}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-700">{formatEUR(it.unit)} / unité</p>
                <p className="text-sm font-semibold text-[#222]">{formatEUR(it.lineTotal)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="text-gray-700">Total payé</span>
          <span className="text-lg font-extrabold text-[#222]">{formatEUR(grandTotal)}</span>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Besoin d’aide ? hello@recophone.be
        </p>
      </section>

      <div className="mt-6 flex gap-3">
        <a
          href="/"
          className="inline-flex items-center rounded-xl bg-[#54b435] text-white px-5 py-3 font-semibold hover:opacity-95"
        >
          Retour à l’accueil
        </a>
        <a
          href="/panier"
          className="inline-flex items-center rounded-xl bg-gray-100 text-gray-800 px-5 py-3 font-semibold hover:bg-gray-200"
        >
          Retour au panier
        </a>
      </div>
    </main>
  );
}
