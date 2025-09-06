"use client";

import { useMemo, useState } from "react";
import { CheckCircle, Star, X } from "lucide-react";
import { motion } from "framer-motion";

import { useCart } from "@/components/CartProvider";
import type { CartItem } from "@/components/CartProvider";

type PlanKey = "essentiel" | "familial" | "zen";
type Plan = {
  key: PlanKey;
  title: string;
  subtitle: string;
  price: number;      // EUR / mois (TVAC)
  devices: number;    // nb d'appareils couverts
  popular?: boolean;
  features: string[];
  cta: string;
};

const plans: Plan[] = [
  {
    key: "essentiel",
    title: "Essentiel",
    subtitle: "1 smartphone protégé",
    price: 14.99,
    devices: 1,
    features: [
      "Sauvegarde mensuelle *",
      "Nettoyage annuel inclus",
      "10% de réduction sur réparations",
      "2 remplacements de verre *",
      "Diagnostic gratuit illimité",
      "Assistance sous 48h",
      "Premier mois gratuit *",
    ],
    cta: "Choisir Essentiel",
  },
  {
    key: "familial",
    title: "Familial",
    subtitle: "3 smartphones protégés",
    price: 29.99,
    devices: 3,
    popular: true,
    features: [
      "Sauvegarde mensuelle *",
      "Nettoyage annuel *",
      "15% de réduction sur réparations",
      "2 remplacements de verre *",
      "Diagnostic gratuit illimité",
      "Assistance sous 48h",
      "Premier mois gratuit *",
    ],
    cta: "Choisir Familial",
  },
  {
    key: "zen",
    title: "Zen",
    subtitle: "5 smartphones protégés",
    price: 34.99,
    devices: 5,
    features: [
      "Sauvegarde mensuelle *",
      "Nettoyage annuel premium *",
      "20% de réduction sur réparations",
      "3 remplacements de verre *",
      "Diagnostic gratuit illimité",
      "Intervention rapide sous 24h",
      "Premier mois gratuit *",
    ],
    cta: "Choisir Zen",
  },
];

