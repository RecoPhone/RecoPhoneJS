'use client';

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import pointingBen from "/public/images/contents/recophone.png";

const Keyword = ({ children }: { children: React.ReactNode }) => (
  <strong className="font-extrabold text-[#222] underline decoration-[#54b435] decoration-2 underline-offset-4">
    {children}
  </strong>
);

export default function WhySection() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://www.recophone.be/#localbusiness",
    name: "RecoPhone",
    url: "https://www.recophone.be",
    email: "hello@recophone.be",
    telephone: "+32 492 09 05 33",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Rte de Saussin 38/23a",
      addressLocality: "Jemeppe-sur-Sambre",
      postalCode: "5190",
      addressRegion: "Namur",
      addressCountry: "BE",
    },
    areaServed: ["Jemeppe-sur-Sambre","Sambreville","Namur","Province de Namur","Belgique"],
    knowsAbout: [
      "réparation smartphone","réparation iPhone","réparation Samsung","remplacement écran",
      "remplacement batterie","dock de charge","face arrière","réparation tablette iPad",
      "smartphone reconditionné"
    ],
  };

  return (
    <section
      id="pourquoi-recophone"
      className="relative bg-[#edfbe2] pt-16 sm:pt-20 lg:pt-24 pb-24 sm:pb-28 overflow-hidden"
      aria-labelledby="why-title"
    >
      <Script id="recophone-why-jsonld" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-screen-2xl mx-auto px-5 sm:px-6 lg:px-10 xl:px-16">
        {/* Mobile d'abord: image au-dessus, texte dessous */}
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-16">
          {/* IMAGE + fondu bas (mask) */}
          <figure className="w-[92%] sm:w-[76%] lg:w-1/2 mx-auto">
            <Image
              src={pointingBen}
              alt="RecoPhone — réparation et reconditionné éco-responsables à Namur"
              className="why-photo w-full h-auto object-contain"
              sizes="(min-width:1024px) 40vw, 92vw"
              placeholder="blur"
              priority={false}
            />
            <figcaption className="sr-only">
              Ben de RecoPhone pointant vers le lecteur — faites la différence en réparant.
            </figcaption>
          </figure>

          {/* TEXTE */}
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <header className="mb-5 sm:mb-6">
              <h2
                id="why-title"
                className="font-extrabold text-[#222] leading-tight
                           text-[clamp(1.75rem,5.6vw,2.5rem)]"
              >
                RecoPhone est une <span className="text-[#54b435]">solution durable</span><br />
                mais <span className="text-[#54b435]">c’est vous</span> qui faites la différence
              </h2>
              <p className="mt-2 sm:mt-3 text-gray-700 text-[clamp(0.95rem,3.8vw,1.05rem)] leading-relaxed">
                Vous choisissez de <Keyword>réparer</Keyword> plutôt que jeter et ça change tout.
              </p>
            </header>

            {/* Liste compacte avec “checks” SVG (meilleure scannabilité mobile) */}
            <ul className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3 text-gray-700 text-[clamp(0.95rem,3.8vw,1.05rem)]">
              {[
                "Moins de déchets électroniques et de matières premières gaspillées.",
                "Votre réparation smartphone à Namur réduit l’empreinte carbone.",
                "Pièces durables et garanties, sélectionnées avec soin.",
                "Tarifs justes — l’écologie ne doit pas être un luxe.",
                "Une réparation simple, rapide et accessible.",
              ].map((txt, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <svg aria-hidden viewBox="0 0 20 20" className="mt-1 h-4 w-4 flex-none">
                    <path d="M7.5 13.5 3.8 9.8l-1.3 1.3L7.5 16l10-10-1.3-1.3z" fill="#54b435" />
                  </svg>
                  <span dangerouslySetInnerHTML={{ __html: txt.replaceAll("réparation smartphone à Namur", "<strong>réparation smartphone à Namur</strong>").replaceAll("empreinte carbone", "<strong>empreinte carbone</strong>").replaceAll("Pièces durables", "<strong>Pièces durables</strong>").replaceAll("Tarifs justes", "<strong>Tarifs justes</strong>") }} />
                </li>
              ))}
            </ul>

            {/* CTAs — mobile: boutons 100% largeur, desktop: horizontal */}
            <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/devis"
                className="inline-flex justify-center px-6 py-3 rounded-xl bg-[#54b435] text-white font-semibold hover:bg-[#3e8e2f] transition shadow-sm w-full sm:w-auto"
              >
                Demander un devis
              </Link>
              <Link
                href="/abonnements"
                className="inline-flex justify-center px-6 py-3 rounded-xl bg-white text-[#222] border border-[#54b435]/30 font-semibold hover:bg-[#f6fff1] transition w-full sm:w-auto"
              >
                Abonnements
              </Link>
              <Link
                href="/re-smartphones"
                className="inline-flex justify-center px-6 py-3 rounded-xl bg-white text-[#222] border border-[#54b435]/30 font-semibold hover:bg-[#f6fff1] transition w-full sm:w-auto"
              >
                [RE]Smartphones
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mini barre CTA flottante (mobile only) */}
      <div
        className="sm:hidden fixed left-1/2 bottom-4 z-40 -translate-x-1/2 px-3 py-2
                   bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-[#54b435]/20"
        aria-label="Accès rapide aux offres"
      >
        <div className="flex gap-2">
          <Link href="/abonnements" className="px-3 py-2 rounded-lg text-sm font-semibold bg-[#54b435] text-white">Abonnements</Link>
          <Link href="/re-smartphones" className="px-3 py-2 rounded-lg text-sm font-semibold bg-white border border-[#54b435]/30 text-[#222]">[RE]Smartphones</Link>
        </div>
      </div>

      {/* Styles (garde ton mask + tweaks mobile) */}
      <style jsx>{`
        /* Ton mask existant, avec variante mobile un poil plus haute */
        :global(img.why-photo){
          -webkit-mask-image: linear-gradient(to bottom, black 72%, transparent 97%);
                  mask-image: linear-gradient(to bottom, black 62%, transparent 96%);
        }
        @media (max-width:640px){
          :global(img.why-photo){
            -webkit-mask-image: linear-gradient(to bottom, black 62%, transparent 94%);
                    mask-image: linear-gradient(to bottom, black 58%, transparent 92%);
          }
        }
      `}</style>
    </section>
  );
}
