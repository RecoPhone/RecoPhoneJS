'use client';

import Link from 'next/link';
import Script from 'next/script';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import {
  Wrench,
  Heart,
  Smartphone,
  Check,
  ArrowRight,
} from 'lucide-react';

/* -------------------------------- EFFECTS ---------------------------------- */
const CARD_HOVER =
  "transition-transform duration-300 will-change-transform hover:-translate-y-1.5 motion-reduce:transform-none";
const CARD_FRAME_HOVER =
  "transition-opacity duration-300 opacity-90 group-hover:opacity-100";
const CARD_PANEL_HOVER =
  "transition-shadow duration-300 group-hover:shadow-2xl group-hover:ring-[#54b435]/20";
const ICON_HOVER =
  "transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3";

/* -------------------------------- Types ---------------------------------- */
type Service = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  highlight?: boolean; 
};

/* ------------------------------ Données ---------------------------------- */
const services: Service[] = [
  {
    eyebrow: 'RÉPARATION EXPRESS',
    title: 'Réparation de smartphone',
    description: 'Écran cassé ou batterie faible ? On répare vite et bien.',
    bullets: [
      'Devis 100% gratuit',
      'Pièces durables, garanties',
      'Selon stock : réparation ~30 minutes',
      'Données préservées',
      'Transparence totale',
    ],
    cta: 'Je répare maintenant',
    href: '/devis',
    icon: Wrench,
    highlight: true,
  },
  {
    eyebrow: 'TRANQUILLITÉ AU QUOTIDIEN',
    title: 'Abonnements sérénité',
    description: 'Entretien, sauvegardes et réductions.',
    bullets: [
      'Jusqu’à -20% sur les réparations',
      'RDV prioritaire le samedi',
      'Conseils & suivi inclus',
      'Sauvegarde mensuelle',
    ],
    cta: 'J’anticipe',
    href: '/abonnements',
    icon: Heart,
  },
  {
    eyebrow: 'SECONDE VIE, VRAI BON PLAN',
    title: 'Nos Reconditionnés',
    description: 'Économisez jusqu’à -60% du neuf.',
    bullets: [
      'Garantie 12 mois',
      'Batterie testée & validée',
      'Stocks renouvelés',
      'Contrôle 30+ points',
    ],
    cta: 'Voir les modèles',
    href: '/re-smartphones',
    icon: Smartphone,
  },
];

/* ----------------------------- Animations -------------------------------- */
const parentVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0 },
};

/* ----------------------------- Utils ------------------------------------- */
function utmize(href: string, campaign: string) {
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}utm_source=recophone&utm_medium=services_section&utm_campaign=${encodeURIComponent(
    campaign
  )}`;
}

/* ---------------------------- Composants --------------------------------- */

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-[#1f2937]">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#54b435]" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/* -------------------------------- View ----------------------------------- */
export default function ServicesSection() {
  const reduceMotion = useReducedMotion();

  // JSON-LD (ItemList de Services) — léger, SEO-friendly
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: services.map((s, i) => ({
      '@type': 'Service',
      position: i + 1,
      name: s.title,
      description: s.description,
      url: `https://www.recophone.be${s.href}`,
      areaServed: 'Namur, Belgique',
      provider: { '@type': 'LocalBusiness', name: 'RecoPhone' },
    })),
  };

  return (
    <section
      id="services"
      className="relative bg-[#edfbe2] py-20"
      aria-labelledby="services-title"
    >
      {/* Soft glow décoratif (très léger) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(600px 200px at 10% 10%, rgba(84,180,53,0.14), transparent 60%), radial-gradient(600px 200px at 90% 30%, rgba(84,180,53,0.10), transparent 60%)',
        }}
      />

      {/* JSON-LD */}
      <Script
        id="services-itemlist"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="relative mx-auto w-full max-w-screen-xl px-4">
        <header className="text-center">
          <h2
            id="services-title"
            className="mb-3 text-2xl sm:text-3xl font-extrabold leading-snug tracking-widest uppercase text-[#222]"
          >
            Nos services éco-responsables
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-xs sm:text-sm text-[#2a2a2a]/80 uppercase tracking-wider">
            Prolongez la vie de vos appareils. Réduisez les déchets électroniques.
          </p>
        </header>

        <motion.ul
          role="list"
          initial={reduceMotion ? undefined : 'hidden'}
          whileInView={reduceMotion ? undefined : 'show'}
          viewport={{ once: true, amount: 0.25 }}
          variants={parentVariants}
          className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-12"
        >
          {services.map(
            (
              { eyebrow, title, description, bullets, cta, href, icon: Icon, highlight },
              _i
            ) => {
              const url = utmize(href, title);
              const CTA_CLASSES =
                'mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#54b435] px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-[#54b435] focus:ring-offset-2 whitespace-nowrap leading-none';

              return (
                <motion.li
                key={title}
                variants={cardVariants}
                className={`${highlight ? 'lg:col-span-6' : 'lg:col-span-3'} ${CARD_HOVER}`}
                >
                <article
                    itemScope
                    itemType="https://schema.org/Service"
                    className="group relative h-full"
                >
                    {/* Cadre dégradé (hover: +opaque) */}
                    <div
                    className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-[#d6f0c4] to-[#eafbe0] ${CARD_FRAME_HOVER}`}
                    />

                    {/* Panneau carte (hover: ombre + ring) */}
                    <div
                    className={`relative flex h-full flex-col rounded-2xl bg-white shadow-xl ring-1 ring-black/5 ${CARD_PANEL_HOVER} ${
                        highlight ? 'min-h-[300px] p-5 md:p-6' : 'min-h-[320px] p-6'
                    }`}
                    >
                    {/* Icone + eyebrow (icone anime au hover carte) */}
                    <div className="mb-3 flex items-center gap-3">
                        <div className={`grid h-11 w-11 place-items-center rounded-xl bg-[#edfbe2] text-[#54b435] ring-1 ring-[#54b435]/15 ${ICON_HOVER}`}>
                        <Icon aria-hidden className="h-6 w-6" />
                        </div>
                        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#2a2a2a]/70">
                        {eyebrow}
                        </p>
                    </div>

                    <h3 itemProp="name" className="mb-2 text-lg sm:text-xl font-semibold leading-snug text-[#222]">
                        {title}
                    </h3>

                    <p itemProp="description" className="mb-4 text-sm leading-relaxed text-gray-700">
                        {description}
                    </p>

                    <ul className="mb-2 space-y-2 text-left">
                        {bullets.map((b) => (
                        <Bullet key={b}>{b}</Bullet>
                        ))}
                    </ul>

                    {/* CTA : une seule ligne + flèche qui glisse au hover du bouton */}
                    <div className="mt-auto pt-2">
                        <Link
                        href={url}
                        className={`${CTA_CLASSES} group`}   // <-- garde CTA_CLASSES + ajoute "group"
                        aria-label={`${cta} — ${title}`}
                        data-gtm="services-cta"
                        data-service={title}
                        >
                        <span className="whitespace-nowrap">{cta}</span>
                        <ArrowRight aria-hidden className="transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                    <meta itemProp="serviceType" content={title} />
                    <link itemProp="url" href={href} />
                    </div>
                </article>
                </motion.li>

              );
            }
          )}
        </motion.ul>
      </div>
    </section>
  );
}
