"use client";
import { useMemo, useState } from "react";
import Script from "next/script";
import Link from "next/link";

type FAQ = {
  question: string;
  answer: string; // Markdown **gras** autorisé
  cta?: { label: string; href: string }[];
};

const faqs: FAQ[] = [
  {
    question: "Combien de temps dure une réparation chez RecoPhone ?",
    answer:
      "La majorité des réparations sont réalisées en **moins d’une heure** en **atelier**. Si la **pièce** n’est pas dispo, on la commande le jour même — compte **jusqu’à 24 h** supplémentaires. On te tient informé(e) à chaque étape.",
    cta: [{ label: "Demander un devis en 2 min", href: "/devis" }],
  },
  {
    question: "Est-ce que vous faites toujours de l’itinérance ?",
    answer:
      "Oui, service d’**itinérance le samedi**, **sur rendez-vous** et dans des **zones définies** (Namur et alentours).",
    cta: [{ label: "Voir les disponibilités", href: "/devis" }],
  },
  {
    question: "Proposez-vous un service d’envoi postal ?",
    answer:
      "**Non.** Pas d’envoi postal : on privilégie le **contact direct** et une **qualité optimale**, sans risques de transport.",
  },
  {
    question: "Est-ce que mes données sont en sécurité ?",
    answer:
      "**Oui.** Nous n’accédons **jamais** à tes données personnelles. Par précaution, pense à **sauvegarder** ton appareil avant l’intervention.",
  },
  {
    question: "Quelle garantie proposez-vous après réparation ?",
    answer:
      "**1 an** sur les **pièces détachées** (écrans, connecteurs, caméras, etc.) et **6 mois** sur les **batteries**. Sont exclus : **casse**, **chocs**, **oxydation**.",
  },
  {
    question: "Combien ça coûte ?",
    answer:
      "Le **devis est gratuit** et immédiat. Le prix dépend du **modèle** et de la **qualité des pièces** (OEM ou équivalentes A+). On te donne le tarif **avant** toute intervention.",
    cta: [{ label: "Obtenir mon tarif maintenant", href: "/devis" }],
  },
  {
    question: "Quelles marques et modèles réparez-vous ?",
    answer:
      "iPhone, Samsung Galaxy, Google Pixel, Xiaomi, et d’autres. Pour les **anciens modèles**, la dispo des pièces peut varier : on te confirme **rapidement**.",
    cta: [{ label: "Vérifier la prise en charge", href: "/devis" }],
  },
  {
    question: "Comment prendre rendez-vous ?",
    answer:
      "Passe par le **formulaire de devis** : on te propose un **créneau** et on confirme par **SMS ou e-mail**. Tu peux venir en atelier (semaine) ou demander l’itinérance (samedi).",
    cta: [{ label: "Réserver mon créneau", href: "/devis" }],
  },
  {
    question: "Quels moyens de paiement acceptez-vous ?",
    answer:
      "**Bancontact/Payconiq**, **cartes** (débit/crédit) et **espèces**. Facture disponible sur demande.",
  },
  {
    question: "L’étanchéité est-elle conservée après ouverture ?",
    answer:
      "Après une ouverture, l’**étanchéité constructeur n’est plus garantie**. On remplace le **joint** quand c’est pertinent, mais une certification IP **officielle** ne peut pas être maintenue.",
  },
  {
    question: "Ma batterie tient mal : quand faut-il la changer ?",
    answer:
      "Quand l’autonomie chute nettement ou si l’**état de santé** (iOS) descend **sous ~80-85%**. On peut **tester** gratuitement et remplacer en général en **20 à 40 min**.",
    cta: [{ label: "Tester / remplacer ma batterie", href: "/devis" }],
  },
  {
    question: "Et si vous ne parvenez pas à réparer ?",
    answer:
      "Le **diagnostic est gratuit**. **Pas de réparation = pas de frais**. Si une microsoudure ou une pièce rare est nécessaire, on te propose les options **avant** de décider.",
  },
  {
    question: "Vendez-vous des smartphones reconditionnés ?",
    answer:
      "Oui : testés, **garantis 12 mois**, contrôlés sur **30+ points**. Batterie **testée** et modèle **nettoyé/réinitialisé**.",
    cta: [{ label: "Voir les [RE]Smartphones", href: "/re-smartphones" }],
  },
  {
    question: "Y a-t-il des offres d’abonnement ?",
    answer:
      "Oui. Entretien, conseils, sauvegardes et **avantages** (ex. **jusqu’à −20%** sur les réparations selon l’offre).",
    cta: [{ label: "Découvrir les abonnements", href: "/abonnements" }],
  },
];

