'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import { useWatch } from 'react-hook-form';

import { saveProductAction } from '@/actions/admin';
import { ImageUploader } from '@/features/uploads/image-uploader';
import type {
  AdminProductDTO,
  BusinessDTO,
  CategoryDTO,
  ImageDTO,
  SupplierDTO,
  TagDTO,
} from '@/types';
import { ChipInput, ChipMultiSelect } from '@components/common/chip-input';
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
import { Textarea } from '@components/ui/textarea';
import { handleActionResult } from '@lib/action-client';
import { toast } from '@lib/toast';
import {
  DEFAULT_BUSINESS_SLUG,
  PRODUCT_VISIBILITIES,
  PRODUCT_VISIBILITY_LABELS,
  STOCK_STATUS_LABELS,
  STOCK_STATUSES,
} from '@lib/constants';
import { formatNumber } from '@lib/utils';
import { type ProductInput, productSchema } from '@lib/validators/catalog';

// Quill touches `document` on import, so the editor only loads in the browser.
const RichTextEditor = dynamic(
  () => import('@components/ui/rich-text-editor').then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="skeleton h-48" /> },
);

type Props = {
  product?: AdminProductDTO;
  initialDraft?: Partial<AdminProductDTO>;
  categories: CategoryDTO[];
  tags: TagDTO[];
  suppliers: SupplierDTO[];
  businesses: BusinessDTO[];
};

function parseSpecificationsText(text: string): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^[-*•]\s*/, '');
    if (!line) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx <= 0) continue;
    const label = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (label && value) {
      rows.push({ label, value });
    }
  }
  return rows;
}

const EMPTY: ProductInput = {
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  category: '',
  subCategory: '',
  tags: [],
  supplier: '',
  supplierProductUrl: '',
  supplierPrice: 0,
  resellerEnabled: false,
  resellerProfit: 50,
  resellerPackagingCost: undefined,
  price: 0,
  salePrice: null,
  stockStatus: 'in_stock',
  stockQuantity: 0,
  trackInventory: false,
  business: DEFAULT_BUSINESS_SLUG,
  visibility: 'public',
  sku: '',
  images: [],
  variations: [],
  specifications: [],
  seo: { metaTitle: '', metaDescription: '', keywords: [] },
  status: 'published',
  isFeatured: false,
  isComboOffer: false,
  freeDelivery: false,
  deliveryDiscountType: 'none',
  deliveryDiscountValue: 0,
};

function toFormValues(p: Partial<AdminProductDTO>): ProductInput {
  return {
    ...EMPTY,
    ...p,
    slug: p.slug ?? '',
    shortDescription: p.shortDescription ?? '',
    description: p.description ?? '',
    subCategory: p.subCategory ?? '',
    supplierProductUrl: p.supplierProductUrl ?? '',
    resellerProfit: p.resellerEnabled ? (p.resellerProfit ?? 50) : p.resellerProfit || 50,
    sku: p.sku ?? '',
    seo: {
      metaTitle: p.seo?.metaTitle ?? '',
      metaDescription: p.seo?.metaDescription ?? '',
      keywords: p.seo?.keywords ?? [],
    },
  };
}

