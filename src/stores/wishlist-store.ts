'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type WishlistState = {
  /** Product ids, most recently added first. */
  ids: string[];
  toggle: (id: string) => boolean;
  remove: (id: string) => void;
};

const MAX_ITEMS = 100;

/** Saved-for-later products, kept in this browser. */
export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const has = get().ids.includes(id);
        set({
          ids: has ? get().ids.filter((x) => x !== id) : [id, ...get().ids].slice(0, MAX_ITEMS),
        });
        return !has;
      },
      remove: (id) => set({ ids: get().ids.filter((x) => x !== id) }),
    }),
    { name: 'rfc-gadget-wishlist', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
