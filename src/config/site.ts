/**
 * Static brand information. Editable store details (support phone, shipping
 * fees, social links…) live in the database Settings document so the admin
 * can change them; these values are the build-time fallbacks and SEO base.
 */
export const SITE = {
  name: 'RFC Gadget',
  shortName: 'RFC Gadget',
  tagline: 'Smart gadgets, delivered',
  description:
    'RFC Gadget — phones, smart watches, earbuds, chargers and the latest gadgets delivered across Bangladesh with Cash on Delivery.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  version: '1.0.0',
  defaultLocale: 'en-BD',
  defaultCurrency: 'BDT',
  support: {
    phone: '01330363517',
    address: 'Hazipara, Uttor Badda, Dhaka',
  },
} as const;

export const IS_PROD = process.env.NODE_ENV === 'production';

export type Site = typeof SITE;
