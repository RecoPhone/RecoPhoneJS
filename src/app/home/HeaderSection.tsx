'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const HERO_WAVE_D =
  'M0,224L48,202.7C96,181,192,139,288,149.3C384,160,480,224,576,240C672,256,768,224,864,202.7C960,181,1056,171,1152,181.3C1248,192,1344,224,1392,240L1440,256L1440,320L0,320Z';

const TYPE_SENTENCE = 'Recycle – Repair – Relife – Protect';

const CTA_BAND: [number, number] = [32, 68];

type WindmillPos = {
  leftPct: number;
  bottomPct: number;
  size: number;
  speed: number;
  delay: number;
};

/** Éolienne minimaliste */
function Windmill({ size = 150, speed = 6, delay = 0 }: { size?: number; speed?: number; delay?: number }) {
  return (
    <svg
      viewBox="0 0 100 160"
      width={size}
      height={size}
      aria-hidden={true}
      className="select-none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="wm-mast" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#c9d0d6" />
          <stop offset="100%" stopColor="#9aa1a8" />
        </linearGradient>
        <radialGradient id="wm-hub" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#eef2f5" />
          <stop offset="100%" stopColor="#aab1b7" />
        </radialGradient>
      </defs>

      {/* mât */}
      <rect x="48" y="36" width="4" height="124" rx="2" fill="url(#wm-mast)" />
      <circle cx="50" cy="36" r="5.5" fill="url(#wm-hub)" />

      {/* rotor */}
      <g
        className="wm-rotor"
        style={{
          transformOrigin: '50px 36px',
          animation: `wm-spin ${speed}s linear infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        <g transform="translate(50 36)">
          <rect x="-2.6" y="-38" width="5.2" height="38" rx="2.6" fill="#cfd6dc" />
          <rect x="-2.6" y="-38" width="5.2" height="38" rx="2.6" fill="#cfd6dc" transform="rotate(120)" />
          <rect x="-2.6" y="-38" width="5.2" height="38" rx="2.6" fill="#cfd6dc" transform="rotate(240)" />
        </g>
      </g>
    </svg>
  );
}

export default function HeroSection() {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [mills, setMills] = useState<WindmillPos[]>([]);

  /** 7 éoliennes : 3 à gauche, 4 à droite, hors zone CTA, dispersion naturelle */
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    const total = path.getTotalLength();
    const viewW = 1440;
    const viewH = 320;
    const [BMIN, BMAX] = CTA_BAND;

    const pointAt = (t: number) => {
      const p = path.getPointAtLength(Math.max(0, Math.min(1, t)) * total);
      return {
        xPct: (p.x / viewW) * 100,
        bottomPct: ((viewH - p.y) / viewH) * 100,
      };
    };

    const ensureOutsideBand = (t: number) => {
      let { xPct, bottomPct } = pointAt(t);
      let guard = 0;
      while (xPct > BMIN && xPct < BMAX && guard < 400) {
        t += xPct < (BMIN + BMAX) / 2 ? -0.0025 : 0.0025;
        t = Math.min(0.99, Math.max(0.01, t));
        ({ xPct, bottomPct } = pointAt(t));
        guard++;
      }
      return { xPct, bottomPct };
    };

    const seedsLeft = [0.06, 0.14, 0.26];
    const seedsRight = [0.64, 0.55, 0.86, 0.96];

    const jitter = (t: number, j: number) => Math.min(0.99, Math.max(0.01, t + j));
    const seeds = [
      jitter(seedsLeft[0], +0.004),
      jitter(seedsLeft[1], -0.007),
      jitter(seedsLeft[2], +0.01),
      jitter(seedsRight[0], -0.006),
      jitter(seedsRight[1], +0.009), // ~0.79
      jitter(seedsRight[2], +0.007),
      jitter(seedsRight[3], -0.004),
    ];

    const SIZES = [146, 150, 152, 146, 148, 154, 148];
    const SPEEDS = [6.0, 6.3, 6.1, 6.4, 6.15, 6.0, 6.2];
    const DELAYS = [0.0, 0.2, 0.4, 0.6, 0.75, 0.9, 1.05];

    const arr = seeds.map((t, i) => {
      const safe = ensureOutsideBand(t);
      return {
        leftPct: safe.xPct,
        bottomPct: safe.bottomPct,
        size: SIZES[i],
        speed: SPEEDS[i],
        delay: DELAYS[i],
      };
    });

    setMills(arr);
  }, []);

  const [typed, setTyped] = useState('');
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setTyped(TYPE_SENTENCE);
      return;
    }

    let i = 0;
    let timeoutId: number | null = null;
    const tick = () => {
      if (i <= TYPE_SENTENCE.length) {
        setTyped(TYPE_SENTENCE.slice(0, i));
        i++;
        timeoutId = window.setTimeout(tick, 50);
      }
    };
    tick();
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section id="hero" className="relative isolate overflow-hidden" aria-label="Section d’introduction RecoPhone">
      {/* Backdrop doux (plus léger pour éviter le “vert sur vert”) */}
      <div
        aria-hidden={true}
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(1200px 600px at 70% 10%, #54b43514, transparent 60%), radial-gradient(900px 400px at 10% 0%, #54b4350f, transparent 60%), #edfbe2',
        }}
      />

      {/* Contenu */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-24 pb-28 md:pt-32 md:pb-36 lg:pt-36 lg:pb-40">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/images/contents/logo_recophone.png"
            alt="RecoPhone" 
            width={180}
            height={180}
            sizes="(max-width: 768px) 140px, 180px"
            className="mx-auto mb-5 select-none md:mb-6"
            priority
          />

          {/* TypeWriter = Slogan */}
        <h2
        className="mt-2 text-xl md:text-3xl font-bold leading-tight tracking-tight text-[#222]"
        aria-label="Recycle – Repair – Relife – Protect"
        >
        {typed}
        <span
            aria-hidden
            className="ml-1 inline-block h-[1em] w-[2px] align-[-0.15em] bg-[#54b435] animate-caretBlink"
        />
        </h2>

          {/* Phrase budget sous le typewriter */}
          <p className="mt-3 text-sm text-[#222]/80 md:mt-4 md:text-base">
            Préservez la planète mais aussi votre portefeuille
          </p>

          {/* CTA */}
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 md:mt-9">
            <Link
              href="/devis"
              aria-label="Obtenir un devis de réparation gratuitement"
              className="w-full rounded-xl border border-transparent bg-[#54b435] px-6 py-3 text-base font-semibold text-white transition-all hover:bg-[#3e8e2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#54b435]/40 sm:w-auto md:text-lg"
            >
              Je répare mon smartphone
            </Link>
            <Link
              href="/re-smartphones"
              aria-label="Acheter un smartphone reconditionné"
              className="w-full rounded-xl border border-[#54b435]/40 bg-white/80 px-6 py-3 text-base font-semibold text-[#2e6f1f] backdrop-blur-[1px] transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#54b435]/30 sm:w-auto md:text-lg"
            >
              J’opte pour le reconditionné
            </Link>
          </div>
        </div>
      </div>

      {/* Courbe + éoliennes (3 G / 4 D) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[200px] select-none md:h-[260px] lg:h-[320px]">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="h-full w-full" aria-hidden={true}>
          <path d={HERO_WAVE_D} fill="#54b435" fillOpacity="0.22" ref={pathRef} />
        </svg>

        {/* Éoliennes dispersées naturellement, desktop only */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          {mills.map((m, i) => (
            <div
              key={`${i}-${m.leftPct.toFixed(2)}`}
              className="absolute"
              style={{
                left: `${m.leftPct}%`,
                bottom: `${m.bottomPct}%`,
                transform: 'translate(-50%, 0)',
              }}
            >
              <Windmill size={m.size} speed={m.speed} delay={m.delay} />
            </div>
          ))}
        </div>
      </div>

      {/* Animations & accessibilité */}
      <style jsx global>{`
        @keyframes wm-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes caretBlink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
        .animate-caretBlink {
          animation: caretBlink 0.9s steps(2, start) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .wm-rotor {
            animation: none !important;
          }
          .animate-caretBlink {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
