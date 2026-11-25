'use client';

import * as React from 'react';
import { ThemeProvider } from 'next-themes';

import type { Locale } from '@/i18n/config';
import { I18nProvider } from '@/i18n/provider';
import { AppToaster } from '@components/ui/toaster';
import { TooltipProvider } from '@components/ui/tooltip';

/**
 * Client-side providers mounted once in the root layout:
 * theme (Light / Dark / System via next-themes, persisted in localStorage),
 * language (English / বাংলা, persisted in a cookie), tooltips and toasts.
 */
export function AppProviders({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider initialLocale={locale}>
        <TooltipProvider delayDuration={150}>
          {children}
          <AppToaster />
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
