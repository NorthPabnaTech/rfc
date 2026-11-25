'use client';

import { create } from 'zustand';

import { clearResellerToken, getResellerToken, setResellerToken } from '@lib/api/client';
import { resellerApi, type ResellerProfile } from '@lib/api/reseller';

type ResellerAuthState = {
  token: string | null;
  reseller: ResellerProfile | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  init: () => Promise<void>;
  setAuth: (token: string, reseller: ResellerProfile) => void;
  setReseller: (reseller: ResellerProfile) => void;
  refreshMe: () => Promise<ResellerProfile | null>;
  logout: () => void;
};

export const useResellerAuth = create<ResellerAuthState>((set, get) => ({
  token: null,
  reseller: null,
  loading: false,
  initialized: false,
  error: null,

  init: async () => {
    if (get().initialized || get().loading) return;
    const token = getResellerToken();
    if (!token) {
      set({ token: null, reseller: null, initialized: true, loading: false });
      return;
    }
    set({ token, loading: true, error: null });
    try {
      const me = await resellerApi.me();
      if (!me.isActive) {
        clearResellerToken();
        set({
          token: null,
          reseller: null,
          initialized: true,
          loading: false,
          error: 'Account is inactive',
        });
        return;
      }
      set({ token, reseller: me, initialized: true, loading: false });
    } catch (err) {
      clearResellerToken();
      set({
        token: null,
        reseller: null,
        initialized: true,
        loading: false,
        error: err instanceof Error ? err.message : 'Session expired',
      });
    }
  },

  setAuth: (token, reseller) => {
    setResellerToken(token);
    set({ token, reseller, initialized: true, loading: false, error: null });
  },

  setReseller: (reseller) => {
    set((state) => ({
      reseller: state.reseller ? { ...state.reseller, ...reseller } : reseller,
    }));
  },

  refreshMe: async () => {
    const token = getResellerToken();
    if (!token) {
      set({ token: null, reseller: null });
      return null;
    }
    try {
      const me = await resellerApi.me();
      set({ token, reseller: me });
      return me;
    } catch {
      return get().reseller;
    }
  },

  logout: () => {
    clearResellerToken();
    set({ token: null, reseller: null, initialized: true, loading: false, error: null });
  },
}));
