'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';

import { useI18n } from '@/i18n/provider';
import { CourierHistoryModal } from '@/features/fraud-checker/courier-history-modal';
import { useResellerAuth } from '@/stores/reseller-auth';
import { Panel } from '@components/dashboard/panel';
import { Form, FormInput, FormSelect, FormTextarea, useWatch } from '@components/form';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { ProductImage } from '@components/platform/product-image';
import { Callout, ConfirmDialog, PageHeader } from '@components/shared';
import { CurrencyInput, QuantityInput } from '@components/shared/numeric-format-input';
import { Button } from '@components/ui/button';
import { Label } from '@components/ui/label';
import { Select } from '@components/ui/select';
import { ApiError } from '@lib/api/client';
import { resellerApi, type ResellerOrder } from '@lib/api/reseller';
import { areasOf, districtsOf, DIVISIONS as BD_DIVISIONS } from '@lib/locations';
import { checkSellingPrice } from '@lib/business/pricing';
import { toast } from '@lib/toast';
import { BD_PHONE } from '@lib/validators/reseller';

import { useSellerCatalog, useSellerWallet } from '../../components/use-seller-data';

type CustomerFormValues = {
  name: string;
  phone: string;
  email: string;
  division: string;
  district: string;
  area: string;
  street: string;
  customerNote: string;
};

type OrderItemDraft = {
  key: string;
  productId: string;
  sellingInput?: number;
  qty: number;
  variantInput: Record<string, string>;
};

