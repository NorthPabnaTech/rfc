import '@styles/globals.css';

import type { Metadata, Viewport } from 'next';
import { Hind_Siliguri, Jost, Nunito_Sans } from 'next/font/google';

import { AppProviders } from '@/providers/app-providers';
import { SITE } from '@config/site';

const body = Nunito_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const heading = Jost({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
// Bangla glyphs only — the Latin fonts above have none, so the browser falls
// through to this one for Bengali text (see --font-sans / --font-display).
const bangla = Hind_Siliguri({
  subsets: ['bengali'],
  variable: '--font-bangla',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: 'en_BD',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#0b0b0f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} ${bangla.variable}`}>
      <body className="min-h-dvh">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
