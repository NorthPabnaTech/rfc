'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useWatch } from 'react-hook-form';

import { saveProductAction } from '@/actions/admin';
import { ImageUploader } from '@/features/uploads/image-uploader';
import type { AdminProductDTO, CategoryDTO, ImageDTO, SupplierDTO, TagDTO } from '@/types';
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
import { handleActionResult } from '@lib/action-client';
import { STOCK_STATUS_LABELS, STOCK_STATUSES } from '@lib/constants';
import { formatNumber } from '@lib/utils';
import { type ProductInput, productSchema } from '@lib/validators/catalog';

// Quill touches `document` on import, so the editor only loads in the browser.
const RichTextEditor = dynamic(
  () => import('@components/ui/rich-text-editor').then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="skeleton h-48" /> },
);

type Props = {
  product?: AdminProductDTO;
  categories: CategoryDTO[];
  tags: TagDTO[];
  suppliers: SupplierDTO[];
};

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
  price: 0,
  salePrice: null,
  stockStatus: 'in_stock',
  sku: '',
  images: [],
  variations: [],
  specifications: [],
  seo: { metaTitle: '', metaDescription: '', keywords: [] },
  status: 'published',
  isFeatured: false,
  isComboOffer: false,
};

function toFormValues(p: AdminProductDTO): ProductInput {
  return {
    ...EMPTY,
    ...p,
    slug: p.slug,
    shortDescription: p.shortDescription ?? '',
    description: p.description ?? '',
    subCategory: p.subCategory ?? '',
    supplierProductUrl: p.supplierProductUrl ?? '',
    sku: p.sku ?? '',
    seo: {
      metaTitle: p.seo.metaTitle ?? '',
      metaDescription: p.seo.metaDescription ?? '',
      keywords: p.seo.keywords,
    },
  };
}

export function ProductForm({ product, categories, tags, suppliers }: Props) {
  const router = useRouter();
  const form = Form.useForm<ProductInput>({
    schema: productSchema,
    defaultValues: product ? toFormValues(product) : EMPTY,
  });
  const { isSubmitting } = form.formState;

  const [categoryId, supplierUrl, supplierPrice, price, salePrice] = useWatch({
    control: form.control,
    name: ['category', 'supplierProductUrl', 'supplierPrice', 'price', 'salePrice'],
  });
  const parents = categories.filter((c) => !c.parentId);
  const children = categories.filter((c) => c.parentId && c.parentId === categoryId);

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
                        <FormItem name={[f.name, 'values']} label="Values">
                          {(field, _s, meta) => (
                            <ChipInput
                              value={(field.value as string[]) ?? []}
                              onChange={field.onChange}
                              placeholder="S, M, L…"
                              aria-invalid={meta.invalid}
                            />
                          )}
                        </FormItem>
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
                        onClick={() => add({ name: '', values: [] })}
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
                {(fields, { add, remove }) => (
                  <div className="space-y-3">
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
                )}
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
              <FormSwitch name="isFeatured" label="Feature on homepage" />
              <FormSwitch
                name="isComboOffer"
                label="Show in Combo offers"
                // hint="For a deal sold as one product, e.g. 5 pcs T-shirt combo."
              />
            </FormSection>
          </Panel>

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
              <FormInput name="sku" label="SKU" placeholder="Optional, e.g. NV-WAL-001" />
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

      <div className="border-line sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-2.5 border-t bg-white/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
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
