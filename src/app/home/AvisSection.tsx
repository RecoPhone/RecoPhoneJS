'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';

type Testimonial = {
  name: string;
  text: string;
  stars: number;
  photo: string; 
};

const testimonials: Testimonial[] = [
  { name: 'Matteo M.',   text: 'Service très rapide et toujours bien fait ! Je recommande à 1000 %.', stars: 5, photo: '/images/avis/matteo.jpg' },
  { name: 'Kirišti Š.',  text: 'Changement de batterie sur Pixel 7a : super service, rapide et efficace. Merci !', stars: 5, photo: '/images/avis/kiristi.jpg' },
  { name: 'Pauline R.',  text: 'Un nouvel écran au top, une batterie qui tient la charge, et la lentille me permet de refaire de superbes photos !', stars: 5, photo: '/images/avis/pauline.jpg' },
  { name: 'Domenico D.', text: 'Travail soigné, très rapide et efficace. Je vous recommande vivement RecoPhone, vous en serez très satisfait 😊 N’hésitez surtout pas 😉', stars: 5, photo: '/images/avis/domenico.jpg' },
  { name: 'Eileen J.',   text: 'Très professionnel et travail de qualité ! Je ne peux que vous recommander 😉', stars: 5, photo: '/images/avis/eileen.jpg' },
  { name: 'Tedika M.',   text: 'RecoPhone se distingue par son sérieux, sa transparence et son engagement. Merci Ben pour ton professionnalisme !', stars: 5, photo: '/images/avis/tedika.jpg' },
  { name: 'Ben B.',      text: 'Excellent vendeur ! Très professionnel, à l’écoute et réactif. Le téléphone est en parfait état et livré rapidement. Je recommande vivement pour un achat en toute confiance.', stars: 5, photo: '/images/avis/ben.jpg' },
  { name: 'Marco T.',    text: 'Merci à Ben pour son professionnalisme et sa rapidité ! Je recommande à 100% 💪', stars: 5, photo: '/images/avis/marco.jpg' },
  { name: 'Romii I.',    text: 'Rapide et efficace. Qualité 100 %. Prix attractif.', stars: 5, photo: '/images/avis/romii.jpg' },
  { name: 'Adriano P.',  text: 'Il a réparé mon Samsung A15 en un temps record et à un prix imbattable. Rapide et efficace !', stars: 5, photo: '/images/avis/adriano.jpg' },
];

