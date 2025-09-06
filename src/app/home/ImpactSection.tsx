'use client';

import React, { useEffect, useRef, useState } from 'react';

/* Hook "in-view" maison (1 seul déclenchement) */
function useInViewOnce(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
            break;
          }
        }
      },
      options ?? { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, options]);

  return { ref, inView };
}

/* Réglages */
const DRIVE_SECONDS = 16;               // vitesse du loop
const FINISH_EARLY_MS = 2500;           // avance de fin des compteurs
const COUNTER_MS = DRIVE_SECONDS * 1000 - FINISH_EARLY_MS;

const CO2_MAX = 80;                     // kg
const KM_MAX = 400;                     // km
const CO2_DECIMALS = 1;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/* Formatters (évite de recréer Intl à chaque render) */
const nf0 = new Intl.NumberFormat('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('fr-BE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt0 = (n: number) => nf0.format(n);
const fmt1 = (n: number) => nf1.format(n);

/* SVG voiture (hatchback RecoPhone) — roues animées CSS + fallback SMIL */
/* ---- CarSVG fixé (pivot parfait) ---- */
const CarSVG: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 160 74" width="160" height="74" aria-hidden className={className}>
    <defs>
      <linearGradient id="car-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#66ce44" />
        <stop offset="65%" stopColor="#54b435" />
        <stop offset="100%" stopColor="#3f8e2c" />
      </linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#cfe3f5" stopOpacity="0.85" />
      </linearGradient>
    </defs>

    {/* Ombre */}
    <ellipse cx="80" cy="62" rx="54" ry="6" fill="#000" opacity="0.18" />

    {/* Carrosserie */}
    <g>
      <path
        d="M14 48 L26 36 C32 30 40 26 55 25 L98 25 C108 25 118 28 128 36 L146 48 C150 50 152 52 152 55 C152 58 150 60 147 60 L22 60 C17 60 12 58 12 54 C12 52 12 50 14 48 Z"
        fill="url(#car-body)"
      />
      <path d="M44 29 C56 18 88 16 110 29 L126 40 L36 40 L44 29 Z" fill="url(#glass)" opacity="0.95" />
      <path d="M24 48 C30 42 38 38 54 37 L100 37 C112 37 124 42 134 48" fill="none" stroke="#2a6a1f" strokeWidth="2" opacity="0.45" />
      <rect x="88" y="44" width="12" height="3" rx="1.5" fill="#1f2937" opacity="0.7" />
      <rect x="138" y="49" width="8" height="4" rx="2" fill="#ffe08a" />
      <rect x="16" y="49" width="6" height="4" rx="2" fill="#ef4444" />
      <path d="M22 46 C30 38 46 32 72 30 C92 29 116 30 134 34" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>

    {/* Roue AVANT — on dessine autour de (0,0) puis on place la roue en (120,60) */}
    <g transform="translate(120 60)">
      <g className="wheel" style={{ animation: "none" }}>
        <circle cx="0" cy="0" r="9.5" fill="#111" />
        <circle cx="0" cy="0" r="4.5" fill="#d1d5db" />
        <path d="M0 -9 L0 -4 M0 4 L0 9 M-9 0 L-4 0 M4 0 L9 0" stroke="#9ca3af" strokeWidth="1.5" />
        {/* Rotation garantie autour du centre exact (0,0) */}
        <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="0.8s" repeatCount="indefinite" />
      </g>
    </g>

    {/* Roue ARRIÈRE — idem, placée en (48,60) */}
    <g transform="translate(48 60)">
      <g className="wheel" style={{ animation: "none" }}>
        <circle cx="0" cy="0" r="9.5" fill="#111" />
        <circle cx="0" cy="0" r="4.5" fill="#d1d5db" />
        <path d="M0 -9 L0 -4 M0 4 L0 9 M-9 0 L-4 0 M4 0 L9 0" stroke="#9ca3af" strokeWidth="1.5" />
        <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="0.8s" repeatCount="indefinite" />
      </g>
    </g>
  </svg>
);


