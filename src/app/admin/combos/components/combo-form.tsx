'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWatch } from 'react-hook-form';

import { saveComboAction } from '@/actions/admin';
import { QuantityStepper } from '@/features/cart/quantity-stepper';
import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import { ImageUploader } from '@/features/uploads/image-uploader';
import type { AdminComboDTO, ImageDTO } from '@/types';
import {
  Form,
  FormCurrency,
  FormInput,
  FormItem,
  FormSelect,
  FormSwitch,
  FormTextarea,
} from '@components/form';
import { Icon } from '@components/icon/icon';
import { Callout, FormSection } from '@components/shared';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { STOCK_STATUS_LABELS, STOCK_STATUSES } from '@lib/constants';
import { formatNumber } from '@lib/utils';
import { type ComboInput, comboSchema } from '@lib/validators/catalog';

import { type PickerProduct, ProductPicker } from '../../components/product-picker';

const RichTextEditor = dynamic(
  () => import('@components/ui/rich-text-editor').then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="skeleton h-40" /> },
);

/** What the form keeps per item, beyond the ids it submits. */
type Line = {
  product: Pick<PickerProduct, 'id' | 'name' | 'image' | 'price' | 'supplierPrice'>;
  quantity: number;
};

export function ComboForm({ combo }: { combo?: AdminComboDTO }) {
  const router = useRouter();
  const [lines, setLines] = React.useState<Line[]>(
    combo?.items.map((i) => ({
      product: {
        id: i.productId,
        name: i.name,
        image: i.image,
        price: i.price,
        supplierPrice: i.supplierPrice,
      },
      quantity: i.quantity,
    })) ?? [],
  );
  const form = Form.useForm<ComboInput>({
    schema: comboSchema,
    defaultValues: {
      name: combo?.name ?? '',
      slug: combo?.slug ?? '',
      shortDescription: combo?.shortDescription ?? '',
      description: combo?.description ?? '',
      images: combo?.images ?? [],
      items: [],
      comboPrice: combo?.comboPrice ?? 0,
      stockStatus: combo?.stockStatus ?? 'in_stock',
      status: combo?.status ?? 'published',
      isFeatured: combo?.isFeatured ?? false,
    },
  });
  const { isSubmitting } = form.formState;
  const comboPrice = Number(useWatch({ control: form.control, name: 'comboPrice' })) || 0;

  React.useEffect(() => {
    form.setValue(
      'items',
      lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      { shouldValidate: form.formState.isSubmitted },
    );
  }, [lines, form]);

  const regular = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const cost = lines.reduce((s, l) => s + l.product.supplierPrice * l.quantity, 0);
  const saving = regular - comboPrice;

  return (
    <Form
      form={form}
      className="gap-6"
      onFinish={async (values) => {
        const res = await saveComboAction(values, combo?.id);
        if (handleActionResult(res, form)) {
          router.push('/admin/combos');
          router.refresh();
        }
      }}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel>
            <FormSection title="Combo details" icon="layers">
              <FormInput
                name="name"
                label="Combo name"
                required
                placeholder="e.g. Office Essentials Combo"
              />
              <FormTextarea name="shortDescription" label="Short description" rows={2} />
              <FormItem name="description" label="Full description">
                {(field) => (
                  <RichTextEditor
                    value={(field.value as string) ?? ''}
                    onChange={field.onChange}
                    placeholder="What makes this bundle great?"
                  />
                )}
              </FormItem>
            </FormSection>
          </Panel>

          <Panel>
            <FormSection
              title="Products in this combo"
              icon="box"
              description="Add 2 or more products. For a single-product deal (e.g. 5 pcs T-shirt), create a normal product and turn on “Show in Combo offers”. Products with options (size, colour…) are fine — the customer chooses once for the whole combo."
              action={
                <ProductPicker
                  singlesOnly
                  label="Add product"
                  onPick={(l) =>
                    setLines((prev) =>
                      prev.some((p) => p.product.id === l.product.id)
                        ? prev.map((p) =>
                            p.product.id === l.product.id ? { ...p, quantity: p.quantity + 1 } : p,
                          )
                        : [...prev, { product: l.product, quantity: 1 }],
                    )
                  }
                />
              }
            >
              {lines.length === 0 ? (
                <p className="text-muted text-sm">No products added yet.</p>
              ) : (
                <ul className="divide-line divide-y">
                  {lines.map((l, i) => (
                    <li key={l.product.id} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="bg-well relative size-12 shrink-0 overflow-hidden rounded-lg">
                        <ProductImage src={l.product.image} alt="" fill sizes="48px" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink line-clamp-1 text-[13px] font-semibold">
                          {l.product.name}
                        </p>
                        <p className="text-subtle text-[11.5px]">
                          <Taka amount={l.product.price} /> each · cost{' '}
                          <Taka amount={l.product.supplierPrice} />
                        </p>
                      </div>
                      <QuantityStepper
                        size="sm"
                        value={l.quantity}
                        onChange={(q) =>
                          setLines((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, quantity: q } : x)),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove"
                        onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <Icon name="trash" size={15} />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <FormItem name="items">{() => <span />}</FormItem>
            </FormSection>
          </Panel>

          <Panel>
            <FormSection
              title="Images"
              icon="image"
              description="Optional — if empty, the products' cover images are used."
            >
              <FormItem name="images">
                {(field) => (
                  <ImageUploader
                    purpose="products"
                    max={15}
                    allowUrl
                    sortable
                    value={(field.value as ImageDTO[]) ?? []}
                    onChange={field.onChange}
                  />
                )}
              </FormItem>
            </FormSection>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <FormSection title="Pricing" icon="coin">
              <div className="bg-surface space-y-1.5 rounded-xl p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Bought separately</span>
                  <Taka amount={regular} className="text-ink font-semibold" />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Supplier cost</span>
                  <Taka amount={cost} />
                </div>
              </div>
              <FormCurrency
                name="comboPrice"
                label="Combo price"
                required
                hint="What the customer pays"
              />
              {comboPrice > 0 && regular > 0 && (
                <Callout
                  tone={saving > 0 && comboPrice > cost ? 'success' : 'danger'}
                  compact
                  title={
                    saving <= 0
                      ? 'Combo price should be lower than buying separately'
                      : `Customer saves ৳${formatNumber(saving)} (${Math.round((saving / regular) * 100)}%) · margin ৳${formatNumber(comboPrice - cost)}`
                  }
                />
              )}
            </FormSection>
          </Panel>
          <Panel>
            <FormSection title="Visibility" icon="eye">
              <FormSelect
                name="status"
                label="Status"
                items={[
                  { value: 'published', label: 'Published — visible in store' },
                  { value: 'draft', label: 'Draft — hidden' },
                ]}
              />
              <FormSelect
                name="stockStatus"
                label="Stock status"
                items={STOCK_STATUSES.map((s) => ({ value: s, label: STOCK_STATUS_LABELS[s] }))}
              />
              <FormSwitch name="isFeatured" label="Show first on the homepage" />
              <FormInput name="slug" label="URL slug" placeholder="auto-generated" />
            </FormSection>
          </Panel>
        </div>
      </div>

      <div className="border-line sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-2.5 border-t bg-white/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button type="button" variant="secondary" asChild>
          <Link href="/admin/combos">Cancel</Link>
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting || lines.length < 2}>
          {isSubmitting ? 'Saving…' : combo ? 'Save changes' : 'Create combo'}
        </Button>
      </div>
    </Form>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="bg-panel hairline rounded-xl2 p-5">{children}</div>;
}
