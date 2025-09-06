'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Calendar, Rocket, Wrench, Building2 } from 'lucide-react';

type Step = {
  id: string;
  year: string;
  title: string;
  text: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const STEPS: Step[] = [
  { id: 'avant-2020', year: 'Avant 2020', title: 'Les bases', text: 'Expérience terrain en boutique spécialisée. Le goût du travail bien fait et de la pédagogie client.', icon: Building2 },
  { id: '2020',       year: '2020',       title: 'Le déclic', text: 'La fermeture de l’enseigne suite au Covid confirme une conviction : réparer et reconditionner, c’est essentiel.', icon: Calendar },
  { id: '2021-2024',  year: '2021–2024',  title: 'Atelier à domicile', text: 'Premiers clients, bouche-à-oreille et process qualité qui se rodent à Marchienne.', icon: Wrench },
  { id: 'aout-2025',  year: 'Août 2025',  title: 'Passage à temps plein', text: 'RecoPhone s’installe à Jemeppe-sur-Sambre pour servir davantage et plus vite.', icon: Rocket },
];

export default function TimelineSection() {
  const [activeId, setActiveId] = useState<string>(STEPS[0].id);
  const nodesRef = useRef<(HTMLLIElement | null)[]>([]);      // ✅ TS-safe
  const listRef = useRef<HTMLUListElement | null>(null);      // nav horizontale (années)

  /* -------- Scroll-spy : surbrillance de l’année courante -------- */
  useEffect(() => {
    const nodes = nodesRef.current.filter(Boolean) as HTMLLIElement[];
    if (!nodes.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      { rootMargin: '-20% 0px -50% 0px', threshold: [0.15, 0.3, 0.6] }
    );
    nodes.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* -------- Recentre la pastille active dans la nav -------- */
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const link = list.querySelector<HTMLAnchorElement>(`a[href="#${activeId}"]`);
    if (!link) return;

    const l = list.getBoundingClientRect();
    const b = link.getBoundingClientRect();

    // Si la pastille est collée aux bords, on recentre SANS smooth
    const margin = 8;
    const outOnLeft  = b.left  < l.left  + margin;
    const outOnRight = b.right > l.right - margin;

    if (outOnLeft || outOnRight) {
      const targetLeft = link.offsetLeft - (list.clientWidth - link.clientWidth) / 2;
      list.scrollTo({ left: Math.max(0, targetLeft), behavior: 'auto' });
    }
  }, [activeId]);

  return (
    <section id="frise" className="bg-[#edfbe2] py-16 md:py-24">
      <div className="mx-auto max-w-screen-xl px-4 md:px-10 xl:px-16">
        {/* Titre */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold leading-tight text-[#222]">
            Une trajectoire simple et claire
          </h2>
          <p className="mt-2 text-sm text-[#222]/70 uppercase tracking-wider">
            Du déclic en 2020 au passage à temps plein en 2025.
          </p>
        </div>

        {/* Nav années (responsive + snap + edge fade) */}
        <nav
          aria-label="Navigation par années"
          className="sticky top-16 z-10 -mx-4 mb-10 bg-[#edfbe2]/85 backdrop-blur px-4 py-2"
        >
          <div className="relative">
            {/* Edge fades (mobile) */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#edfbe2] to-transparent md:hidden" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#edfbe2] to-transparent md:hidden" />

            <ul
              ref={listRef}
          className="
            flex gap-1.5 sm:gap-2
            overflow-x-auto
            snap-x snap-mandatory scroll-px-4 px-1
            [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden
            justify-start md:justify-start
            "
            >
              {STEPS.map((s) => (
                <li key={s.id} className="snap-start">
                  <a
                    href={`#${s.id}`}
                    aria-current={activeId === s.id ? 'page' : undefined}
                    className={[
                      'inline-flex items-center gap-2 rounded-full border transition whitespace-nowrap',
                      'px-2.5 py-1.5 text-xs',
                      'sm:px-3 sm:py-1.5 sm:text-sm',
                      'md:px-3.5 md:py-1.5',
                      activeId === s.id
                        ? 'border-[#54b435] bg-white text-[#222] shadow-sm'
                        : 'border-[#54b435]/30 bg-[#f6fff1] text-[#222]/80 hover:border-[#54b435]/60',
                    ].join(' ')}
                  >
                    <span className="font-semibold">{s.year}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Rail + étapes alternées */}
        <div className="relative">
          {/* rail central (desktop) */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gray-300 md:block"
          />

          <ol className="space-y-10 md:space-y-16">
            {STEPS.map((s, idx) => {
              const Icon = s.icon ?? Calendar;
              const isLeft = idx % 2 === 0; // alternance ≥ md

              return (
                <li
                  key={s.id}
                  id={s.id}
                  ref={(el) => { nodesRef.current[idx] = el; }} // ✅ ne retourne rien (TS OK)
                  className="relative scroll-mt-24"
                >
                  {/* pastille centrale (desktop) */}
                  <span
                    aria-hidden
                    className="absolute left-1/2 top-2 hidden h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#54b435] ring-4 ring-[#edfbe2] md:block"
                  />

                  {/* Mobile: tout à gauche. Desktop: gauche/droite */}
                  <div className={`md:flex ${isLeft ? 'md:justify-start' : 'md:justify-end'}`}>
                    <article
                      className={[
                        'rounded-2xl border border-black/5 bg-white p-5 md:p-6 shadow-sm transition',
                        'w-full md:w-[calc(50%-24px)]',     // largeur contrôlée pour ne pas chevaucher le rail
                        isLeft ? 'md:mr-6' : 'md:ml-6',     // petit gutter côté rail
                        'motion-safe:opacity-0 motion-safe:animate-[fadeUp_.6s_ease-out_forwards]',
                      ].join(' ')}
                    >
                      <header className="mb-2 flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#edfbe2] text-[#54b435] ring-1 ring-[#54b435]/15">
                          <Icon aria-hidden className="h-5 w-5" />
                        </div>
                        <div>
                          <time className="block text-xs font-semibold uppercase tracking-wider text-[#54b435]">
                            {s.year}
                          </time>
                          <h3 className="text-lg md:text-xl font-semibold text-[#111]">{s.title}</h3>
                        </div>
                      </header>

                      <p className="text-gray-700">{s.text}</p>

                      {/* CTA discret uniquement sur la dernière étape */}
                      {idx === STEPS.length - 1 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href="/devis"
                            className="inline-flex items-center gap-2 rounded-xl bg-[#54b435] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3e8e2f] transition"
                          >
                            Demander un devis
                          </Link>
                          <Link
                            href="/re-smartphones"
                            className="inline-flex items-center gap-2 rounded-xl border border-[#54b435]/30 bg-white px-4 py-2 text-sm font-semibold text-[#222] hover:bg-[#f6fff1] transition"
                          >
                            [RE]Smartphones
                          </Link>
                        </div>
                      )}
                    </article>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Micro-anim d’apparition (désactivable via prefers-reduced-motion) */}
      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
