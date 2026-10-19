'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWatch } from 'react-hook-form';

import { placeOrderAction } from '@/actions/checkout';
import { LineOptions } from '@/features/cart/line-options';
import { useCartQuote } from '@/features/cart/use-cart-quote';
import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import { useCart } from '@/stores/cart-store';
import type { AddressDTO } from '@/types';
import { Form, FormCheckbox, FormInput, FormItem, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { useHydrated } from '@hooks/use-hydrated';
import { handleActionResult } from '@lib/action-client';
import { SHIPPING_ZONE_LABELS, SHIPPING_ZONES, type ShippingZone } from '@lib/constants';
import { cn } from '@lib/utils';
import { type CheckoutInput, checkoutSchema } from '@lib/validators/order';

// The cart lines live in the cart store, not in the form; they are attached on
// submit and the server validates the full payload.
const formSchema = checkoutSchema.omit({ items: true });
type FormValues = Omit<CheckoutInput, 'items'>;

type Props = {
  user: { name: string; email: string; phone?: string } | null;
  addresses: AddressDTO[];
  fees: Record<ShippingZone, number>;
  className?: string;
};

function fromAddress(a: AddressDTO) {
  return {
    fullName: a.fullName,
    phone: a.phone,
    addressLine: a.addressLine,
    area: a.area ?? '',
    city: a.city,
    zone: a.zone,
  };
}

export function CheckoutForm({ user, addresses, fees, className }: Props) {
  const router = useRouter();
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const setVariant = useCart((s) => s.setVariant);
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = React.useState<string | 'new'>(defaultAddress?.id ?? 'new');
  const [placed, setPlaced] = React.useState(false);

  const form = Form.useForm<FormValues>({
    schema: formSchema,
    defaultValues: {
      ...(defaultAddress
        ? fromAddress(defaultAddress)
        : {
            fullName: user?.name ?? '',
            phone: user?.phone ?? '',
            addressLine: '',
            area: '',
            city: 'Dhaka',
            zone: 'inside_dhaka',
          }),
      email: user?.email ?? '',
      customerNote: '',
      saveAddress: !!user && addresses.length === 0,
    },
  });
  const zone = useWatch({ control: form.control, name: 'zone' }) as ShippingZone | undefined;
  const { quote, loading } = useCartQuote(items, zone, hydrated);
  const { isSubmitting } = form.formState;
  const issues = quote?.lines.filter((l) => !l.available) ?? [];

  const pickAddress = (id: string | 'new') => {
    setAddressId(id);
    const a = addresses.find((x) => x.id === id);
    form.reset({
      ...form.getValues(),
      ...(a
        ? fromAddress(a)
        : {
            fullName: user?.name ?? '',
            phone: user?.phone ?? '',
            addressLine: '',
            area: '',
            city: '',
          }),
      saveAddress: !a,
    });
  };

  if (hydrated && items.length === 0 && !placed) {
    return (
      <div
        className={cn(
          'bg-cream flex flex-col items-center rounded-3xl px-6 py-20 text-center',
          className,
        )}
      >
        <h2 className="font-display text-ink text-2xl">Your cart is empty</h2>
        <Button variant="noir" size="xl" asChild className="mt-6">
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form
      form={form}
      className={cn('grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px]', className)}
      onFinish={async (values) => {
        const res = await placeOrderAction({
          ...values,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            variant: i.variant,
          })),
        });
        if (handleActionResult(res, form, { successToast: false })) {
          setPlaced(true);
          clear();
          router.push(`/order-success/${res.data.orderNumber}`);
        }
      }}
    >
      <div className="space-y-8">
        {!user && (
          <div className="bg-cream flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm">
            <span className="text-ink">
              Have an account? Sign in to track orders and save addresses.
            </span>
            <Link
              href="/login?next=/checkout"
              className="text-ink font-semibold underline underline-offset-2"
            >
              Sign in
            </Link>
          </div>
        )}

        <Step n={1} title="Delivery address">
          {addresses.length > 0 && (
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <AddressChoice
                  key={a.id}
                  active={addressId === a.id}
                  onClick={() => pickAddress(a.id)}
                >
                  <p className="text-ink font-semibold">
                    {a.label}{' '}
                    {a.isDefault && <span className="text-accent text-xs">· Default</span>}
                  </p>
                  <p className="text-muted mt-1 text-[13px] leading-snug">
                    {a.fullName}, {a.phone}
                    <br />
                    {a.addressLine}, {a.area ? `${a.area}, ` : ''}
                    {a.city}
                  </p>
                </AddressChoice>
              ))}
              <AddressChoice active={addressId === 'new'} onClick={() => pickAddress('new')}>
                <p className="text-ink flex items-center gap-2 font-semibold">
                  <Icon name="plus" size={15} /> New address
                </p>
              </AddressChoice>
            </div>
          )}
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <FormInput name="fullName" label="Full name" required autoComplete="name" />
            <FormInput
              name="phone"
              label="Mobile number"
              required
              placeholder="01XXXXXXXXX"
              inputMode="tel"
              autoComplete="tel"
            />
            <FormInput
              name="addressLine"
              label="Address"
              required
              placeholder="House, road, block / village"
              autoComplete="street-address"
              className="sm:col-span-2"
            />
            <FormInput name="area" label="Area / Thana" placeholder="e.g. Badda" />
            <FormInput
              name="city"
              label="City / District"
              required
              placeholder="e.g. Dhaka"
              autoComplete="address-level2"
            />
            <FormInput
              name="email"
              label="Email (optional)"
              type="email"
              autoComplete="email"
              className="sm:col-span-2"
            />
          </div>
          {user && addressId === 'new' && (
            <div className="mt-4">
              <FormCheckbox name="saveAddress" label="Save this address to my account" />
            </div>
          )}
        </Step>

        <Step n={2} title="Delivery area">
          <FormItem name="zone">
            {(field) => (
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
                {SHIPPING_ZONES.map((z) => (
                  <AddressChoice
                    key={z}
                    active={field.value === z}
                    onClick={() => field.onChange(z)}
                    role="radio"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-ink font-semibold">{SHIPPING_ZONE_LABELS[z]}</p>
                      <Taka amount={fees[z]} className="text-ink font-bold" />
                    </div>
                    <p className="text-muted mt-1 text-[13px]">
                      {z === 'inside_dhaka' ? 'Usually 1–3 days' : 'Usually 3–5 days'}
                    </p>
                  </AddressChoice>
                ))}
              </div>
            )}
          </FormItem>
        </Step>

        <Step n={3} title="Payment">
          <div className="border-noir bg-cream flex items-center gap-4 rounded-2xl border-2 px-5 py-4">
            <span className="bg-noir text-brand-300 grid size-11 place-items-center rounded-full">
              <Icon name="money" size={20} />
            </span>
            <div className="cap-trim">
              <p className="text-ink leading-tight font-semibold">Cash on Delivery</p>
              <p className="text-muted mt-1.5 text-[13px] leading-tight">
                Pay in cash when you receive your order.
              </p>
            </div>
            <Icon name="checkCircle" size={22} className="text-ink ml-auto" />
          </div>
          <FormTextarea
            name="customerNote"
            label="Order note (optional)"
            placeholder="Anything we should know about your order or delivery?"
            rows={3}
            className="mt-5"
          />
        </Step>
      </div>

      <aside className="bg-cream h-fit rounded-3xl p-6 lg:sticky lg:top-[150px]">
        <h2 className="font-display text-ink text-xl font-medium">Your order</h2>
        <ul className="divide-line mt-4 max-h-80 divide-y overflow-y-auto">
          {(hydrated ? items : []).map((item, idx) => {
            const line = quote?.lines[idx];
            return (
              <li key={item.key} className="flex gap-3 py-3">
                <span className="bg-panel relative size-14 shrink-0 overflow-hidden rounded-xl">
                  <ProductImage src={item.image?.url} alt={item.name} fill sizes="56px" />
                  <span className="bg-noir absolute -top-0 -right-0 grid size-5 place-items-center rounded-bl-lg text-[10px] font-bold text-white">
                    {item.quantity}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-ink line-clamp-2 text-[13px] font-semibold">{item.name}</p>
                  {Object.keys(item.variant).length > 0 && (
                    <p className="text-muted text-xs">{Object.values(item.variant).join(' · ')}</p>
                  )}
                  {line && (
                    <LineOptions
                      className="mt-1.5"
                      options={line.options}
                      value={item.variant}
                      onChange={(v) => setVariant(item.key, v)}
                    />
                  )}
                  {line && !line.available && (
                    <p className="text-xs text-[var(--status-danger-fg)]">{line.issue}</p>
                  )}
                </div>
                <Taka
                  amount={line?.lineTotal ?? item.price * item.quantity}
                  className="text-ink text-sm font-semibold"
                />
              </li>
            );
          })}
        </ul>
        <dl className="border-line mt-3 space-y-2.5 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="text-ink font-medium">
              {quote ? <Taka amount={quote.subtotal} /> : '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd className="text-ink font-medium">
              {quote ? (
                quote.shippingFee === 0 ? (
                  <span className="text-[var(--status-ok-fg)]">Free</span>
                ) : (
                  <Taka amount={quote.shippingFee} />
                )
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div className="border-line flex justify-between border-t pt-3">
            <dt className="text-ink font-semibold">Total (pay on delivery)</dt>
            <dd className="text-ink text-xl font-bold">
              {quote ? <Taka amount={quote.total} /> : '—'}
            </dd>
          </div>
        </dl>
        <Button
          type="submit"
          variant="noir"
          size="xl"
          className="mt-6 w-full"
          disabled={isSubmitting || loading || !quote || issues.length > 0}
        >
          {isSubmitting ? 'Placing order…' : 'Place order'}
        </Button>
        {issues.length > 0 && (
          <p className="mt-3 text-center text-xs text-[var(--status-danger-fg)]">
            Some items are unavailable —{' '}
            <Link href="/cart" className="underline">
              update your cart
            </Link>
            .
          </p>
        )}
        <p className="text-muted mt-4 text-center text-xs">
          By placing your order you agree to our{' '}
          <Link href="/return-policy" className="underline">
            return policy
          </Link>
          .
        </p>
      </aside>
    </Form>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-ink mb-4 flex items-center gap-3 text-lg font-semibold">
        <span className="bg-noir grid size-8 place-items-center rounded-full text-sm text-white">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function AddressChoice({
  active,
  onClick,
  children,
  role = 'radio',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'rounded-2xl border-2 bg-white px-4 py-3.5 text-left transition',
        active ? 'border-noir shadow-pop' : 'border-line hover:border-line-2',
      )}
    >
      {children}
    </button>
  );
}
