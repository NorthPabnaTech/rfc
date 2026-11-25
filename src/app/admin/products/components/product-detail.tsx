'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { KpiCard, Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { orderColumns } from '@components/platform/columns';
import { Money } from '@components/platform/money';
import { NotFoundState } from '@components/platform/not-found-state';
import { ProductGallery } from '@components/platform/product-gallery';
import { StatusPill } from '@components/platform/status-pill';
import { ConfirmDialog, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { DataTable } from '@components/ui/data-table';
import { sellerBasePrice } from '@lib/business/pricing';
import { toast } from '@lib/toast';

import { ProductForm } from './product-form';

export function EditProduct({ id }: { id: string }) {
  const { t } = useI18n();
  const product = usePlatformStore((s) => s.products.find((p) => p.id === id));
  if (!product)
    return <NotFoundState title={t('seller.product.notFound')} backHref="/admin/products" />;
  return <ProductForm product={product} />;
}

export function ProductDetail({ id }: { id: string }) {
  const i18n = useI18n();
  const { t, locale, num, percent, money } = i18n;
  const router = useRouter();
  const { products, categories, suppliers, orders, sellers, deleteProduct, settings } =
    usePlatformStore();
  const product = products.find((p) => p.id === id);
  const [confirm, setConfirm] = React.useState(false);
  const productOrders = React.useMemo(() => orders.filter((o) => o.productId === id), [orders, id]);

  if (!product)
    return <NotFoundState title={t('seller.product.notFound')} backHref="/admin/products" />;
  const cat = categories.find((c) => c.id === product.categoryId);
  const sup = suppliers.find((s) => s.id === product.supplierId);
  const base = sellerBasePrice(product);
  const delivered = productOrders.filter((o) => o.status === 'delivered');
  // From each order's own price snapshot — a later price change must not rewrite past profit.
  const platformProfit = delivered.reduce((a, o) => a + o.platformMargin * o.quantity, 0);

  const info: [string, React.ReactNode][] = [
    [
      t('seller.product.sku'),
      <span key="id" className="font-mono text-xs">
        {product.id}
      </span>,
    ],
    [t('common.category'), locale === 'bn' ? cat?.nameBn : cat?.name],
    [
      t('common.supplier'),
      sup ? (
        <Link key="s" href="/admin/suppliers" className="text-accent hover:underline">
          {sup.name}
        </Link>
      ) : (
        '—'
      ),
    ],
    [
      t('admin.products.availability'),
      <StatusPill key="a" kind="availability" value={product.availability} />,
    ],
    [
      t('admin.products.productStatus'),
      <StatusPill key="st" kind="product" value={product.status} />,
    ],
    [t('admin.products.suggested'), <Money key="sg" value={product.suggestedPrice} />],
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={locale === 'bn' ? product.nameBn : product.name}
        description={locale === 'bn' ? product.name : product.nameBn}
        backHref="/admin/products"
        backLabel={t('admin.products.title')}

        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirm(true)}
              className="text-[var(--status-danger-fg)]"
            >
              <Icon name="trash" size={16} />
              {t('common.delete')}
            </Button>
            <Button variant="primary" asChild>
              <Link href={`/admin/products/${product.id}/edit`}>
                <Icon name="pencil" size={16} />
                {t('common.edit')}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Panel>
            <div className="grid gap-6 pt-5 md:grid-cols-2">
              <ProductGallery images={product.images} alt={product.name} icon={cat?.icon} />
              <div>
                <h2 className="type-card-title text-ink">{t('common.description')}</h2>
                <p className="type-body text-muted mt-2">{product.description}</p>
                <dl className="divide-line mt-5 divide-y">
                  {info.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-4 py-2.5 text-[14px]"
                    >
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-ink text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Panel>
          <Panel title={t('nav.allOrders')} flush>
            <DataTable
              columns={orderColumns(i18n, { base: '/admin', sellers, showSeller: true }).filter(
                (c) => c.key !== 'product',
              )}
              source={productOrders.slice(0, 8)}
              rowKey="id"
              onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
              classNames={{ root: 'rounded-none border-x-0 border-b-0' }}
              empty={{ title: t('seller.orders.empty') }}
            />
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title={t('admin.products.pricing')} description={t('admin.products.pricingHint')}>
            <div className="bg-well/60 rounded-xl p-4">
              <div className="text-subtle mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase">
                <Icon name="lock" size={12} />
                {t('admin.products.adminOnly')}
              </div>
              <PriceRow
                label={t('admin.products.supplierCost')}
                value={money(product.supplierCost)}
              />
              <PriceRow
                label={`+ ${t('admin.products.margin')}`}
                value={`${money(product.platformMargin)} (${percent((product.platformMargin / product.supplierCost) * 100)})`}
                ok
              />
            </div>
            <div className="mt-3 flex items-center justify-between px-1">
              <span className="text-ink text-sm font-semibold">
                = {t('admin.products.basePrice')}
              </span>
              <Money value={base} className="text-ink text-xl font-extrabold" />
            </div>
            <div className="border-line mt-4 space-y-1 border-t pt-3">
              <PriceRow
                label={t('seller.product.packagingCharge')}
                value={money(product.packagingCharge)}
              />
              <PriceRow
                label={t('seller.product.deliveryCharge')}
                value={`${money(settings.deliveryCharges.inside_dhaka + product.deliveryCharge)} – ${money(settings.deliveryCharges.outside_dhaka + product.deliveryCharge)}`}
              />
            </div>
          </Panel>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label={t('admin.products.ordersCount')}
              value={num(productOrders.length)}
              icon="cart"
              tone="brand"
            />
            <KpiCard
              label={t('admin.analysis.platformProfit')}
              value={money(platformProfit)}
              icon="coin"
              tone="ok"
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="danger"
        destructive
        icon="trash"
        title={t('admin.products.deleteTitle')}
        description={t('admin.products.deleteDesc', { name: product.name })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          deleteProduct(product.id);
          toast.success(t('common.deleted'));
          router.push('/admin/products');
        }}
      />
    </div>
  );
}

function PriceRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-[14px]">
      <span className="text-muted">{label}</span>
      <span
        className={
          ok ? 'num font-semibold text-[var(--status-ok-fg)]' : 'num text-ink font-semibold'
        }
      >
        {value}
      </span>
    </div>
  );
}
