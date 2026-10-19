import type { MetadataRoute } from 'next';

import { getCategoryTree } from '@/services/catalog';
import { listPublishedSlugs } from '@/services/products';
import { SITE } from '@config/site';

// Rebuilt at most hourly; the catalog changes through the admin panel.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([listPublishedSlugs(), getCategoryTree()]);
  const now = new Date();
  return [
    { url: SITE.url, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE.url}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...categories
      .flatMap((c) => [c, ...c.children])
      .map((c) => ({
        url: `${SITE.url}/products?category=${c.slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ...products.map((p) => ({
      url: `${SITE.url}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    { url: `${SITE.url}/track-order`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE.url}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE.url}/return-policy`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