export default function MiniFAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // JSON-LD (FAQPage) — on retire juste les ** pour le balisage
  const faqJsonLd = useMemo(() => {
    const stripMdBold = (t: string) => t.replace(/\*\*/g, "");
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: stripMdBold(f.answer) },
      })),
    };
  }, []);

  // Rendu du gras Markdown sans innerHTML arbitraire
  const formatAnswer = (answer: string) => {
    const parts = answer.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="text-[#222] font-semibold">
          {part.replace(/\*\*/g, "")}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <section
      className="bg-[#edfbe2] py-16 px-4"
      id="faq"
      itemScope
      itemType="https://schema.org/FAQPage"
    >
      {/* JSON-LD */}
      <Script
        id="faq-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center text-3xl md:text-4xl font-extrabold text-[#222] uppercase tracking-wide">
          Foire aux Questions
        </h2>

        {/* ⬇️ Grid responsive : 1 colonne (mobile) → 2 colonnes (≥md) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {faqs.map((faq, index) => {
            const panelId = `panel-${index}`;
            const buttonId = `button-${index}`;
            const isOpen = openIndex === index;

            return (
              <article
                key={index}
                className="h-full overflow-hidden rounded-xl border border-[#54b435] bg-white"
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <h3 className="m-0">
                  <button
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center gap-3 px-5 md:px-6 py-4 text-left transition-colors duration-300 hover:bg-[#f4fff0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#54b435]"
                  >
                    <span className="font-semibold text-[#222]" itemProp="name">
                      {faq.question}
                    </span>
                    <span className="ml-auto select-none text-xl text-[#54b435]">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                </h3>

                {/* Réponse toujours dans le DOM (indexable) */}
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`${isOpen ? "block" : "hidden"} px-5 md:px-6 pb-4 text-sm md:text-base leading-relaxed text-[#333]`}
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                >
                  <p itemProp="text" className="mb-3">{formatAnswer(faq.answer)}</p>

                  {/* CTAs discrets */}
                  {faq.cta?.length ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {faq.cta.map((c, i) => (
                        <Link
                          key={i}
                          href={c.href}
                          className="inline-flex items-center gap-2 rounded-full border border-[#54b435]/30 bg-[#f6fff1] px-3 py-1.5 text-xs font-semibold text-[#222] transition hover:bg-white hover:border-[#54b435]/60"
                        >
                          <span>{c.label}</span>
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 opacity-70" aria-hidden>
                            <path d="M7 17L17 7M17 7H9M17 7v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        {/* CTA global (fallback si la réponse n'est pas là) */}
        <div className="mt-10 text-center">
          <Link
            href="/devis"
            className="inline-block rounded-xl bg-[#54b435] px-8 py-4 font-semibold uppercase tracking-wide text-white shadow-lg transition duration-300 hover:bg-[#3e8e2f]"
          >
            Demander un devis gratuit
          </Link>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#222]/70">
            <Link href="/abonnements" className="underline underline-offset-2 hover:text-[#222]">
              Abonnements
            </Link>
            <span>•</span>
            <Link href="/re-smartphones" className="underline underline-offset-2 hover:text-[#222]">
              [RE]Smartphones
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
