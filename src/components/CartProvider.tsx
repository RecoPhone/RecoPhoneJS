'use client';

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';

export type CartItemType = 'repair' | 'accessory' | 'device' | 'plan';

export type CartItem = {
  id: string;
  title: string;
  type: CartItemType;
  unitPrice: number; // cents
  qty: number;
  image?: string;
  meta?: Record<string, unknown>;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number; // cents
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_KEY = 'recophone.cart.v1';
const CART_TTL_HOURS = 24 * 7;

function clampQty(qty: number) {
  if (Number.isNaN(qty)) return 1;
  return Math.min(99, Math.max(1, Math.floor(qty)));
}

function computeSubtotal(items: CartItem[]) {
  return items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
}

function isExpired(updatedAt: number) {
  const ttl = CART_TTL_HOURS * 60 * 60 * 1000;
  return Date.now() - updatedAt > ttl;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(CART_KEY) : null;
      if (!raw) return;
      const state = JSON.parse(raw) as { items: CartItem[]; updatedAt: number };
      if (!Array.isArray(state?.items)) return;
      if (isExpired(state.updatedAt)) {
        localStorage.removeItem(CART_KEY);
        return;
      }
      setItems(state.items.map((it) => ({ ...it, qty: clampQty(it.qty) })));
    } catch {
      // ignore
    } finally {
      hydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify({ items, updatedAt: Date.now() }));
    } catch {
      // storage full/unavailable
    }
  }, [items]);

  const addItem = useCallback((next: CartItem) => {
    setItems((prev) => {
      const qty = clampQty(next.qty);
      const idx = prev.findIndex((p) => p.id === next.id);
      if (idx === -1) return [...prev, { ...next, qty }];
      const merged = [...prev];
      merged[idx] = { ...merged[idx], qty: clampQty(merged[idx].qty + qty) };
      return merged;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, qty: clampQty(qty) } : p)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = computeSubtotal(items);
    const count = items.reduce((acc, it) => acc + it.qty, 0);
    return { items, count, subtotal, addItem, removeItem, updateQty, clearCart };
  }, [items, addItem, removeItem, updateQty, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}
