import '@styles/globals.css';

import type { Metadata, Viewport } from 'next';
import { Anek_Bangla, Hind_Siliguri, Jost, Nunito_Sans } from 'next/font/google';
import { cookies } from 'next/headers';
import NextTopLoader from 'nextjs-toploader';

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from '@/i18n/config';
import { AppProviders } from '@/providers/app-providers';
import { PLATFORM } from '@config/platform';

// Body / UI font — Nunito Sans (variable).
const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito-sans',
  display: 'swap',
});
// Display / Heading font — Jost.
const jost = Jost({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jost',
  display: 'swap',
});
// Bangla fallback — Hind Siliguri.
const bangla = Hind_Siliguri({
  subsets: ['bengali'],
  variable: '--font-bangla',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
// Bangla numerals (the `num` utility switches to it in Bangla mode).
const anek = Anek_Bangla({
  subsets: ['bengali'],
  variable: '--font-anek',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(PLATFORM.appUrl),
  title: { default: `${PLATFORM.name} — ${PLATFORM.tagline}`, template: `%s | ${PLATFORM.name}` },
  description:
    'A reselling platform for Bangladesh: pick products, set your own selling price, place Cash on Delivery orders and earn profit — without owning inventory.',
  applicationName: PLATFORM.name,
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#011a28' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(stored) ? stored : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      className={`${nunitoSans.variable} ${jost.variable} ${bangla.variable} ${anek.variable}`}
      // next-themes sets the theme class before hydration.
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <NextTopLoader
          color="var(--color-brand-500)"
          height={3}
          showSpinner={false}
          shadow="0 0 10px var(--color-brand-500),0 0 5px var(--color-brand-500)"
          zIndex={9999}
        />
        <AppProviders locale={locale}>{children}</AppProviders>
      </body>
    </html>
  );
}
