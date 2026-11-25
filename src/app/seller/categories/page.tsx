'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { Icon } from '@components/icon/icon';
import { ProductImage } from '@components/platform/product-image';
import { PageHeader } from '@components/shared';

import { useSellerCatalog } from '../components/use-seller-data';

export default function SellerCategoriesPage() {
  const { t, locale, num } = useI18n();
  const { products, categories } = useSellerCatalog();
  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.catalog.categoriesTitle')}
        description={t('seller.catalog.categoriesSubtitle')}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((c, i) => {
          const items = products.filter((p) => p.categoryId === c.id);
          return (
            <Link
              key={c.id}
              href={`/seller/products?category=${c.id}`}
              className="group bg-panel border-line hover:border-brand-200 focus-ring dark:hover:border-brand-700 flex flex-col rounded-2xl border p-5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <ProductImage
                  src={`art:${i}`}
                  alt=""
                  icon={c.icon}
                  className="size-14 shrink-0"
                  iconSize={26}
                />
                <div className="min-w-0">
                  <h3 className="text-ink font-bold">{locale === 'bn' ? c.nameBn : c.name}</h3>
                  <p className="text-muted text-xs">
                    {t('site.categories.products', { count: num(items.length) })}
                  </p>
                </div>
              </div>
              <p className="text-muted mt-4 line-clamp-2 text-[13px]">{c.description}</p>
              <div className="mt-4 flex -space-x-2">
                {items.slice(0, 4).map((p) => (
                  <ProductImage
                    key={p.id}
                    src={p.images[0]}
                    alt=""
                    icon={c.icon}
                    className="ring-panel size-9 ring-2"
                    iconSize={15}
                    rounded="rounded-full"
                  />
                ))}
              </div>
              <span className="text-accent mt-4 inline-flex items-center gap-1 text-[13px] font-semibold">
                {t('seller.catalog.browse')}
                <Icon
                  name="chevRight"
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
