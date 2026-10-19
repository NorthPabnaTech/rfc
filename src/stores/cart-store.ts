'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ImageDTO } from '@/types';

export type CartItem = {
  /** productId + selected variant — the same product in two sizes is two lines. */
  key: string;
  productId: string;
  slug: string;
  name: string;
  image?: ImageDTO;
  /** Price when added; the server re-prices at checkout. */
  price: number;
  variant: Record<string, string>;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  /** The slide-over cart drawer. */
  isOpen: boolean;
  add: (item: Omit<CartItem, 'key'>) => void;
  setQuantity: (key: string, quantity: number) => void;
  /** Change a line's options (e.g. picking a size in the cart); merges into an identical line. */
  setVariant: (key: string, variant: Record<string, string>) => void;
  remove: (key: string) => void;
  clear: () => void;
  open: () => void;
  setOpen: (open: boolean) => void;
};

export const MAX_QTY = 20;

export function cartKey(productId: string, variant: Record<string, string>): string {
  const parts = Object.keys(variant)
    .sort()
    .map((k) => `${k}=${variant[k]}`);
  return [productId, ...parts].join('|');
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      add: (item) =>
        set((state) => {
          const key = cartKey(item.productId, item.variant);
          const existing = state.items.find((i) => i.key === key);
          const items = existing
            ? state.items.map((i) =>
                i.key === key
                  ? { ...i, ...item, key, quantity: Math.min(MAX_QTY, i.quantity + item.quantity) }
                  : i,
              )
            : [...state.items, { ...item, key, quantity: Math.min(MAX_QTY, item.quantity) }];
          return { items, isOpen: true };
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.key === key ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : i,
          ),
        })),
      setVariant: (key, variant) =>
        set((state) => {
          const line = state.items.find((i) => i.key === key);
          if (!line) return state;
          const nextKey = cartKey(line.productId, variant);
          if (nextKey === key) return state;
          const twin = state.items.find((i) => i.key === nextKey);
          const items = twin
            ? state.items
                .filter((i) => i.key !== key)
                .map((i) =>
                  i.key === nextKey
                    ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + line.quantity) }
                    : i,
                )
            : state.items.map((i) => (i.key === key ? { ...i, key: nextKey, variant } : i));
          return { items };
        }),
      remove: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      setOpen: (isOpen) => set({ isOpen }),
    }),
    {
      name: 'rfc-gadget-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export const selectCount = (s: CartState) => s.items.reduce((n, i) => n + i.quantity, 0);
export const selectSubtotal = (s: CartState) =>
  s.items.reduce((n, i) => n + i.price * i.quantity, 0);