function eur(amount: number) {
  return amount.toLocaleString("fr-BE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type LeadState = {
  open: boolean;
  plan: Plan | null;
  name: string;
  email: string;
  phone: string;
  deviceModels: string[];
  error?: string;
};

export default function PlansSection() {
  const { addItem } = useCart(); // ← depuis ton CartProvider.tsx

  const [lead, setLead] = useState<LeadState>({
    open: false,
    plan: null,
    name: "",
    email: "",
    phone: "",
    deviceModels: [],
    error: undefined,
  });

  function openLead(plan: Plan) {
    setLead({
      open: true,
      plan,
      name: "",
      email: "",
      phone: "",
      deviceModels: Array.from({ length: plan.devices }, () => ""),
      error: undefined,
    });
  }

  function closeLead() {
    setLead({
      open: false,
      plan: null,
      name: "",
      email: "",
      phone: "",
      deviceModels: [],
      error: undefined,
    });
  }

  function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!lead.plan) return;

    if (!lead.name || !lead.email) {
      setLead((s) => ({ ...s, error: "Merci d’indiquer au minimum votre nom et votre email." }));
      return;
    }
    if (lead.deviceModels.some((m) => !m.trim())) {
      setLead((s) => ({ ...s, error: "Merci d'indiquer tous les modèles d'appareils." }));
      return;
    }

    // CartItem attendu par ton CartProvider:
    // { id, title, type, unitPrice (centimes), qty, image?, meta? }  :contentReference[oaicite:1]{index=1}
    const id = `plan-${lead.plan.key}-${Date.now()}`;
    const unitPrice = Math.round(lead.plan.price * 100); // EUR -> cents (pour éviter les flottants)

    const cartItem: CartItem = {
      id,
      title: `Abonnement ${lead.plan.title}`,
      type: "plan",
      unitPrice,
      qty: 1,
      meta: {
        planKey: lead.plan.key,
        devicesCount: lead.plan.devices,
        devices: lead.deviceModels,
        priceMonthlyEUR: lead.plan.price,
        customer: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone || "",
        },
      } as Record<string, unknown>,
    };

    addItem(cartItem);
    closeLead();
    // Option: rediriger vers le panier
    // const router = useRouter(); router.push("/panier");
  }

  const heading = useMemo(
    () => (
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-bold text-[#222] uppercase mb-12"
      >
        Choisissez la formule qui vous correspond
      </motion.h2>
    ),
    []
  );

  return (
    <section id="plans" className="py-20 px-4 bg-[#edfbe2]">
      <div className="max-w-7xl mx-auto text-center">
        {heading}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <motion.article
              key={plan.key}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="relative rounded-3xl p-8 bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-left"
              aria-labelledby={`${plan.key}-title`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#edfbe2] text-[#222] border border-[#54b435]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    <Star className="w-3.5 h-3.5" /> Le plus populaire
                  </span>
                </div>
              )}

              <h3 id={`${plan.key}-title`} className="text-2xl font-bold text-center text-[#54b435] uppercase">
                {plan.title}
              </h3>
              <p className="text-sm text-center text-gray-600 mt-1 mb-6">{plan.subtitle}</p>

              <div className="text-center text-[#222] mb-6">
                <span className="text-5xl font-extrabold leading-none">{eur(plan.price).replace("€", "")}</span>
                <div className="text-sm mt-1 text-gray-600">€ / mois</div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start text-sm text-gray-700">
                    <CheckCircle className="mr-2 w-5 h-5 shrink-0 text-[#54b435]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openLead(plan)}
                  className="w-full rounded-xl bg-[#54b435] hover:bg-[#46962d] text-white font-semibold py-3 px-6 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#54b435] focus-visible:ring-offset-2"
                >
                  {plan.cta}
                </motion.button>
              </div>
            </motion.article>
          ))}
        </div>

        <p className="mt-8 text-xs text-gray-600">
          * Détails et conditions disponibles dans nos CGV. Certaines prestations nécessitent une prise de rendez-vous.
        </p>
      </div>

      {/* Modal */}
      {lead.open && (
        <div aria-modal="true" role="dialog" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeLead} />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="relative w-full sm:max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mx-4"
          >
            <button
              type="button"
              onClick={closeLead}
              aria-label="Fermer"
              className="absolute top-2 right-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <header className="mb-4 pr-10">
              <h4 className="text-xl font-bold text-[#222]">
                Abonnement {lead.plan?.title}
              </h4>
              <p className="text-sm text-gray-600">
                {lead.plan?.devices} appareil{lead.plan && lead.plan.devices > 1 ? "s" : ""} à couvrir.
              </p>
            </header>

            <form onSubmit={submitLead} className="space-y-4">
              {lead.error && (
                <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{lead.error}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#222] mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={lead.name}
                    onChange={(e) => setLead((s) => ({ ...s, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#54b435]"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#222] mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={lead.email}
                    onChange={(e) => setLead((s) => ({ ...s, email: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#54b435]"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#222] mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={lead.phone}
                  onChange={(e) => setLead((s) => ({ ...s, phone: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#54b435]"
                  autoComplete="tel"
                />
              </div>

              {/* Modèles d'appareils */}
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-sm font-medium text-[#222] mb-2">
                  Modèles d’appareils à couvrir ({lead.plan?.devices})
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lead.deviceModels.map((model, i) => (
                    <div key={i}>
                      <label className="block text-xs text-gray-600 mb-1">
                        Modèle {i + 1} *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="ex. iPhone 13 • Galaxy S21 • Redmi Note 11"
                        value={model}
                        onChange={(e) => {
                          const next = [...lead.deviceModels];
                          next[i] = e.target.value;
                          setLead((s) => ({ ...s, deviceModels: next }));
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#54b435]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeLead}
                  className="rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#54b435] hover:bg-[#46962d] text-white font-semibold px-5 py-2.5"
                >
                  Ajouter au panier
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </section>
  );
}
