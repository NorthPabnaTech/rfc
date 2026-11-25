import type { Metadata } from 'next';

import { ShowcaseBrowser } from './components/showcase-browser';

export const metadata: Metadata = { title: 'Products' };

export default function PublicProductsPage() {
  return <ShowcaseBrowser />;
}