const ImpactSection: React.FC = () => {
  const { ref, inView } = useInViewOnce({ threshold: 0.25 });

  const [co2, setCo2] = useState(0);
  const [km, setKm] = useState(0);
  const startedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0); // throttle ~30fps

  // Compteurs (1 seule fois, finissent avant fin du 1er passage)
  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setCo2(CO2_MAX);
      setKm(KM_MAX);
      return;
    }

    const start = performance.now();
    const loop = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / COUNTER_MS);
      const p = easeOutCubic(t);

      // throttle pour limiter les renders
      if (now - lastRef.current > 33 || t >= 1) {
        setCo2(Number((CO2_MAX * p).toFixed(CO2_DECIMALS)));
        setKm(Math.round(KM_MAX * p));
        lastRef.current = now;
      }

      if (t < 1) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [inView]);

  // Variable CSS pour la durée de boucle
  const driveStyle: React.CSSProperties = { ['--drive-seconds' as any]: `${DRIVE_SECONDS}s` };

  return (
    <section ref={ref} className="relative bg-[#edfbe2] py-24 text-[#222] overflow-hidden">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
        {/* Titre */}
        <header className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold uppercase mb-4">RÉPARER, C’EST AGIR</h2>
          <p className="text-sm md:text-base font-medium text-[#333] uppercase tracking-wider max-w-xl mx-auto leading-snug">
            PRODUIRE UN SMARTPHONE GÉNÈRE ENTRE 60 ET 100 KG DE CO₂
          </p>
        </header>

        {/* Bloc principal */}
        <div className="bg-white shadow-xl rounded-2xl p-8 md:p-12 lg:p-14 relative overflow-hidden border-l-[12px] border-[#54b435]">
          {/* Stats (sémantique <dl>) */}
          <dl className="grid md:grid-cols-2 gap-8 text-center">
            <div className="bg-[#f3fdf0] p-6 rounded-xl shadow-md">
              <dt className="text-sm font-semibold text-[#222]/60 uppercase mb-2">ÉMISSIONS ÉVITÉES</dt>
              <dd className="text-5xl font-extrabold text-[#54b435]" aria-live="polite" aria-atomic="true">
                {fmt1(co2)} <span className="text-xl text-[#222]">kg CO₂</span>
              </dd>
            </div>

            <div className="bg-[#f3fdf0] p-6 rounded-xl shadow-md">
              <dt className="text-sm font-semibold text-[#222]/60 uppercase mb-2">DISTANCE ÉQUIVALENTE</dt>
              <dd className="text-5xl font-extrabold text-[#54b435]" aria-live="polite" aria-atomic="true">
                {fmt0(km)} <span className="text-xl text-[#222]">km</span>
              </dd>
              <p className="text-sm text-[#222]/60 mt-1">Soit environ <strong>Bruxelles → Strasbourg</strong></p>
            </div>
          </dl>

          {/* Route + voiture */}
          <div className="-mx-4 sm:-mx-6 lg:-mx-10 xl:-mx-16 mt-10">
            <div className="relative w-full h-16 sm:h-20 md:h-28 lg:h-36 overflow-hidden">
              {/* trait de route */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-neutral-300" aria-hidden="true" />
              {/* pointillés subtils qui défilent */}
              <div
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] opacity-60 dashed-line"
                style={driveStyle}
                aria-hidden="true"
              />

              {/* wrapper qui se déplace en X */}
              <div className="absolute inset-0 drive-loop motion-reduce:animate-none" style={driveStyle} aria-hidden="true">
                {/* bosses + flottement + centrage vertical */}
                <div className="absolute top-1/2 car-bumps">
                  <div className="car-float">
                    <CarSVG className="w-28 sm:w-32 md:w-36 lg:w-44 wheel-spin" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Intertitre */}
        <div className="text-center max-w-3xl mx-auto mt-20 mb-10 px-4">
          <p className="text-2xl md:text-3xl font-extrabold text-[#222] uppercase tracking-wider">MAIS AUSSI ...</p>
        </div>

        {/* Cartes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {[
            { icon: '✈️', text: '1H DE VOL EN AVION ÉVITÉE' },
            { icon: '💡', text: '1 MOIS D’ÉLECTRICITÉ NON CONSOMMÉ' },
            { icon: '🍔', text: '33 BURGERS AU BŒUF' },
            { icon: '🏭', text: '2 JOURS D’ÉMISSIONS INDUSTRIELLES' },
          ].map((item, idx) => (
            <article
              key={idx}
              className={[
                'group bg-white px-6 py-8 rounded-2xl border-l-4 border-[#54b435]',
                'shadow-md transform-gpu transition-all duration-500',
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
                'hover:-translate-y-1 hover:shadow-xl',
              ].join(' ')}
              style={{ transitionDelay: `${idx * 120}ms` }}
            >
              <div className="text-5xl mb-4 will-change-transform" aria-hidden="true">
                <span className="inline-block transition-transform duration-300 group-hover:-translate-y-1 group-hover:-rotate-6">
                  {item.icon}
                </span>
              </div>
              <p className="text-sm md:text-base text-[#222] font-semibold uppercase tracking-wide leading-snug">
                {item.text}
              </p>
            </article>
          ))}
        </div>

        {/* Accroche + CTA */}
        <p className="text-sm md:text-base text-[#222] text-center font-medium uppercase tracking-wide mt-16 mb-6 opacity-0 animate-fadeIn motion-reduce:animate-none">
          VOUS POUVEZ FAIRE LA DIFFÉRENCE EN QUELQUES CLICS
        </p>
        <div className="flex justify-center">
          <a
            href="/devis"
            className="px-8 py-4 bg-[#54b435] hover:bg-[#3e8e2f] text-white font-semibold text-lg rounded-xl transition-colors duration-300 shadow-lg"
          >
            JE RÉPARE MON SMARTPHONE
          </a>
        </div>

        {/* Sources */}
        <footer className="mt-14" aria-label="Sources sur l’impact environnemental">
        <div className="mx-auto max-w-4xl text-center">
            <p className="flex items-center justify-center gap-3 text-xs font-bold tracking-widest uppercase text-[#222]/70">
            <span className="h-px w-10 bg-[#54b435]/40" />
            Sources
            <span className="h-px w-10 bg-[#54b435]/40" />
            </p>

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <li>
                <a
                href="https://impactco2.fr/outils/numerique/smartphone"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#f6fff1] border border-[#54b435]/20 text-sm text-[#222] hover:bg-white hover:shadow-sm hover:border-[#54b435]/40 transition"
                >
                <span className="font-medium">ADEME / ARCEP</span>
                <span className="hidden sm:inline text-[#222]/60">— Empreinte smartphone (~86 kg CO₂e)</span>
                <svg viewBox="0 0 24 24" className="size-3.5 opacity-60 transition group-hover:translate-x-0.5" aria-hidden>
                    <path d="M7 17L17 7M17 7H9M17 7v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                </a>
            </li>

            <li>
                <a
                href="https://www.fairphone.com/wp-content/uploads/2024/09/Fairphone5_LCA_Report_2024.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#f6fff1] border border-[#54b435]/20 text-sm text-[#222] hover:bg-white hover:shadow-sm hover:border-[#54b435]/40 transition"
                >
                <span className="font-medium">Fairphone 5 — LCA</span>
                <span className="hidden sm:inline text-[#222]/60">— 42,1 kg CO₂e total</span>
                <svg viewBox="0 0 24 24" className="size-3.5 opacity-60 transition group-hover:translate-x-0.5" aria-hidden>
                    <path d="M7 17L17 7M17 7H9M17 7v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                </a>
            </li>

            <li>
                <a
                href="https://www.recommerce-group.com/about-us/sustainable-committment"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#f6fff1] border border-[#54b435]/20 text-sm text-[#222] hover:bg-white hover:shadow-sm hover:border-[#54b435]/40 transition"
                >
                <span className="font-medium">Recommerce</span>
                <span className="hidden sm:inline text-[#222]/60">— ~50 kg CO₂ évités / reconditionné</span>
                <svg viewBox="0 0 24 24" className="size-3.5 opacity-60 transition group-hover:translate-x-0.5" aria-hidden>
                    <path d="M7 17L17 7M17 7H9M17 7v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                </a>
            </li>

            <li>
                <a
                href="https://blog.recommerce.com/green-circle/economie-circulaire/impact-reconditionne/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#f6fff1] border border-[#54b435]/20 text-sm text-[#222] hover:bg-white hover:shadow-sm hover:border-[#54b435]/40 transition"
                >
                <span className="font-medium">Recommerce (détails)</span>
                <span className="hidden sm:inline text-[#222]/60">— 77–91% de réduction</span>
                <svg viewBox="0 0 24 24" className="size-3.5 opacity-60 transition group-hover:translate-x-0.5" aria-hidden>
                    <path d="M7 17L17 7M17 7H9M17 7v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                </a>
            </li>

            <li>
                <a
                href="https://globalcarbonatlas.org/emissions/carbon-emissions/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#f6fff1] border border-[#54b435]/20 text-sm text-[#222] hover:bg-white hover:shadow-sm hover:border-[#54b435]/40 transition"
                >
                <span className="font-medium">Global Carbon Atlas</span>
                <span className="hidden sm:inline text-[#222]/60">— Contexte mondial CO₂</span>
                <svg viewBox="0 0 24 24" className="size-3.5 opacity-60 transition group-hover:translate-x-0.5" aria-hidden>
                    <path d="M7 17L17 7M17 7H9M17 7v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                </a>
            </li>
            </ul>
        </div>
        </footer>

      </div>

      {/* Animations locales (styled-jsx) */}
        <style jsx global>{`
        /* Animations (inchangé) */
        @keyframes driveLoop {
            from { transform: translateX(-20vw); }
            to   { transform: translateX(120vw); }
        }
        .drive-loop { animation: driveLoop var(--drive-seconds, 16s) linear infinite; will-change: transform; }

        @keyframes floatSlight { 0%,100% { transform: translateY(-58%);} 50% { transform: translateY(calc(-58% - 2px)); } }
        .car-float { animation: floatSlight 1.6s ease-in-out infinite; }

        @keyframes wheelSpin { to { transform: rotate(360deg); } }
        .wheel-spin .wheel { transform-origin: center; transform-box: fill-box; animation: wheelSpin 0.8s linear infinite; }

        @keyframes fadeIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }
        .animate-fadeIn { animation: fadeIn 600ms ease-out 200ms both; }

        @media (prefers-reduced-motion: reduce) {
            .drive-loop, .car-float, .wheel-spin .wheel, .animate-fadeIn { animation: none !important; }
        }
        .wheel-spin .wheel { animation: none !important; }
        `}</style>
    </section>
  );
};

export default ImpactSection;
