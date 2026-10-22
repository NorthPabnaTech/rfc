'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useWatch } from 'react-hook-form';

import { createManualOrderAction, customerSearchAction } from '@/actions/admin';
import { DeliveryZoneNote, LocationFields } from '@/features/address/location-fields';
import { QuantityStepper } from '@/features/cart/quantity-stepper';
import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import type { AddressDTO } from '@/types';
import {
  Form,
  FormCurrency,
  FormInput,
  FormItem,
  FormSelect,
  FormTextarea,
} from '@components/form';
import { Icon } from '@components/icon/icon';
import { FormSection } from '@components/shared';
import { Button } from '@components/ui/button';
import { useDebouncedValue } from '@hooks/use-debounced-value';
import { handleActionResult } from '@lib/action-client';
import {
  ORDER_PLATFORM_LABELS,
  ORDER_PLATFORMS,
  type ShippingZone,
} from '@lib/constants';
import { cn } from '@lib/utils';
import { type ManualOrderInput, manualOrderSchema } from '@lib/validators/order';

import { type PickedLine, ProductPicker } from '../../../components/product-picker';

type FoundCustomer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  defaultAddress: AddressDTO | null;
};

export function ManualOrderForm({ fees }: { fees: Record<ShippingZone, number> }) {
  const router = useRouter();
  const [lines, setLines] = React.useState<PickedLine[]>([]);
  const form = Form.useForm<ManualOrderInput>({
    schema: manualOrderSchema,
    defaultValues: {
      platform: 'facebook',
      userId: '',
      customerName: '',
      email: '',
      fullName: '',
      phone: '',
      addressLine: '',
      division: '',
      city: '',
      area: '',
      zone: 'outside_dhaka',
      items: [],
      shippingFee: '',
      discount: '',
      status: 'confirmed',
      customerNote: '',
      adminNote: '',
    },
  });
  const { isSubmitting } = form.formState;
  const [zone, shippingOverride, discount, userId] = useWatch({
    control: form.control,
    name: ['zone', 'shippingFee', 'discount', 'userId'],
  });

  // Keep the form's `items` in sync with the picked lines (validated by the schema).
  React.useEffect(() => {
    form.setValue(
      'items',
      lines.map((l) => ({ productId: l.product.id, quantity: l.quantity, variant: l.variant })),
      { shouldValidate: form.formState.isSubmitted },
    );
  }, [lines, form]);

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const shipping =
    shippingOverride !== '' && shippingOverride != null
      ? Number(shippingOverride)
      : (fees[zone as ShippingZone] ?? 0);
  const total = Math.max(0, subtotal + shipping - (Number(discount) || 0));

  return (
    <Form
      form={form}
      className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
      onFinish={async (values) => {
        const res = await createManualOrderAction(values);
        if (handleActionResult(res, form)) {
          router.push(`/admin/orders/${res.data.id}`);
          router.refresh();
        }
      }}
    >
      <div className="space-y-6">
        <Panel>
          <FormSection title="Order source" icon="megaphone">
            <FormItem name="platform">
              {(field) => (
                <div className="flex flex-wrap gap-2">
                  {ORDER_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => field.onChange(p)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition',
                        field.value === p
                          ? 'bg-noir border-noir text-white'
                          : 'border-line-2/70 text-ink hover:border-ink bg-white',
                      )}
                    >
                      {ORDER_PLATFORM_LABELS[p]}
                    </button>
                  ))}
                </div>
              )}
            </FormItem>
          </FormSection>
        </Panel>

        <Panel>
          <FormSection
            title="Products"
            icon="box"
            action={<ProductPicker onPick={(l) => setLines((prev) => [...prev, l])} />}
          >
            {lines.length === 0 ? (
              <p className="text-muted text-sm">No products added yet.</p>
            ) : (
              <ul className="divide-line divide-y">
                {lines.map((l, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="bg-well relative size-12 shrink-0 overflow-hidden rounded-lg">
                      <ProductImage src={l.product.image} alt="" fill sizes="48px" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-ink line-clamp-1 text-[13px] font-semibold">
                        {l.product.name}
                      </p>
                      <p className="text-subtle text-[11.5px]">
                        {Object.entries(l.variant)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ') || 'No options'}{' '}
                        · <Taka amount={l.product.price} /> each
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
                    <Taka
                      amount={l.product.price * l.quantity}
                      className="text-ink w-20 text-right text-sm font-semibold"
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
          <FormSection title="Customer" icon="user">
            <CustomerSearch
              linked={!!userId}
              onSelect={(c) => {
                form.setValue('userId', c?.id ?? '');
                if (!c) return;
                const a = c.defaultAddress;
                form.setFieldsValue({
                  customerName: c.name,
                  email: c.email,
                  phone: a?.phone ?? c.phone ?? '',
                  fullName: a?.fullName ?? c.name,
                  ...(a
                    ? {
                        addressLine: a.addressLine,
                        division: a.division ?? '',
                        city: a.city,
                        area: a.area ?? '',
                        zone: a.zone,
                      }
                    : {}),
                });
              }}
            />
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <FormInput
                name="customerName"
                label="Customer name"
                placeholder="As in the chat"
                required
                onBlur={(e) =>
                  !form.getValues('fullName') && form.setValue('fullName', e.target.value)
                }
              />
              <FormInput
                name="phone"
                label="Mobile number"
                placeholder="01XXXXXXXXX"
                required
                inputMode="tel"
              />
              <FormInput
                name="email"
                label="Email (optional)"
                type="email"
                placeholder="customer@example.com"
                className="sm:col-span-2"
              />
            </div>
          </FormSection>
        </Panel>

        <Panel>
          <FormSection title="Delivery" icon="shipping">
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <FormInput
                name="fullName"
                label="Recipient name"
                placeholder="Who receives the parcel"
                required
              />
              <LocationFields />
              <FormInput
                name="addressLine"
                label="Address"
                placeholder="House, road, block / village"
                required
                className="sm:col-span-2"
              />
              <DeliveryZoneNote className="sm:col-span-2" />
            </div>
          </FormSection>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel>
          <FormSection title="Summary" icon="receipt">
            <FormSelect
              name="status"
              label="Initial status"
              items={[
                { value: 'confirmed', label: 'Confirmed (customer already confirmed in chat)' },
                { value: 'pending', label: 'Pending (needs confirmation call)' },
              ]}
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-5">
              <FormCurrency
                name="shippingFee"
                label="Delivery fee"
                placeholder={String(fees[zone as ShippingZone] ?? 0)}
                hint="Blank = zone fee"
              />
              <FormCurrency name="discount" label="Discount" placeholder="0" />
            </div>
            <dl className="bg-surface space-y-1.5 rounded-xl p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>
                  <Taka amount={subtotal} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd>
                  <Taka amount={shipping} />
                </dd>
              </div>
              {Number(discount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Discount</dt>
                  <dd>
                    −<Taka amount={Number(discount)} />
                  </dd>
                </div>
              )}
              <div className="border-line flex justify-between border-t pt-2 text-base font-bold">
                <dt>Total (COD)</dt>
                <dd>
                  <Taka amount={total} />
                </dd>
              </div>
            </dl>
            <FormTextarea
              name="customerNote"
              label="Customer note"
              rows={2}
              placeholder="e.g. Call before delivery"
            />
            <FormTextarea
              name="adminNote"
              label="Internal note"
              rows={2}
              placeholder="e.g. Messenger conversation link"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || lines.length === 0}
            >
              {isSubmitting ? 'Creating…' : 'Create order'}
            </Button>
          </FormSection>
        </Panel>
      </div>
    </Form>
  );
}

function CustomerSearch({
  linked,
  onSelect,
}: {
  linked: boolean;
  onSelect: (c: FoundCustomer | null) => void;
}) {
  const [q, setQ] = React.useState('');
  const debounced = useDebouncedValue(q, 300);
  const [found, setFound] = React.useState<{ query: string; items: FoundCustomer[] }>({
    query: '',
    items: [],
  });
  const [selected, setSelected] = React.useState<FoundCustomer | null>(null);
  const searchable = debounced.trim().length >= 2;
  // Only show results that belong to the current query.
  const results = searchable && found.query === debounced ? found.items : [];
  const setResults = (items: FoundCustomer[]) => setFound({ query: debounced, items });

  React.useEffect(() => {
    if (!searchable) return;
    let cancelled = false;
    customerSearchAction(debounced).then((res) => {
      if (!cancelled && res.ok) setFound({ query: debounced, items: res.data });
    });
    return () => {
      cancelled = true;
    };
  }, [debounced, searchable]);

  if (linked && selected) {
    return (
      <div className="bg-brand-soft flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm">
        <Icon name="userCircle" size={18} className="text-accent" />
        <span className="text-ink flex-1">
          Linked to account <strong>{selected.name}</strong> ({selected.phone ?? selected.email})
        </span>
        <button
          type="button"
          className="text-accent font-semibold"
          onClick={() => {
            setSelected(null);
            onSelect(null);
          }}
        >
          Unlink
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="input-flat flex h-10 items-center gap-2 px-3">
        <Icon name="search" size={15} className="text-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find an existing customer by name, phone or email (optional)"
          className="h-full w-full bg-transparent text-sm outline-none"
        />
      </div>
      {results.length > 0 && (
        <ul className="bg-panel shadow-pop hairline absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl p-1">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="hover:bg-well w-full rounded-lg px-3 py-2 text-left"
                onClick={() => {
                  setSelected(c);
                  setResults([]);
                  setQ('');
                  onSelect(c);
                }}
              >
                <p className="text-ink text-sm font-medium">{c.name}</p>
                <p className="text-subtle text-xs">
                  {[c.phone ?? 'No phone', c.email].filter(Boolean).join(' · ')}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="bg-panel hairline rounded-xl2 p-5">{children}</div>;
}
