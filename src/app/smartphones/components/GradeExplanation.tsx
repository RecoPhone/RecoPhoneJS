// src/components/GradesExplainer.tsx
export default function GradesExplainer() {
  return (
    <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-extrabold text-[#222]">
        À propos des grades & de la livraison
      </h2>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        {/* Colonne 1 — Grades */}
        <div>
          <h3 className="text-base md:text-lg font-semibold text-[#222]">Nos grades</h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-700">
            <li>
              <span className="font-semibold">Grade A</span> — Excellent état esthétique, très proche du neuf.
              Micro-marques à peine visibles. 100% fonctionnel, testé et réinitialisé.
            </li>
            <li>
              <span className="font-semibold">Grade B</span> — Très bon état avec de légères traces d’usage visibles à une distance normale.
              Entièrement fonctionnel.
            </li>
            <li>
              <span className="font-semibold">Grade C</span> — Bon état avec des marques plus visibles (micro-chocs/rayures), mais
              parfaitement fonctionnel. Idéal petit budget.
            </li>
          </ul>

          <div className="mt-4 rounded-xl bg-[#edfbe2] p-4 text-sm text-[#222]">
            <p className="font-semibold">MixABC</p>
            <p className="mt-1">
              Certains articles sont proposés en <span className="font-semibold">MixABC</span> :
              le stock peut contenir des appareils en grade A, B ou C au <em>même prix</em>.
              Par défaut, nous préparons votre commande avec le <span className="font-semibold">meilleur grade disponible</span> au moment du traitement.
              Si vous souhaitez un grade précis, contactez-nous avant de finaliser l’achat.
            </p>
          </div>
        </div>

        {/* Colonne 2 — Logistique */}
        <div>
          <h3 className="text-base md:text-lg font-semibold text-[#222]">Délais & livraison</h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-700">
            <li>
              <span className="font-semibold">Délai</span> — Comptez environ <span className="font-semibold">5 jours ouvrables</span> à partir
              de la confirmation pour recevoir votre téléphone (préparation + logistique).
            </li>
            <li>
              <span className="font-semibold">Retrait magasin</span> — Possibilité de <span className="font-semibold">conserver l’appareil en magasin</span> pour retrait sur place.
            </li>
            <li>
              <span className="font-semibold">Expédition</span> — Envoi possible via transporteur, <span className="font-semibold">frais à charge du client</span>.
              Les frais sont affichés lors du paiement.
            </li>
            <li>
              <span className="font-semibold">Inclus</span> — Un <span className="font-semibold">câble de charge</span> et un <span className="font-semibold">verre trempé posé</span>.
            </li>
          </ul>

          <p className="mt-4 text-xs text-gray-500">
            Tous nos appareils sont testés, débloqués tout opérateur et réinitialisés avant expédition.
          </p>
        </div>
      </div>
    </section>
  );
}
