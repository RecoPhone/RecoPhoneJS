'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/components/CartProvider';

export function CartButton() {
  const { count } = useCart();

  return (
    <Link
      href="/panier"
      className="relative inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-white text-[#222] hover:shadow-md transition-shadow"
      aria-label="Ouvrir le panier"
    >
      <ShoppingCart className="w-5 h-5" />
      <span className="hidden sm:block text-sm font-medium">Panier</span>
      {count > 0 && (
        <span
          aria-live="polite"
          aria-atomic="true"
          className="absolute -top-2 -right-2 min-w-[22px] h-[22px] rounded-full bg-[#54b435] text-white text-xs font-bold grid place-items-center shadow"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
