'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { Product } from '@/types/platform';
import { Panel } from '@components/dashboard/panel';
import {
  Form,
  FormCurrency,
  FormInput,
  FormSelect,
  FormTextarea,
  useWatch,
} from '@components/form';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { ProductImage } from '@components/platform/product-image';
import { Callout, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { sellerBasePrice } from '@lib/business/pricing';
import { toast } from '@lib/toast';
import { productSchema } from '@lib/validators/reseller';

type Values = {
  name: string;
  nameBn: string;
  description: string;
  categoryId: string;
  supplierId: string;
  supplierCost: number;
  platformMargin: number;
  deliveryCharge: number;
  packagingCharge: number;
  suggestedPrice: number;
  status: Product['status'];
  availability: Product['availability'];
};

const MAX_IMAGES = 4;
const MAX_BYTES = 900_000;

export function ProductForm({ product }: { product?: Product }) {
  const { t, locale, money } = useI18n();
  const router = useRouter();
  const { categories, suppliers, settings, upsertProduct } = usePlatformStore();
  const schema = React.useMemo(() => productSchema(t), [t]);
  const form = Form.useForm<Values>({
    schema,
    defaultValues: product
      ? { ...product }
      : {
          name: '',
          nameBn: '',
          description: '',
          categoryId: '',
          supplierId: '',
          supplierCost: 0,
          platformMargin: settings.defaultMargin,
          deliveryCharge: 0,
          packagingCharge: settings.defaultPackagingCharge,
          suggestedPrice: 0,
          status: 'active',
          availability: 'in_stock',
        },
  });
  const [images, setImages] = React.useState<string[]>(
    product?.images ?? [`art:${categories.length * 3 + 1}`],
  );

  const onFinish = (v: Values) => {
    const id = product?.id ?? `prd-${Date.now().toString(36)}`;
    const record: Product = {
      ...v,
      supplierCost: Number(v.supplierCost),
      platformMargin: Number(v.platformMargin),
      deliveryCharge: Number(v.deliveryCharge),
      packagingCharge: Number(v.packagingCharge),
      suggestedPrice: Number(v.suggestedPrice),
      id,
      slug: v.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      images,
      createdAt: product?.createdAt ?? new Date().toISOString(),
    };
    upsertProduct(record);
    toast.success(product ? t('admin.products.updated') : t('admin.products.created'));
    router.push(`/admin/products/${id}`);
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    [...files].slice(0, MAX_IMAGES - images.length).forEach((file) => {
      if (file.size > MAX_BYTES) {
        toast.warning(`${file.name}: max 900 KB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        setImages((imgs) => [...imgs, String(reader.result)].slice(0, MAX_IMAGES));
      reader.readAsDataURL(file);
    });
  };

  const icon = categories.find((c) => c.id === form.watch('categoryId'))?.icon;

  return (
    <div className="space-y-5">
      <PageHeader
        title={product ? t('admin.products.editTitle') : t('admin.products.newTitle')}
        description={product ? product.name : t('admin.products.newSubtitle')}
        backHref={product ? `/admin/products/${product.id}` : '/admin/products'}
        backLabel={t('common.back')}
      />
      <Form<Values> form={form} onFinish={onFinish}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Panel title={t('admin.products.basic')}>
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                <FormInput name="name" label={t('admin.products.nameEn')} required />
                <FormInput name="nameBn" label={t('admin.products.nameBn')} required />
                <FormSelect
                  name="categoryId"
                  label={t('common.category')}
                  required
                  items={categories.map((c) => ({
                    value: c.id,
                    label: locale === 'bn' ? c.nameBn : c.name,
                  }))}
                />
                <FormSelect
                  name="supplierId"
                  label={t('common.supplier')}
                  required
                  showSearch
                  items={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                />
                <FormTextarea
                  name="description"
                  label={t('common.description')}
                  required
                  rows={4}
                  className="sm:col-span-2"
                />
              </div>
            </Panel>

            <Panel title={t('common.images')} description={t('admin.products.imagesHint')}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((src, i) => (
                  <div key={i} className="group relative">
                    <ProductImage
                      src={src}
                      alt=""
                      icon={icon}
                      className="aspect-square w-full"
                      iconSize={32}
                    />
                    <button
                      type="button"
                      onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}
                      className="bg-panel/90 text-ink absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full shadow"
                      aria-label={t('common.remove')}
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <label className="border-line-2 text-muted hover:border-brand hover:text-accent flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-xs font-semibold">
                    <Icon name="upload" size={22} />
                    {t('common.upload')}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => addFiles(e.target.files)}
                    />
                  </label>
                )}
              </div>
            </Panel>

            <Panel
              title={t('admin.products.pricing')}
              description={t('admin.products.pricingHint')}
            >
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-3">
                <FormCurrency
                  name="supplierCost"
                  label={t('admin.products.supplierCost')}
                  required
                />
                <FormCurrency name="platformMargin" label={t('admin.products.margin')} required />
                <FormCurrency
                  name="suggestedPrice"
                  label={t('admin.products.suggested')}
                  hint={t('admin.products.suggestedHint')}
                />
              </div>
            </Panel>

            <Panel title={t('admin.products.charges')}>
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                <FormCurrency
                  name="deliveryCharge"
                  label={t('admin.products.extraDelivery')}
                  hint={t('admin.products.extraDeliveryHint')}
                />
                <FormCurrency
                  name="packagingCharge"
                  label={t('admin.products.packaging')}
                  required
                />
              </div>
              <p className="type-helper text-muted mt-4">
                {t('admin.settings.deliveryCharges')}: {t('area.inside_dhaka')}{' '}
                {money(settings.deliveryCharges.inside_dhaka)} · {t('area.sub_dhaka')}{' '}
                {money(settings.deliveryCharges.sub_dhaka)} · {t('area.outside_dhaka')}{' '}
                {money(settings.deliveryCharges.outside_dhaka)}
              </p>
            </Panel>
          </div>

          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <PricingPreview control={form.control} />
            <Panel title={t('admin.products.statusAvailability')}>
              <div className="flex flex-col gap-y-5">
                <FormSelect
                  name="status"
                  label={t('admin.products.productStatus')}
                  items={(['active', 'draft', 'out_of_stock'] as const).map((s) => ({
                    value: s,
                    label: t(`status.product.${s}`),
                  }))}
                />
                <FormSelect
                  name="availability"
                  label={t('admin.products.availability')}
                  items={(['in_stock', 'limited', 'out_of_stock'] as const).map((s) => ({
                    value: s,
                    label: t(`status.availability.${s}`),
                  }))}
                />
              </div>
            </Panel>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                <Icon name="check" size={16} />
                {product ? t('common.saveChanges') : t('common.create')}
              </Button>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}

/** Live: Supplier cost + margin = base price; what a seller earns at the suggested price. */
function PricingPreview({
  control,
}: {
  control: ReturnType<typeof Form.useForm<Values>>['control'];
}) {
  const { t, money } = useI18n();
  const [cost, margin, suggested] = useWatch({
    control,
    name: ['supplierCost', 'platformMargin', 'suggestedPrice'],
  });
  const base = sellerBasePrice({
    supplierCost: Number(cost) || 0,
    platformMargin: Number(margin) || 0,
  });
  const sell = Number(suggested) || 0;
  return (
    <Panel title={t('admin.products.exampleTitle')}>
      <div className="bg-well/60 rounded-xl p-3">
        <div className="text-subtle mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase">
          <Icon name="lock" size={12} />
          {t('admin.products.adminOnly')}
        </div>
        <Row label={t('admin.products.supplierCost')} value={Number(cost) || 0} />
        <Row
          label={`+ ${t('admin.products.margin')}`}
          value={Number(margin) || 0}
          tone="text-[var(--status-ok-fg)] font-semibold"
        />
      </div>
      <div className="border-line mt-3 border-b pb-2">
        <Row label={`= ${t('admin.products.basePrice')}`} value={base} strong />
        <p className="text-subtle text-[11px]">{t('admin.products.sellerSees')}</p>
      </div>
      {sell > 0 && (
        <div className="mt-2">
          <Row label={t('admin.products.exampleSelling', { amount: money(sell) })} value={sell} />
          <Row
            label={t('admin.analysis.sellerProfit')}
            value={sell - base}
            tone={
              sell - base >= 0
                ? 'text-[var(--status-ok-fg)] font-bold'
                : 'text-[var(--status-danger-fg)] font-bold'
            }
          />
        </div>
      )}
      {sell > 0 && sell < base && (
        <Callout
          tone="warn"
          compact
          className="mt-3"
          description={t('seller.product.belowBase', { amount: money(base - sell) })}
        />
      )}
    </Panel>
  );
}

const Row = ({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: number;
  strong?: boolean;
  tone?: string;
}) => (
  <div className="flex items-center justify-between py-1.5 text-[14px]">
    <span className="text-muted">{label}</span>
    <Money
      value={value}
      className={strong ? 'text-ink text-base font-bold' : (tone ?? 'text-ink font-semibold')}
    />
  </div>
);