export default function AvisSection() {
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pauseRef = useRef(false);

  // Données SEO (aggregate)
  const reviewCount = testimonials.length;
  const ratingValue = useMemo(
    () => (testimonials.reduce((s, t) => s + t.stars, 0) / reviewCount).toFixed(1),
    [reviewCount]
  );

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    renderMode: 'performance',
    drag: true,
    slides: { perView: 1.05, spacing: 14 }, // léger "peek" sur mobile
    breakpoints: {
      '(min-width: 768px)': { slides: { perView: 2, spacing: 24 } },
      '(min-width: 1024px)': { slides: { perView: 3, spacing: 32 } },
    },
    created() {
      setReady(true);
    },
  });

  // Autoplay + pause sur hover/focus/touch + respect "reduce motion"
  useEffect(() => {
    const slider = instanceRef.current;
    if (!slider) return;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const el = containerRef.current;
    const tick = () => !pauseRef.current && instanceRef.current?.next();
    const id = window.setInterval(tick, 4200);

    const pause = () => (pauseRef.current = true);
    const resume = () => (pauseRef.current = false);

    el?.addEventListener('mouseenter', pause);
    el?.addEventListener('mouseleave', resume);
    el?.addEventListener('focusin', pause);
    el?.addEventListener('focusout', resume);
    el?.addEventListener('touchstart', pause, { passive: true });
    el?.addEventListener('touchend', resume);

    return () => {
      clearInterval(id);
      el?.removeEventListener('mouseenter', pause);
      el?.removeEventListener('mouseleave', resume);
      el?.removeEventListener('focusin', pause);
      el?.removeEventListener('focusout', resume);
      el?.removeEventListener('touchstart', pause);
      el?.removeEventListener('touchend', resume);
    };
  }, [instanceRef]);

  // Navigation clavier
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') instanceRef.current?.prev();
      if (e.key === 'ArrowRight') instanceRef.current?.next();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [instanceRef]);

  return (
    <section id="avis" className="bg-white pt-8 md:pt-10 pb-20 px-4 md:px-12" aria-labelledby="avis-title">
      {/* JSON-LD très simple pour le rich snippet */}
      <Script
        id="recophone-aggregate-rating"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'RecoPhone',
            aggregateRating: { '@type': 'AggregateRating', ratingValue, reviewCount },
          }),
        }}
      />
      <div className="max-w-6xl mx-auto relative">
        <header className="text-center mb-10">
          <h2 id="avis-title" className="text-3xl md:text-4xl font-extrabold text-[#222]">
            Ils font confiance à RecoPhone
          </h2>
          <p className="text-[#222] mt-3 text-base md:text-lg">
            Grâce à vous, on répare plus, on jette moins. <strong>Merci pour votre engagement !</strong>
          </p>
          <p className="sr-only" aria-live="polite">
            Note moyenne {ratingValue} sur {reviewCount} avis.
          </p>
        </header>

        {/* Flèches desktop */}
        <div className="hidden md:block">
          <button
            aria-label="Avis précédent"
            className="absolute top-[55%] left-0 z-10 bg-[#edfbe2] hover:bg-[#d4f0c4] p-2 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-[#54b435]/40"
            onClick={() => instanceRef.current?.prev()}
          >
            <ChevronLeft className="text-[#54b435]" size={24} />
          </button>
          <button
            aria-label="Avis suivant"
            className="absolute top-[55%] right-0 z-10 bg-[#edfbe2] hover:bg-[#d4f0c4] p-2 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-[#54b435]/40"
            onClick={() => instanceRef.current?.next()}
          >
            <ChevronRight className="text-[#54b435]" size={24} />
          </button>
        </div>

        {/* Carrousel (accessible + progressive enhancement) */}
        <div
          ref={(el) => {
            sliderRef(el);
            containerRef.current = el;
          }}
          className={`keen-slider outline-none transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
          role="region"
          aria-roledescription="carousel"
          aria-label="Avis clients"
          tabIndex={0}
        >
          {testimonials.map((t, i) => (
            <article
              key={`${t.name}-${i}`}
              className="keen-slider__slide bg-[#edfbe2] p-6 rounded-2xl shadow-xl flex flex-col items-center text-center"
              aria-label={`Avis de ${t.name}`}
            >
              <Image
                src={t.photo}
                alt={`Photo de ${t.name}`}
                width={88}
                height={88}
                sizes="88px"
                className="w-22 h-22 rounded-full object-cover mb-4 border-4 border-[#54b435] select-none"
                draggable={false}
                priority={i === 0}
              />
              {/* étoiles (avec texte SR) */}
              <div className="flex justify-center items-center mb-2 text-[#54b435]" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    size={18}
                    className={s < t.stars ? 'fill-[#54b435] text-[#54b435]' : 'text-[#54b435] opacity-25'}
                  />
                ))}
              </div>
              <span className="sr-only">{t.stars} étoiles sur 5</span>

              <p className="text-[#222] italic mb-3 text-sm line-clamp-4">“{t.text}”</p>
              <p className="font-semibold text-[#54b435]">{t.name}</p>
            </article>
          ))}
        </div>

        {/* CTA final */}
        <div className="w-full text-center pt-12 md:pt-16">
          <h3 className="text-xl md:text-2xl font-semibold text-[#222] uppercase mb-4 tracking-wide">
            Et si c’était votre appareil qu’on réparait ensuite ?
          </h3>
          <p className="text-[#222] mb-6 uppercase tracking-widest text-sm md:text-base">
            Demandez votre devis gratuit, rapide et sans engagement
          </p>
          <Link
            href="/devis"
            className="inline-block bg-[#54b435] text-white px-6 py-3 rounded-xl font-bold text-base md:text-lg uppercase hover:bg-[#449a2a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#54b435]/40"
          >
            Réaliser mon devis
          </Link>
        </div>
      </div>
    </section>
  );
}
