'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { useWatch } from 'react-hook-form';

import { placeOrderAction } from '@/actions/checkout';
import { LocationFields } from '@/features/address/location-fields';
import { QuantityStepper } from '@/features/cart/quantity-stepper';
import { useCartQuote } from '@/features/cart/use-cart-quote';
import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import type { AddressDTO, ProductDetailDTO } from '@/types';
import { Form, FormCheckbox, FormInput, FormItem, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { Spinner } from '@components/shared';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { handleActionResult } from '@lib/action-client';
import { type ShippingZone } from '@lib/constants';
import { saveRecentOrder } from '@lib/recent-order';
import { toast } from '@lib/toast';
import { cn } from '@lib/utils';
import { checkLocation } from '@lib/validators/common';
import { checkoutFields, type CheckoutInput } from '@lib/validators/order';

const formSchema = checkoutFields.omit({ items: true }).superRefine(checkLocation);
type FormValues = Omit<CheckoutInput, 'items'>;

type Props = {
  product: ProductDetailDTO;
  user: { name: string; email?: string; phone?: string } | null;
  addresses: AddressDTO[];
  fees: Record<ShippingZone, number>;
};

function fromAddress(a: AddressDTO) {
  return {
    fullName: a.fullName,
    phone: a.phone,
    addressLine: a.addressLine,
    division: a.division ?? '',
    city: a.city,
    area: a.area ?? '',
    zone: a.zone,
  };
}

export function ExpressOrderForm({ product, user, addresses, fees }: Props) {
  const router = useRouter();
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = React.useState<string | 'new'>(defaultAddress?.id ?? 'new');

  const [selected, setSelected] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      product.variations
        .map((v) => {
          const disabled = v.disabledValues ?? [];
          const enabled = v.values.filter((val) => !disabled.includes(val));
          return enabled.length === 1 ? ([v.name, enabled[0]!] as const) : null;
        })
        .filter((entry): entry is readonly [string, string] => entry !== null),
    ),
  );
  const [qty, setQty] = React.useState(1);
  const [showVariantErrors, setShowVariantErrors] = React.useState(false);
  const [couponInput, setCouponInput] = React.useState('');
  const [appliedCoupon, setAppliedCoupon] = React.useState('');
  const [couponAction, setCouponAction] = React.useState<'apply' | 'remove' | null>(null);

  const missing = product.variations.filter((v) => !selected[v.name]);
  const allOptionValuesDisabled = product.variations.some((v) => {
    const disabled = v.disabledValues ?? [];
    return v.values.length > 0 && v.values.every((val) => disabled.includes(val));
  });
  const soldOut = product.stockStatus === 'out_of_stock' || allOptionValuesDisabled;

  const form = Form.useForm<FormValues>({
    schema: formSchema,
    defaultValues: {
      ...(defaultAddress
        ? fromAddress(defaultAddress)
        : {
            fullName: user?.name ?? '',
            phone: user?.phone ?? '',
            addressLine: '',
            division: '',
            city: '',
            area: '',
            zone: 'outside_dhaka',
          }),
      email: user?.email ?? '',
      paymentMethod: 'cod',
      customerNote: '',
      saveAddress: !!user && addresses.length === 0,
    },
  });

  const zone = useWatch({ control: form.control, name: 'zone' }) as ShippingZone | undefined;
  const paymentMethod = useWatch({ control: form.control, name: 'paymentMethod' }) ?? 'cod';
  const clearCouponAction = React.useCallback(() => setCouponAction(null), []);

  const quoteItems = React.useMemo(
    () => [
      {
        key: product.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0],
        price: product.effectivePrice,
        variant: selected,
        quantity: qty,
      },
    ],
    [product.id, product.slug, product.name, product.images, product.effectivePrice, selected, qty],
  );

  const { quote, loading } = useCartQuote(
    quoteItems,
    zone,
    true,
    appliedCoupon,
    clearCouponAction,
  );
  const { isSubmitting } = form.formState;

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
            division: '',
            city: '',
            area: '',
          }),
      saveAddress: !a,
    });
  };

  return (
    <Form
      form={form}
      className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
      onFinish={async (values) => {
        if (soldOut) {
          toast.error('This product is currently out of stock.');
          return;
        }
        if (missing.length > 0) {
          setShowVariantErrors(true);
          toast.warning(`Please choose ${missing.map((m) => m.name.toLowerCase()).join(' and ')}`);
          return;
        }
        const res = await placeOrderAction({
          ...values,
          couponCode: appliedCoupon || undefined,
          items: [
            {
              productId: product.id,
              quantity: qty,
              variant: selected,
            },
          ],
        });
        if (handleActionResult(res, form, { successToast: false })) {
          saveRecentOrder(res.data.orderNumber, values.phone);
          if (values.paymentMethod === 'paymently') {
            try {
              const payRes = await fetch('/api/payments/paymently/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: res.data.orderId,
                  paymentToken: res.data.paymentToken,
                }),
              });
              const payJson = (await payRes.json()) as {
                ok?: boolean;
                paymentUrl?: string;
                error?: string;
              };
              if (payRes.ok && payJson.ok && payJson.paymentUrl) {
                window.location.assign(payJson.paymentUrl);
                return;
              }
              toast.error('Online payment could not be started', {
                description: payJson.error || 'You can retry payment from your order page.',
              });
            } catch {
              toast.error('Unable to reach payment gateway', {
                description: 'Your order was saved — you can retry payment now.',
              });
            }
            router.push(`/order-success/${res.data.orderNumber}?gateway=paymently&error=1`);
            return;
          }
          router.push(`/order-success/${res.data.orderNumber}`);
        }
      }}
    >
      <div className="space-y-6">
        {/* Step 1: Variant & Quantity */}
        <section className="border-line space-y-4 rounded-2xl border bg-white p-5 sm:p-6">
          <h2 className="text-ink text-lg font-bold">1. Select Option & Quantity</h2>

          {product.variations.map((v) => {
            const err = showVariantErrors && !selected[v.name];
            return (
              <fieldset key={v.name}>
                <legend className="text-ink mb-2 text-sm font-semibold">
                  {v.name}
                  {selected[v.name] && (
                    <span className="text-muted font-normal">: {selected[v.name]}</span>
                  )}
                  {err && (
                    <span className="ml-2 text-xs font-medium text-[var(--status-danger-fg)]">
                      Required
                    </span>
                  )}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {v.values.map((val) => {
                    const isDisabled = (v.disabledValues ?? []).includes(val);
                    const on = selected[v.name] === val && !isDisabled;
                    return (
                      <button
                        key={val}
                        type="button"
                        disabled={isDisabled}
                        aria-pressed={on}
                        title={isDisabled ? 'Out of stock' : undefined}
                        onClick={() => setSelected((s) => ({ ...s, [v.name]: val }))}
                        className={cn(
                          'min-w-12 rounded-full border px-4 py-2 text-sm font-medium transition',
                          isDisabled
                            ? 'border-line bg-well text-subtle cursor-not-allowed line-through opacity-50'
                            : on
                              ? 'bg-noir border-noir text-white'
                              : cn(
                                  'text-ink hover:border-ink bg-white',
                                  err ? 'border-[var(--status-danger-fg)]' : 'border-line-2/70',
                                ),
                        )}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <div className="flex items-center justify-between pt-1">
            <span className="text-ink text-sm font-semibold">Quantity</span>
            <QuantityStepper value={qty} onChange={setQty} />
          </div>
        </section>

        {/* Step 2: Delivery Address */}
        <section className="border-line space-y-4 rounded-2xl border bg-white p-5 sm:p-6">
          <h2 className="text-ink text-lg font-bold">2. Delivery Address</h2>

          {addresses.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => pickAddress(a.id)}
                  className={cn(
                    'rounded-xl border p-3 text-left text-xs transition',
                    addressId === a.id
                      ? 'border-brand bg-brand-soft/60'
                      : 'border-line hover:border-line-2 bg-white',
                  )}
                >
                  <p className="text-ink font-semibold">
                    {a.label} · {a.fullName}
                  </p>
                  <p className="text-muted mt-0.5 line-clamp-1">
                    {a.addressLine}, {a.city}
                  </p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => pickAddress('new')}
                className={cn(
                  'rounded-xl border border-dashed p-3 text-left text-xs font-medium transition',
                  addressId === 'new'
                    ? 'border-brand bg-brand-soft/60 text-brand-ink'
                    : 'border-line-2 text-muted hover:text-ink',
                )}
              >
                + Use a different address
              </button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput name="fullName" label="Full name" required placeholder="Your full name" />
            <FormInput
              name="phone"
              label="Mobile number"
              required
              type="tel"
              placeholder="01XXXXXXXXX"
            />
          </div>

          <LocationFields />

          <FormTextarea
            name="addressLine"
            label="Full address"
            required
            rows={2}
            placeholder="House, road, block / sector, landmark…"
          />

          <FormInput
            name="customerNote"
            label="Order note (optional)"
            placeholder="Preferred delivery time or instructions…"
          />

          {user && addressId === 'new' && (
            <FormCheckbox name="saveAddress" label="Save this address for future orders" />
          )}
        </section>

        {/* Step 3: Payment Method */}
        <section className="border-line space-y-3 rounded-2xl border bg-white p-5 sm:p-6">
          <h2 className="text-ink text-lg font-bold">3. Payment Method</h2>
          <FormItem name="paymentMethod">
            {(field) => (
              <div className="grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => field.onChange('cod')}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                    field.value === 'cod'
                      ? 'border-brand bg-brand-soft/70 text-ink'
                      : 'border-line text-muted hover:border-line-2',
                  )}
                >
                  <Icon name="money" size={18} className="text-accent shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Cash on Delivery</p>
                    <p className="text-xs opacity-80">Pay when you receive</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange('paymently')}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                    field.value === 'paymently'
                      ? 'border-brand bg-brand-soft/70 text-ink'
                      : 'border-line text-muted hover:border-line-2',
                  )}
                >
                  <Icon name="card" size={18} className="text-accent shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Pay Online</p>
                    <p className="text-xs opacity-80">bKash, Nagad, Card</p>
                  </div>
                </button>
              </div>
            )}
          </FormItem>
        </section>
      </div>

      {/* Sticky Order Summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border-line space-y-4 rounded-2xl border bg-white p-5 sm:p-6">
          <h2 className="text-ink text-lg font-bold">Order Summary</h2>

          <div className="flex items-center gap-3">
            <div className="bg-well relative size-16 shrink-0 overflow-hidden rounded-xl">
              <ProductImage src={product.images[0]?.url} alt={product.name} fill sizes="64px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-ink line-clamp-2 text-sm font-semibold">{product.name}</p>
              <p className="text-muted text-xs">
                Qty: {qty}
                {Object.keys(selected).length > 0 &&
                  ` · ${Object.values(selected).join(', ')}`}
              </p>
            </div>
            <Taka amount={product.effectivePrice * qty} className="text-ink text-sm font-bold" />
          </div>

          <div className="border-line border-t pt-3">
            <div className="flex gap-2">
              <Input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Coupon code (optional)"
                className="h-9 flex-1 font-mono text-xs uppercase"
                disabled={!!appliedCoupon}
              />
              {appliedCoupon ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={couponAction === 'remove'}
                  onClick={() => {
                    setCouponAction('remove');
                    setAppliedCoupon('');
                    setCouponInput('');
                  }}
                >
                  {couponAction === 'remove' ? <Spinner size="sm" /> : 'Remove'}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!couponInput.trim() || couponAction === 'apply'}
                  onClick={() => {
                    setCouponAction('apply');
                    setAppliedCoupon(couponInput.trim().toUpperCase());
                  }}
                >
                  {couponAction === 'apply' ? <Spinner size="sm" /> : 'Apply'}
                </Button>
              )}
            </div>
            {quote?.couponError && (
              <p className="mt-1.5 text-xs text-[var(--status-danger-fg)]">{quote.couponError}</p>
            )}
            {quote?.appliedCampaign && (
              <p className="mt-1.5 text-xs font-medium text-[var(--status-ok-fg)]">
                Offer applied: {quote.appliedCampaign.title}
              </p>
            )}
          </div>

          <dl className="border-line space-y-2 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-ink font-medium">
                {quote ? <Taka amount={quote.subtotal} /> : <Taka amount={product.effectivePrice * qty} />}
              </dd>
            </div>
            {quote && quote.discount > 0 && (
              <div className="flex justify-between text-[var(--status-ok-fg)]">
                <dt>Discount</dt>
                <dd className="font-semibold">
                  −<Taka amount={quote.discount} />
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd className="text-ink font-medium">
                {(() => {
                  const baseFee = fees[zone ?? 'outside_dhaka'];
                  if (!quote) return <Taka amount={baseFee} />;
                  const discounted = quote.shippingFee < baseFee;
                  return (
                    <span className="inline-flex items-center gap-1.5">
                      {discounted && (
                        <Taka amount={baseFee} className="text-muted text-xs line-through" />
                      )}
                      {quote.shippingFee === 0 ? (
                        <span className="font-semibold text-[var(--status-ok-fg)]">Free</span>
                      ) : (
                        <Taka
                          amount={quote.shippingFee}
                          className={discounted ? 'font-semibold text-[var(--status-ok-fg)]' : undefined}
                        />
                      )}
                    </span>
                  );
                })()}
              </dd>
            </div>
            <div className="border-line flex justify-between border-t pt-3">
              <dt className="text-ink font-bold">
                {paymentMethod === 'paymently' ? 'Total (Pay Online)' : 'Total (Cash on Delivery)'}
              </dt>
              <dd className="text-ink text-xl font-bold">
                {quote ? (
                  <Taka amount={quote.total} />
                ) : (
                  <Taka amount={product.effectivePrice * qty + fees[zone ?? 'inside_dhaka']} />
                )}
              </dd>
            </div>
          </dl>

          <Button
            type="submit"
            variant="primary"
            size="xl"
            className="w-full"
            disabled={soldOut || isSubmitting || loading}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" /> Placing Order…
              </>
            ) : soldOut ? (
              'Out of Stock'
            ) : (
              <>
                <Icon name="check" size={18} />
                Confirm Order
              </>
            )}
          </Button>
        </div>
      </aside>
    </Form>
  );
}
