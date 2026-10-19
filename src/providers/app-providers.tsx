'use client';

import * as React from 'react';

import { AppToaster } from '@components/ui/toaster';
import { TooltipProvider } from '@components/ui/tooltip';

/**
 * Client-side providers mounted once in the root layout. Kept deliberately
 * thin: data lives on the server (Server Components + server actions), and
 * the only client state — the cart — is a self-contained zustand store.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      {children}
      <AppToaster />
    </TooltipProvider>
  );
}