export function ProductForm({
  product,
  initialDraft,
  categories,
  tags,
  suppliers,
  businesses,
}: Props) {
  const router = useRouter();
  const source = product ?? initialDraft;
  const [specPasteText, setSpecPasteText] = React.useState('');
  const form = Form.useForm<ProductInput>({
    schema: productSchema,
    defaultValues: source ? toFormValues(source) : EMPTY,
  });
  const { isSubmitting } = form.formState;

  const [
    categoryId,
    supplierUrl,
    supplierPrice,
    resellerEnabled,
    resellerProfit,
    price,
    salePrice,
    selectedBusiness,
    trackInventory,
    deliveryDiscountType,
    variationsWatch,
  ] = useWatch({
    control: form.control,
    name: [
      'category',
      'supplierProductUrl',
      'supplierPrice',
      'resellerEnabled',
      'resellerProfit',
      'price',
      'salePrice',
      'business',
      'trackInventory',
      'deliveryDiscountType',
      'variations',
    ],
  });
  const selectedBizObj = businesses.find((b) => b.slug === selectedBusiness);
  const isInternalBusiness = selectedBizObj ? !selectedBizObj.isPublicStorefront : false;

  React.useEffect(() => {
    if (isInternalBusiness && form.getValues('visibility') !== 'private') {
      form.setValue('visibility', 'private');
    }
  }, [isInternalBusiness, form]);
  const parents = categories.filter(
    (c) => !c.parentId && c.business === (selectedBusiness || DEFAULT_BUSINESS_SLUG),
  );
  const children = categories.filter((c) => c.parentId && c.parentId === categoryId);

  // Changing the business clears a category that belongs to another business.
  React.useEffect(() => {
    const cat = form.getValues('category');
    const biz = selectedBusiness || DEFAULT_BUSINESS_SLUG;
    if (cat && !categories.some((c) => c.id === cat && c.business === biz)) {
      form.setValue('category', '');
      form.setValue('subCategory', '');
    }
  }, [selectedBusiness, categories, form]);

  // Changing the category clears a sub-category that belongs to another one.
  React.useEffect(() => {
    const sub = form.getValues('subCategory');
    if (sub && !categories.some((c) => c.id === sub && c.parentId === categoryId)) {
      form.setValue('subCategory', '');
    }
  }, [categoryId, categories, form]);
  const sell =
    Number(salePrice) > 0 && Number(salePrice) < Number(price) ? Number(salePrice) : Number(price);
  const margin = sell - Number(supplierPrice || 0);

  return (
    <Form
      form={form}
      className="gap-6"
      onFinish={async (values) => {
        const res = await saveProductAction(values, product?.id);
        if (handleActionResult(res, form)) {
          router.push('/admin/products');
          router.refresh();
        }
      }}
      onFinishFailed={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel>
            <FormSection title="Basic information" icon="doc">
              <FormInput
                name="name"
                label="Product name"
                required
                placeholder="e.g. Premium Leather Wallet"
              />
              <FormTextarea
                name="shortDescription"
                label="Short description"
                rows={2}
                placeholder="One or two lines shown near the price"
              />
              <FormItem name="description" label="Full description">
                {(field) => (
                  <RichTextEditor
                    value={(field.value as string) ?? ''}
                    onChange={field.onChange}
                    placeholder="Describe the product: features, materials, size guide…"
                  />
                )}
              </FormItem>
            </FormSection>
          </Panel>

          <Panel>
            <FormSection
              title="Images"
              icon="image"
              description="Upload photos (stored in Cloudinary) and/or paste image URLs from the supplier site. Drag to reorder — the first image is the cover."
            >
              <FormItem name="images">
                {(field) => (
                  <ImageUploader
                    purpose="products"
                    nameHint={form.watch('name')}
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

          <Panel>
            <FormSection title="Pricing" icon="coin">
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-3">
                <FormCurrency
                  name="supplierPrice"
                  label="Supplier price"
                  required
                  hint="What you pay"
                />
                <FormCurrency name="price" label="Selling price" required />
                <FormCurrency name="salePrice" label="Discount price" hint="Optional" />
              </div>
              {Number(price) > 0 && (
                <Callout
                  tone={margin > 0 ? 'success' : 'danger'}
                  compact
                  title={`Margin per unit: ৳${formatNumber(margin)}${sell > 0 ? ` (${Math.round((margin / sell) * 100)}%)` : ''}`}
                />
              )}
              <div className="border-line mt-4 border-t pt-4">
                <FormSwitch
                  name="resellerEnabled"
                  label="Available for resellers"
                />
                {resellerEnabled && (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                      <FormCurrency
                        name="resellerProfit"
                        label="Your profit margin (৳)"
                        hint="Added on top of supplier price"
                      />
                      <FormCurrency
                        name="resellerPackagingCost"
                        label="Reseller packaging cost (৳)"
                        hint="Optional; defaults to supplier packaging"
                      />
                    </div>
                    <Callout
                      tone="info"
                      compact
                      title={`Reseller price: ৳${formatNumber(Number(supplierPrice || 0) + Number(resellerProfit || 0))} (Supplier ৳${formatNumber(Number(supplierPrice || 0))} + Your Profit ৳${formatNumber(Number(resellerProfit || 0))})`}
                    />
                  </div>
                )}
              </div>
            </FormSection>
          </Panel>

          <Panel>
            <FormSection
              title="Variations"
              icon="layers"
              description="Options the customer must choose, e.g. Size: S, M, L or Color: Black, Brown."
            >
              <Form.List name="variations">
                {(fields, { add, remove }) => (
                  <div className="space-y-3">
                    {fields.map((f) => (
                      <div
                        key={f.key}
                        className="bg-surface grid gap-3 rounded-xl p-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-start"
                      >
                        <FormInput name={[f.name, 'name']} label="Option" placeholder="Size" />
                        <div className="space-y-2">
                          <FormItem name={[f.name, 'values']} label="Values">
                            {(field, _s, meta) => (
                              <ChipInput
                                value={(field.value as string[]) ?? []}
                                onChange={(nextValues) => {
                                  field.onChange(nextValues);
                                  const currentDisabled =
                                    form.getValues(`variations.${f.name}.disabledValues`) ?? [];
                                  const pruned = currentDisabled.filter((d) =>
                                    nextValues.includes(d),
                                  );
                                  if (pruned.length !== currentDisabled.length) {
                                    form.setValue(`variations.${f.name}.disabledValues`, pruned, {
                                      shouldDirty: true,
                                    });
                                  }
                                }}
                                placeholder="S, M, L…"
                                aria-invalid={meta.invalid}
                              />
                            )}
                          </FormItem>
                          {(() => {
                            const row = variationsWatch?.[f.name];
                            const vals = row?.values ?? [];
                            const disabled = row?.disabledValues ?? [];
                            if (vals.length === 0) return null;
                            return (
                              <div className="space-y-1">
                                <p className="text-subtle text-[11px]">
                                  Click a variant to toggle Out of Stock / Disabled:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {vals.map((val) => {
                                    const isOff = disabled.includes(val);
                                    return (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => {
                                          const next = isOff
                                            ? disabled.filter((d) => d !== val)
                                            : [...disabled, val];
                                          form.setValue(
                                            `variations.${f.name}.disabledValues`,
                                            next,
                                            { shouldDirty: true },
                                          );
                                        }}
                                        className={
                                          isOff
                                            ? 'border-danger/40 bg-danger/10 text-danger rounded-full border px-2.5 py-0.5 text-[11px] font-medium line-through transition'
                                            : 'border-line bg-well text-ink hover:border-brand rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition'
                                        }
                                        title={
                                          isOff
                                            ? 'Click to mark In Stock'
                                            : 'Click to mark Out of Stock (disabled)'
                                        }
                                      >
                                        {val} {isOff ? '(Out of stock)' : ''}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        {/* Label-height spacer keeps the button level with the inputs. */}
                        <div className="flex flex-col gap-1.5">
                          <span aria-hidden className="type-label invisible hidden sm:block">
                            Remove
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove option"
                            onClick={() => remove(f.name)}
                          >
                            <Icon name="trash" size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {fields.length < 5 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => add({ name: '', values: [], disabledValues: [] })}
                      >
                        <Icon name="plus" size={14} /> Add option
                      </Button>
                    )}
                  </div>
                )}
              </Form.List>
            </FormSection>
          </Panel>

          <Panel>
            <FormSection
              title="Specifications"
              icon="list"
              description="Shown as a table on the product page."
            >
              <Form.List name="specifications">
                {(fields, { add, remove }) => {
                  const applyParsedSpecs = (rawText: string): boolean => {
                    const parsed = parseSpecificationsText(rawText);
                    if (parsed.length === 0) return false;
                    const current = form.getValues('specifications') ?? [];
                    // Remove trailing/existing blank placeholder rows before appending parsed rows.
                    for (let i = current.length - 1; i >= 0; i--) {
                      const row = current[i];
                      if (!row?.label?.trim() && !row?.value?.trim()) {
                        remove(i);
                      }
                    }
                    add(parsed);
                    setSpecPasteText('');
                    return true;
                  };

                  return (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Textarea
                          rows={3}
                          value={specPasteText}
                          onChange={(e) => setSpecPasteText(e.target.value)}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text');
                            if (pasted && applyParsedSpecs(pasted)) {
                              e.preventDefault();
                            }
                          }}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                              if (applyParsedSpecs(specPasteText)) {
                                e.preventDefault();
                              }
                            }
                          }}
                          placeholder={'Quick paste (Label: Value per line)\ne.g. Material: Food Grade Silicone & SS 304\nPower: 600W'}
                          aria-label="Quick paste specifications"
                          className="text-xs"
                        />
                        {specPasteText.trim() && (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => applyParsedSpecs(specPasteText)}
                            >
                              Apply to table
                            </Button>
                          </div>
                        )}
                      </div>
                      {fields.map((f) => (
                        <div
                          key={f.key}
                          className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)_auto] sm:items-start"
                        >
                          <FormInput
                            name={[f.name, 'label']}
                            placeholder="Material"
                            aria-label="Specification label"
                          />
                          <FormInput
                            name={[f.name, 'value']}
                            placeholder="Genuine leather"
                            aria-label="Specification value"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove row"
                            onClick={() => remove(f.name)}
                          >
                            <Icon name="trash" size={16} />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => add({ label: '', value: '' })}
                      >
                        <Icon name="plus" size={14} /> Add specification
                      </Button>
                    </div>
                  );
                }}
              </Form.List>
            </FormSection>
          </Panel>

          <Panel>
            <FormSection
              title="SEO"
              icon="search"
              description="Leave blank to use the product name and short description."
            >
              <FormInput
                name="slug"
                label="URL slug"
                placeholder="auto-generated from the name"
                hint="/products/your-slug"
              />
              <FormInput name="seo.metaTitle" label="Meta title" />
              <FormTextarea name="seo.metaDescription" label="Meta description" rows={2} />
              <FormItem name="seo.keywords" label="Keywords">
                {(field) => (
                  <ChipInput
                    value={(field.value as string[]) ?? []}
                    onChange={field.onChange}
                    placeholder="wallet, leather…"
                  />
                )}
              </FormItem>
            </FormSection>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <FormSection title="Store & Visibility" icon="eye">
              <FormSelect
                name="business"
                label="Business / Store"
                items={businesses.map((b) => ({
                  value: b.slug,
                  label: b.isPublicStorefront ? `${b.name} (Public)` : `${b.name} (Internal)`,
                }))}
              />
              <FormSelect
                name="visibility"
                label="Visibility"
                disabled={isInternalBusiness}
                items={PRODUCT_VISIBILITIES.map((v) => ({
                  value: v,
                  label: PRODUCT_VISIBILITY_LABELS[v],
                }))}
                hint={
                  isInternalBusiness
                    ? 'Internal store products are always private.'
                    : 'Private products never appear on the public RFC Gadget website.'
                }
              />
              <FormSelect
                name="status"
                label="Status"
                items={[
                  { value: 'published', label: 'Published' },
                  { value: 'draft', label: 'Draft — hidden' },
                ]}
              />
              <FormSelect
                name="stockStatus"
                label="Stock status"
                items={STOCK_STATUSES.map((s) => ({ value: s, label: STOCK_STATUS_LABELS[s] }))}
              />
              <FormSwitch
                name="trackInventory"
                label="Track numeric stock quantity"
                hint="Automatically deduct & restore stock on orders."
              />
              {trackInventory && (
                <FormInput
                  name="stockQuantity"
                  type="number"
                  min={0}
                  label="Stock quantity"
                />
              )}
              <FormSwitch name="isFeatured" label="Feature on homepage" />
              <FormSwitch
                name="isComboOffer"
                label="Show in Combo offers"
              />
              <FormSelect
                name="deliveryDiscountType"
                label="Delivery charge offer"
                hint="Discounted delivery is handled from your profit (and sent as deliveryChargePaidByCustomer: false to Business Koro)."
                items={[
                  { value: 'none', label: 'No delivery offer (Customer pays full)' },
                  { value: 'free', label: 'Free Delivery (100% off)' },
                  { value: 'half', label: 'Half Delivery (50% off)' },
                  { value: 'fixed', label: 'Fixed Delivery Discount (৳ off)' },
                ]}
              />
              {deliveryDiscountType === 'fixed' && (
                <FormInput
                  name="deliveryDiscountValue"
                  type="number"
                  min={1}
                  label="Delivery discount amount (৳)"
                  hint="Amount deducted from the delivery fee (e.g. 30 makes ৳70 delivery → ৳40)."
                />
              )}
            </FormSection>
          </Panel>

          {product?.slug && (
            <Panel>
              <FormSection
                title="Ad Landing Page (1-Page Order)"
                icon="external"
                description="Use this direct link in Facebook / TikTok ads so customers can view details and order on a single page."
              >
                <div className="bg-well flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl px-3 py-2 text-xs">
                  <span
                    className="text-ink min-w-0 flex-1 truncate font-mono"
                    title={`/order/${product.slug}`}
                  >
                    /order/{product.slug}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const url = `${window.location.origin}/order/${product.slug}`;
                        try {
                          await navigator.clipboard.writeText(url);
                          toast.success('Ad landing link copied');
                        } catch {
                          toast.error('Could not copy link');
                        }
                      }}
                    >
                      <Icon name="copy" size={13} />
                      Copy
                    </Button>
                    <Button type="button" size="sm" variant="ghost" asChild>
                      <Link href={`/order/${product.slug}`} target="_blank">
                        Open
                      </Link>
                    </Button>
                  </div>
                </div>
              </FormSection>
            </Panel>
          )}

          <Panel>
            <FormSection title="Organization" icon="folder">
              <FormSelect
                name="category"
                label="Category"
                required
                showSearch
                placeholder="Choose category"
                items={parents.map((c) => ({ value: c.id, label: c.name }))}
              />
              <FormSelect
                name="subCategory"
                label="Sub-category"
                placeholder={children.length ? 'Optional' : 'No sub-categories'}
                disabled={children.length === 0}
                clearable
                onClear={() => form.setValue('subCategory', '')}
                items={children.map((c) => ({ value: c.id, label: c.name }))}
              />
              <FormItem name="tags" label="Tags">
                {(field) => (
                  <ChipMultiSelect
                    options={tags.map((t) => ({ value: t.id, label: t.name }))}
                    value={(field.value as string[]) ?? []}
                    onChange={field.onChange}
                    emptyText="Create tags under Catalog → Tags."
                  />
                )}
              </FormItem>
              <FormInput
                name="sku"
                label="SKU"
                disabled
                placeholder={
                  product?.sku
                    ? undefined
                    : product
                      ? 'Auto-generated on save'
                      : 'Auto-generated on create'
                }
                hint={
                  product?.sku
                    ? 'Assigned once and cannot be changed.'
                    : product
                      ? 'Will be auto-generated on save and cannot be changed afterwards.'
                      : 'Generated automatically on creation and cannot be changed.'
                }
              />
            </FormSection>
          </Panel>

          <Panel>
            <FormSection title="Supplier" icon="store">
              <FormSelect
                name="supplier"
                label="Supplier"
                required
                placeholder="Choose supplier"
                items={suppliers.map((s) => ({
                  value: s.id,
                  label: `${s.name}${s.status === 'inactive' ? ' (inactive)' : ''}`,
                }))}
              />
              <FormInput
                name="supplierProductUrl"
                label="Supplier product URL"
                placeholder="https://…"
                hint={
                  supplierUrl && /^https?:\/\//.test(supplierUrl) ? (
                    <a
                      href={supplierUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent inline-flex items-center gap-1 font-semibold hover:underline"
                    >
                      Open supplier page <Icon name="external" size={12} />
                    </a>
                  ) : undefined
                }
              />
            </FormSection>
          </Panel>
        </div>
      </div>

      <div className="border-line bg-panel/90 sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-2.5 border-t px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button type="button" variant="secondary" asChild>
          <Link href="/admin/products">Cancel</Link>
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </Form>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="bg-panel hairline rounded-xl2 p-5">{children}</div>;
}