export function PlaceOrder() {
  const { t, locale, money } = useI18n();
  const params = useSearchParams();
  const refreshMe = useResellerAuth((s) => s.refreshMe);
  const { wallet, reload: reloadWallet } = useSellerWallet();
  const { products, loading: catalogLoading } = useSellerCatalog();

  const orderable = React.useMemo(
    () => products.filter((p) => p.status === 'active' && p.availability !== 'out_of_stock'),
    [products],
  );

  const paramProduct = params.get('product');
  const paramPrice = Number(params.get('price')) || undefined;
  const [items, setItems] = React.useState<OrderItemDraft[]>(() => [
    {
      key: 'item-1',
      productId: '',
      sellingInput: paramPrice,
      qty: 1,
      variantInput: {},
    },
  ]);
  const [confirming, setConfirming] = React.useState<CustomerFormValues | null>(null);
  const [removingKey, setRemovingKey] = React.useState<string | null>(null);
  const [deliveryPaymentMode, setDeliveryPaymentMode] = React.useState<'with_product' | 'advance'>(
    'with_product',
  );
  const [placing, setPlacing] = React.useState(false);
  const [placed, setPlaced] = React.useState<ResellerOrder | null>(null);
  const [fraudOpen, setFraudOpen] = React.useState(false);

  const paramResolvedId = React.useMemo(
    () =>
      paramProduct
        ? orderable.find((p) => p.id === paramProduct || p.slug === paramProduct)?.id || ''
        : '',
    [orderable, paramProduct],
  );

  const resolvedItems = React.useMemo(
    () =>
      items.map((item, idx) => {
        const pid = item.productId || (idx === 0 ? paramResolvedId : '');
        const product = products.find((p) => p.id === pid);
        const selling =
          item.sellingInput ?? (product ? product.suggestedPrice || product.basePrice : undefined);
        const variant: Record<string, string> = {};
        if (product?.variations) {
          for (const v of product.variations) {
            variant[v.name] = item.variantInput[v.name] ?? v.values[0] ?? '';
          }
        }
        const basePrice = product?.basePrice ?? 0;
        const priceCheck = product ? checkSellingPrice(selling, basePrice) : 'empty';
        const sellingVal = selling ?? 0;
        return {
          ...item,
          productId: pid,
          product,
          selling,
          sellingVal,
          basePrice,
          priceCheck,
          variant,
        };
      }),
    [items, paramResolvedId, products],
  );

  const updateItem = (key: string, patch: Partial<OrderItemDraft>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: `item-${Date.now()}-${prev.length + 1}`,
        productId: '',
        sellingInput: undefined,
        qty: 1,
        variantInput: {},
      },
    ]);
  };

  const removeItem = (key: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  };

  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t('common.required')),
        phone: z.string().trim().regex(BD_PHONE, t('common.invalidPhone')),
        email: z.string().trim().email(t('common.invalidEmail')).or(z.literal('')).default(''),
        division: z.string().trim().min(2, t('common.required')),
        district: z.string().trim().min(2, t('common.required')),
        area: z.string().trim().min(2, t('common.required')),
        street: z.string().trim().min(4, t('common.required')),
        customerNote: z.string().trim().optional().default(''),
      }),
    [t],
  );

  const form = Form.useForm<CustomerFormValues>({
    schema,
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      division: 'Dhaka',
      district: 'Dhaka',
      area: 'Mirpur',
      street: '',
      customerNote: '',
    },
  });

  const [division, district, phone] = useWatch({
    control: form.control,
    name: ['division', 'district', 'phone'],
  });
  const cleanPhone = (phone ?? '').trim().replace(/[\s-]/g, '').replace(/^\+?88/, '');
  const isValidPhone = /^01[3-9]\d{8}$/.test(cleanPhone);

  React.useEffect(() => {
    const validDistricts = districtsOf(division);
    if (validDistricts.length === 0) return;
    const matched = validDistricts.find((d) => d.name === district);
    if (!matched) {
      const nextDistrict = validDistricts[0]!.name;
      const nextAreas = areasOf(division, nextDistrict);
      form.setValue('district', nextDistrict, { shouldValidate: true });
      form.setValue('area', nextAreas[0] ?? '', { shouldValidate: true });
      return;
    }
    const currentArea = form.getValues('area');
    if (matched.areas.length > 0 && !matched.areas.includes(currentArea)) {
      form.setValue('area', matched.areas[0]!, { shouldValidate: true });
    }
  }, [division, district, form]);

  const validItems = resolvedItems.filter(
    (it): it is typeof it & { product: NonNullable<typeof it.product> } => !!it.product,
  );
  const isInsideDhaka = district?.toLowerCase() === 'dhaka';
  const deliveryCharge = validItems.length
    ? Math.max(
        ...validItems.map((it) =>
          isInsideDhaka ? it.product.deliveryCharges.insideDhaka : it.product.deliveryCharges.outsideDhaka,
        ),
      )
    : 0;
  const packagingCost = validItems.length
    ? Math.max(...validItems.map((it) => it.product.packagingCharge ?? 0))
    : 0;
  const upfrontCost = deliveryCharge + packagingCost;

  const totalQty = validItems.reduce((sum, it) => sum + it.qty, 0);
  const sellingTotal = validItems.reduce((sum, it) => sum + it.sellingVal * it.qty, 0);
  const expectedProfit =
    validItems.reduce((sum, it) => sum + (it.sellingVal - it.basePrice) * it.qty, 0) -
    packagingCost;
  const deliveryInAdvance = deliveryPaymentMode === 'advance';
  const codTotal = deliveryInAdvance ? sellingTotal : sellingTotal + deliveryCharge;
  const sufficient = wallet.walletBalance >= upfrontCost;
  const short = Math.max(0, upfrontCost - wallet.walletBalance);
  const ready =
    validItems.length > 0 &&
    validItems.length === resolvedItems.length &&
    validItems.every(
      (it) => (it.priceCheck === 'ok' || it.priceCheck === 'equal_base') && it.qty >= 1,
    );

  const submit = (c: CustomerFormValues) => {
    if (!ready) {
      const invalid = resolvedItems.find(
        (it) => it.product && it.priceCheck === 'below_base',
      );
      toast.error(
        invalid?.product
          ? t('seller.order.belowBase', { amount: money(invalid.product.basePrice) })
          : t('seller.order.selectProduct'),
      );
      return;
    }
    if (!sufficient) {
      toast.error(t('seller.order.insufficient'));
      return;
    }
    setConfirming(c);
  };

  const confirmOrder = async () => {
    if (!confirming || validItems.length === 0 || placing) return;
    setPlacing(true);
    try {
      const order = await resellerApi.placeOrder({
        customer: {
          name: confirming.name.trim(),
          phone: confirming.phone.trim(),
          email: confirming.email.trim() || undefined,
        },
        shippingAddress: {
          division: confirming.division.trim(),
          district: confirming.district.trim(),
          area: confirming.area.trim(),
          street: confirming.street.trim(),
        },
        items: validItems.map((it) => ({
          productId: it.product.id,
          quantity: it.qty,
          sellingPrice: it.sellingVal,
          variant: Object.keys(it.variant).length > 0 ? it.variant : undefined,
        })),
        customerNote:
          [
            confirming.customerNote.trim(),
            deliveryInAdvance ? 'Delivery charge already paid in advance by customer' : '',
          ]
            .filter(Boolean)
            .join(' | ') || undefined,
      });
      setPlaced(order);
      setConfirming(null);
      await Promise.all([refreshMe(), reloadWallet()]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(`Order ${order.orderNumber} placed!`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('common.somethingWrong'));
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    const s = placed.resellerSummary;
    return (
      <div className="mx-auto max-w-lg py-8 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]">
          <Icon name="checkCircle" size={40} />
        </span>
        <h1 className="type-page-title text-ink mt-6">{t('seller.order.successTitle')}</h1>
        <p className="type-body text-muted mt-2">
          Order <span className="font-mono font-bold text-ink">{placed.orderNumber}</span> has been
          placed.
        </p>
        {s && (
          <div className="bg-panel border-line mt-6 space-y-2 rounded-2xl border p-5 text-left text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted">Reseller Price Total</span>
              <Money value={s.resellerPriceTotal} className="font-semibold" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Your Selling Total</span>
              <Money value={s.resellerSellingTotal} className="font-semibold" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Upfront Deducted (Delivery + Packaging)</span>
              <Money value={s.upfrontDeducted} className="text-danger font-semibold" />
            </div>
            <div className="border-line flex justify-between border-t pt-2">
              <span className="text-ink font-bold">Expected Profit (on delivery)</span>
              <Money
                value={s.expectedResellerProfit}
                className="font-extrabold text-[var(--status-ok-fg)]"
              />
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="primary" asChild>
            <Link href={`/seller/orders/${placed.id}`}>{t('common.viewDetails')}</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/seller/orders">{t('nav.myOrders')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const districts = districtsOf(division).map((d) => ({
    value: d.name,
    label: locale === 'bn' ? `${d.nameBn} (${d.name})` : d.name,
  }));
  const upazilas = areasOf(division, district);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.order.title')}
        description={t('seller.order.subtitle')}
        backHref="/seller/orders"
        backLabel={t('nav.myOrders')}
      />

      <Form<CustomerFormValues>
        form={form}
        onFinish={submit}
        className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]"
      >
        <div className="space-y-5">
          <Panel title={t('seller.order.selectProduct')}>
            {catalogLoading ? (
              <div className="skeleton h-12 rounded-xl" />
            ) : (
              <div className="space-y-4">
                {resolvedItems.map((item, idx) => (
                  <div
                    key={item.key}
                    className={
                      resolvedItems.length > 1
                        ? 'border-line rounded-xl border p-3.5'
                        : undefined
                    }
                  >
                    {resolvedItems.length > 1 && (
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="text-muted text-xs font-semibold">
                          Product #{idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="danger"
                          size="xs"
                          onClick={() => setRemovingKey(item.key)}
                        >
                          <Icon name="trash" size={14} />
                          Remove
                        </Button>
                      </div>
                    )}

                    <Select
                      value={item.productId}
                      onValueChange={(id) => {
                        const next = products.find((p) => p.id === id);
                        updateItem(item.key, {
                          productId: id,
                          sellingInput: next ? next.suggestedPrice || next.basePrice : undefined,
                          variantInput: {},
                        });
                      }}
                      placeholder={t('seller.order.selectProduct')}
                      showSearch
                      items={orderable.map((p) => ({
                        value: p.id,
                        label: `${p.name} — ${money(p.basePrice)}`,
                      }))}
                    />

                    {item.product && (
                      <div className="bg-well/50 mt-3 flex items-center gap-4 rounded-xl p-3">
                        <ProductImage
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="size-16 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-ink truncate font-semibold">{item.product.name}</p>
                          <p className="text-muted text-xs">
                            Reseller Price:{' '}
                            <Money value={item.product.basePrice} className="font-bold" /> ·
                            Suggested: <Money value={item.product.suggestedPrice} />
                          </p>
                        </div>
                      </div>
                    )}

                    {item.product && (
                      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="mb-1.5">
                            {t('seller.product.sellingPrice')}
                            <span className="text-[var(--status-danger-fg)]" aria-hidden>
                              *
                            </span>
                          </Label>
                          <CurrencyInput
                            value={item.selling}
                            onValueChange={(v) =>
                              updateItem(item.key, { sellingInput: v ?? undefined })
                            }
                            aria-invalid={item.priceCheck === 'below_base' || undefined}
                          />
                          {item.priceCheck === 'below_base' && (
                            <p className="mt-1 text-xs text-[var(--status-danger-fg)]">
                              Must be at least {money(item.product.basePrice)}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="mb-1.5">
                            {t('common.quantity')}
                            <span className="text-[var(--status-danger-fg)]" aria-hidden>
                              *
                            </span>
                          </Label>
                          <QuantityInput
                            value={item.qty}
                            onValueChange={(v) => updateItem(item.key, { qty: v ?? 0 })}
                            min={1}
                            max={50}
                            aria-invalid={item.qty < 1 || undefined}
                          />
                          {item.qty < 1 && (
                            <p className="mt-1 text-xs text-[var(--status-danger-fg)]">
                              Quantity must be at least 1
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {item.product?.variations && item.product.variations.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {item.product.variations.map((v) => (
                          <div key={v.name}>
                            <Label className="mb-1.5">
                              {v.name}
                              <span className="text-[var(--status-danger-fg)]" aria-hidden>
                                *
                              </span>
                            </Label>
                            <Select
                              value={item.variant[v.name] ?? ''}
                              onValueChange={(val) =>
                                updateItem(item.key, {
                                  variantInput: { ...item.variantInput, [v.name]: val },
                                })
                              }
                              items={v.values.map((val) => ({ value: val, label: val }))}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={addItem}
                  className="w-full"
                >
                  <Icon name="plus" size={15} />
                  Add another product
                </Button>
              </div>
            )}
          </Panel>

          <Panel title={t('seller.orders.customerInfo')}>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              <FormInput name="name" label={t('common.name')} placeholder="Naim Alom" required />
              <div>
                <div className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
                  <Label htmlFor="phone">
                    {t('common.phone')}
                    <span className="text-[var(--status-danger-fg)]" aria-hidden>
                      *
                    </span>
                  </Label>
                  {isValidPhone && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      className="h-5 px-2 text-[11px]"
                      onClick={() => setFraudOpen(true)}
                    >
                      <Icon name="search" size={12} />
                      Check Fraud
                    </Button>
                  )}
                </div>
                <FormInput name="phone" placeholder="01811223344" />
              </div>
              <FormInput
                name="email"
                type="email"
                label={`${t('common.email')} (${t('common.optional')})`}
                placeholder="customer@example.com"
                className="sm:col-span-2"
              />
              <FormSelect
                name="division"
                label="Division"
                items={BD_DIVISIONS.map((d) => ({
                  value: d.name,
                  label: locale === 'bn' ? `${d.nameBn} (${d.name})` : d.name,
                }))}
                required
              />
              <FormSelect
                name="district"
                label={t('auth.district')}
                items={districts}
                showSearch
                required
              />
              {upazilas.length > 0 ? (
                <FormSelect
                  name="area"
                  label="Area / Upazila"
                  items={upazilas.map((u) => ({ value: u, label: u }))}
                  showSearch
                  required
                />
              ) : (
                <FormInput name="area" label="Area / Upazila" placeholder="Mirpur" required />
              )}
              <FormInput
                name="street"
                label="Street Address"
                placeholder="House 12, Road 4, Block B"
                required
              />
              <FormTextarea
                name="customerNote"
                label={t('common.note')}
                placeholder="Call before delivery"
                className="sm:col-span-2"
                rows={2}
              />
            </div>
          </Panel>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Panel title={t('seller.order.summary')}>
            <dl className="divide-line divide-y text-[13px]">
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">Selling Total × {totalQty}</dt>
                <dd>
                  <Money value={sellingTotal} className="font-semibold" />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">
                  {t('invoice.deliveryCharge')} ({isInsideDhaka ? 'Inside Dhaka' : 'Outside Dhaka'})
                </dt>
                <dd>
                  <Money value={deliveryCharge} className="font-semibold" />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-ink font-bold">Customer COD Total</dt>
                <dd>
                  <Money value={codTotal} className="text-accent font-extrabold" />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">{t('invoice.packagingCharge')}</dt>
                <dd>
                  <Money value={packagingCost} className="font-semibold" />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-ink font-bold">Expected Profit</dt>
                <dd>
                  <Money
                    value={expectedProfit}
                    className={
                      expectedProfit < 0
                        ? 'font-extrabold text-[var(--status-danger-fg)]'
                        : 'font-extrabold text-[var(--status-ok-fg)]'
                    }
                  />
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <Label className="mb-1.5">
                Delivery charge payment
                <span className="text-[var(--status-danger-fg)]" aria-hidden>
                  *
                </span>
              </Label>
              <Select
                value={deliveryPaymentMode}
                onValueChange={(v) => setDeliveryPaymentMode(v as 'with_product' | 'advance')}
                items={[
                  {
                    value: 'with_product',
                    label: 'Customer will pay delivery charge with product',
                  },
                  {
                    value: 'advance',
                    label: 'Customer already paid delivery charge in advance',
                  },
                ]}
              />
            </div>

            <div className="bg-well/60 mt-4 flex items-center justify-between rounded-xl p-3 text-xs">
              <span className="text-muted">{t('seller.wallet.available')}</span>
              <Money value={wallet.walletBalance} className="text-ink font-bold" />
            </div>

            {!sufficient && validItems.length > 0 && (
              <Callout
                tone="danger"
                compact
                className="mt-3"
                description={`Insufficient wallet balance. Need ${money(short)} more to cover delivery + packaging.`}
                action={
                  <Button size="sm" variant="primary" asChild>
                    <Link href={`/seller/wallet/add-balance?amount=${short}`}>
                      {t('nav.addBalance')}
                    </Link>
                  </Button>
                }
              />
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="mt-5 w-full"
              disabled={!ready || !sufficient}
            >
              <Icon name="check" size={17} />
              {t('nav.placeOrder')}
            </Button>
          </Panel>
        </div>
      </Form>

      <ConfirmDialog
        open={!!confirming}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={t('seller.order.confirmTitle')}
        description={`Upfront deduction of ${money(upfrontCost)} (delivery + packaging) will be charged from your wallet now.`}
        confirmLabel={placing ? t('common.loading') : t('common.confirm')}
        onConfirm={confirmOrder}
      />

      <ConfirmDialog
        open={!!removingKey}
        onOpenChange={(o) => !o && setRemovingKey(null)}
        tone="danger"
        title="Remove product?"
        description="Are you sure you want to remove this product from the order?"
        confirmLabel="Remove"
        onConfirm={() => {
          if (removingKey) removeItem(removingKey);
          setRemovingKey(null);
        }}
      />
      <CourierHistoryModal
        open={fraudOpen}
        onOpenChange={setFraudOpen}
        fixedPhone={cleanPhone}
        endpoint="/api/seller/fraud-check"
      />
    </div>
  );
}
