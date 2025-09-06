'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2, Smartphone, ShieldCheck, User, Phone, Mail } from 'lucide-react';
import { useCart, type CartItem } from '@/components/CartProvider';

/** Format EUR à partir de cents */
function formatEUR(cents: number) {
  const value = cents / 100;
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(value);
}

/** Normalise l’affichage du grade (smartphones reconditionnés) */
function formatGrade(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const cleaned = s.replace(/grade\s*/i, '').toUpperCase();
  return cleaned ? `Grade ${cleaned}` : null;
}

/** Normalise la couleur (extrait du meta si déjà détectée côté listing) */
function formatColor(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Meta attendue côté abonnement (robuste si partielle/absente) */
type PlanMeta = {
  planKey?: 'essentiel' | 'familial' | 'zen' | string;
  devicesCount?: number;
  devices?: string[]; // modèles saisis
  priceMonthlyEUR?: number;
  customer?: { name?: string; email?: string; phone?: string };
};

function isPlanItem(it: CartItem): boolean {
  // On considère "plan" comme type officiel, sinon fallback si meta.planKey présent
  return it.type === 'plan' || !!(it.meta && (it.meta as any).planKey);
}

export default function CartPage() {
  const { items, subtotal, updateQty, removeItem, clearCart } = useCart();
  const hasItems = items.length > 0;
  const hasPlan = items.some(isPlanItem);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleCheckout() {
    if (!hasItems || loading) return;
    try {
      setErr(null);
      setLoading(true);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Impossible de démarrer le paiement.');
      }
      // Redirection Stripe Checkout
      window.location.href = data.url as string;
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur lors du démarrage du paiement');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#222]">Votre panier</h1>
        <p className="text-gray-600 mt-2">Récapitulatif de vos sélections RecoPhone.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LISTE DES ARTICLES */}
        <section className="lg:col-span-2 space-y-4">
          {!hasItems && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-700">Votre panier est vide pour l’instant.</p>
              <div className="mt-4">
                <Link
                  href="/accueil"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#54b435] text-white px-5 py-3 font-semibold hover:opacity-95"
                >
                  Découvrir nos services
                </Link>
              </div>
            </div>
          )}

          {items.map((it: CartItem) => {
            // Rendu spécifique pour les ABONNEMENTS
            if (isPlanItem(it)) {
              const meta = (it.meta || {}) as PlanMeta;
              const models = Array.isArray(meta.devices) ? meta.devices.filter(Boolean) : [];
              const devicesCount = Math.max(1, (meta.devicesCount ?? models.length));
              const customer = meta.customer || {};

              return (
                <article
                  key={it.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 flex items-start gap-4"
                >
                  {/* Icône abonnement */}
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl bg-[#edfbe2] text-[#54b435] grid place-items-center">
                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-[#222] truncate">{it.title}</h3>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] sm:text-sm">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-[#edfbe2] text-[#2a2a2a]">
                        Abonnement
                      </span>
                      <span className="inline-flex px-2 py-0.5 rounded-full border border-gray-200 text-gray-700">
                        {devicesCount} appareil{devicesCount > 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex px-2 py-0.5 rounded-full border border-gray-200 text-gray-700">
                        {formatEUR(it.unitPrice)} / mois
                      </span>
                    </div>

                    {/* Appareils couverts */}
                    {models.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-[#222] mb-1">Appareils couverts</p>
                        <div className="flex flex-wrap gap-2">
                          {models.map((m, i) => (
                            <span
                              key={i}
                              className="inline-flex px-2 py-0.5 rounded-full border border-gray-200 text-gray-700 text-xs"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Coordonnées client */}
                    {(customer.name || customer.email || customer.phone) && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-700">
                        {customer.name && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-500" />
                            <span className="truncate">{customer.name}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-500" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                            <span className="truncate">{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pour un abonnement, quantité fixe */}
                  <div className="flex items-center gap-2 opacity-50 cursor-not-allowed" title="Quantité fixe pour les abonnements">
                    <span className="px-3 py-2 rounded-lg border border-gray-200">1</span>
                  </div>

                  {/* Retirer */}
                  <button
                    aria-label="Retirer l’article"
                    onClick={() => removeItem(it.id)}
                    className="ml-2 p-2 rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                    title="Retirer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </article>
              );
            }

            // Rendu par défaut (smartphones / autres produits)
            const cap = (it.meta as any)?.capacity ?? null;
            const grade = formatGrade((it.meta as any)?.grade);
            const color = formatColor((it.meta as any)?.color);

            return (
              <article
                key={it.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 flex items-center gap-4"
              >
                {/* Placeholder visuel simple (pas d'image distante) */}
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl bg-[#edfbe2] text-[#54b435] grid place-items-center">
                  <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-[#222] truncate">{it.title}</h3>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] sm:text-sm">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-[#edfbe2] text-[#2a2a2a]">Smartphone</span>
                    {cap && (
                      <span className="inline-flex px-2 py-0.5 rounded-full border border-gray-200 text-gray-700">
                        {cap}
                      </span>
                    )}
                    {grade && (
                      <span className="inline-flex px-2 py-0.5 rounded-full border border-gray-200 text-gray-700">
                        {grade}
                      </span>
                    )}
                    {color && (
                      <span className="inline-flex px-2 py-0.5 rounded-full border border-gray-200 text-gray-700">
                        {color}
                      </span>
                    )}
                    <span className="text-gray-500">{formatEUR(it.unitPrice)}</span>
                  </div>
                </div>

                {/* Quantité éditable */}
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Diminuer la quantité"
                    onClick={() => updateQty(it.id, it.qty - 1)}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99}
                    value={it.qty}
                    onChange={(e) => updateQty(it.id, Number(e.target.value))}
                    className="w-14 text-center rounded-lg border border-gray-200 py-2"
                  />
                  <button
                    aria-label="Augmenter la quantité"
                    onClick={() => updateQty(it.id, it.qty + 1)}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Retirer */}
                <button
                  aria-label="Retirer l’article"
                  onClick={() => removeItem(it.id)}
                  className="ml-2 p-2 rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                  title="Retirer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </article>
            );
          })}
        </section>

        {/* RÉCAPITULATIF */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sticky top-6">
            <h2 className="text-xl font-bold text-[#222]">Récapitulatif</h2>
            <div className="mt-4 flex justify-between text-sm text-gray-700">
              <span>Sous-total</span>
              <span className="font-semibold">{formatEUR(subtotal)}</span>
            </div>

            {hasPlan && (
              <p className="mt-2 text-xs text-gray-600">
                Les abonnements sont facturés mensuellement. Les montants affichés correspondent au prix par mois.
              </p>
            )}

            {err && (
              <div className="mt-3 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">
                {err}
              </div>
            )}

            <button
              disabled={!hasItems || loading}
              className="mt-5 w-full rounded-xl bg-[#54b435] text-white font-semibold py-3 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95"
              onClick={handleCheckout}
            >
              {loading ? 'Redirection…' : 'Passer au paiement'}
            </button>

            {hasItems && (
              <button
                className="mt-3 w-full rounded-xl bg-gray-100 text-gray-700 font-medium py-3 hover:bg-gray-200"
                onClick={clearCart}
              >
                Vider le panier
              </button>
            )}

            <div className="mt-6 rounded-xl bg-[#edfbe2] p-4 text-sm text-[#222]">
              <p className="font-semibold">Écologie & économie circulaire</p>
              <p className="text-gray-700 mt-1">
                Avec RecoPhone, vous prolongez la durée de vie de vos appareils et réduisez les déchets électroniques.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
