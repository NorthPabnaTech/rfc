'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useI18n } from '@/i18n/provider';
import { useCurrentSeller, usePlatformStore, useWallet } from '@/stores/platform-store';
import type { DeliveryArea, Order } from '@/types/platform';
import { Panel } from '@components/dashboard/panel';
import { Form, FormInput, FormSelect, FormTextarea, useWatch } from '@components/form';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { ProductImage } from '@components/platform/product-image';
import { Callout, ConfirmDialog, PageHeader } from '@components/shared';
import { CurrencyInput, QuantityInput } from '@components/shared/numeric-format-input';
import { Button } from '@components/ui/button';
import { Select } from '@components/ui/select';
import { DELIVERY_AREAS, detectDeliveryArea, DISTRICTS, upazilasOf } from '@lib/business/delivery';
import { quoteOrder } from '@lib/business/orders';
import { checkSellingPrice } from '@lib/business/pricing';
import { toast } from '@lib/toast';
import { cn } from '@lib/utils';
import { customerSchema } from '@lib/validators/reseller';

import { useSellerCatalog } from '../../components/use-seller-data';

type Customer = {
  name: string;
  phone: string;
  altPhone: string;
  address: string;
  district: string;
  upazila: string;
  area: DeliveryArea;
  note?: string;
};

export function PlaceOrder() {
  const { t, locale, money } = useI18n();
  const params = useSearchParams();
  const seller = useCurrentSeller();
  const wallet = useWallet(seller?.id);
  const settings = usePlatformStore((s) => s.settings);
  const placeOrder = usePlatformStore((s) => s.placeOrder);
  const { products, categories } = useSellerCatalog();
  const orderable = products.filter(
    (p) => p.status === 'active' && p.availability !== 'out_of_stock',
  );

  const initial = orderable.find((p) => p.id === params.get('product')) ?? null;
  const [productId, setProductId] = React.useState(initial?.id ?? '');
  const product = products.find((p) => p.id === productId);
  const [selling, setSelling] = React.useState<number | undefined>(
    Number(params.get('price')) || initial?.suggestedPrice,
  );
  const [qty, setQty] = React.useState(1);
  const [confirming, setConfirming] = React.useState<Customer | null>(null);
  const [placing, setPlacing] = React.useState(false);
  const [placed, setPlaced] = React.useState<Order | null>(null);

  const schema = React.useMemo(() => customerSchema(t), [t]);
  const form = Form.useForm<Customer>({
    schema,
    defaultValues: {
      name: '',
      phone: '',
      altPhone: '',
      address: '',
      district: '',
      upazila: '',
      area: 'outside_dhaka',
      note: '',
    },
  });
  const [district, upazila, area] = useWatch({
    control: form.control,
    name: ['district', 'upazila', 'area'],
  });

  // Detect the delivery area from the address (seller may override).
  React.useEffect(() => {
    if (district) form.setValue('area', detectDeliveryArea(district, upazila));
  }, [district, upazila, form]);

  const priceCheck = product ? checkSellingPrice(selling, product.basePrice) : 'empty';
  // Charges come from settings + product, never typed by the seller.
  const deliveryCharge = product ? settings.deliveryCharges[area] + product.deliveryCharge : 0;
  const packagingCharge = product?.packagingCharge ?? 0;
  const quote = quoteOrder({
    basePrice: product?.basePrice ?? 0,
    sellingPrice: selling ?? 0,
    quantity: qty,
    deliveryCharge,
    packagingCharge,
    available: wallet.available,
  });
  const ready = !!product && (priceCheck === 'ok' || priceCheck === 'equal_base') && qty >= 1;
  const short = Math.max(0, quote.payNow - wallet.available);

  const submit = (c: Customer) => {
    if (!ready) {
      toast.error(
        product
          ? t('seller.order.belowBase', { amount: money(product.basePrice) })
          : t('seller.order.selectProduct'),
      );
      return;
    }
    if (!quote.sufficient) return;
    setConfirming(c);
  };

  const confirm = () => {
    if (!confirming || !product || !seller || placing) return;
    setPlacing(true);
    const res = placeOrder({
      sellerId: seller.id,
      productId: product.id,
      quantity: qty,
      sellingPrice: selling ?? 0,
      area: confirming.area,
      customer: { ...confirming, altPhone: confirming.altPhone || undefined },
      note: confirming.note || undefined,
    });
    setPlacing(false);
    setConfirming(null);
    if (res.ok) {
      setPlaced(res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error(
        res.error === 'insufficient' ? t('seller.order.insufficient') : t('common.somethingWrong'),
      );
    }
  };

  if (placed) return <Success order={placed} />;

  const districts = DISTRICTS.map((d) => ({
    value: d.name,
    label: locale === 'bn' ? `${d.nameBn} (${d.name})` : d.name,
  }));
  const upazilas = upazilasOf(district).map((u) => ({ value: u, label: u }));
  const cat = categories.find((c) => c.id === product?.categoryId);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.order.title')}
        description={t('seller.order.subtitle')}
        backHref="/seller/orders"
        backLabel={t('nav.myOrders')}
      />
      <Form<Customer> form={form} onFinish={submit}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <Panel title={<StepTitle n={1} label={t('seller.order.stepProduct')} />}>
              <div className="flex flex-col gap-y-5">
                <div className="flex flex-col gap-1.5">
                  <span className="type-label text-ink">{t('seller.order.selectProduct')} *</span>
                  <Select
                    value={productId}
                    showSearch
                    placeholder={t('seller.order.selectProduct')}
                    onValueChange={(v) => {
                      setProductId(v);
                      setSelling(products.find((p) => p.id === v)?.suggestedPrice);
                    }}
                    items={orderable.map((p) => ({
                      value: p.id,
                      label: `${locale === 'bn' ? p.nameBn : p.name} — ${money(p.basePrice)}`,
                    }))}
                  />
                </div>
                {product && (
                  <div className="bg-well/60 flex items-center gap-3 rounded-xl p-3">
                    <ProductImage
                      src={product.images[0]}
                      alt={product.name}
                      icon={cat?.icon}
                      className="size-14 shrink-0"
                      iconSize={24}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink line-clamp-1 text-[13px] font-semibold">
                        {locale === 'bn' ? product.nameBn : product.name}
                      </p>
                      <p className="text-muted text-xs">
                        {t('seller.catalog.basePrice')}:{' '}
                        <Money value={product.basePrice} className="text-ink font-bold" />
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="selling" className="type-label text-ink">
                      {t('seller.product.sellingPrice')} *
                    </label>
                    <CurrencyInput
                      id="selling"
                      value={selling}
                      onValueChange={(v: number | undefined) => setSelling(v)}
                      disabled={!product}
                      aria-invalid={priceCheck === 'below_base' || undefined}
                    />
                    <p
                      className={cn(
                        'type-helper',
                        priceCheck === 'below_base'
                          ? 'text-[var(--status-danger-fg)]'
                          : 'text-muted',
                      )}
                    >
                      {product && priceCheck === 'below_base'
                        ? t('seller.order.belowBase', { amount: money(product.basePrice) })
                        : t('seller.product.sellingPriceHint')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="qty" className="type-label text-ink">
                      {t('common.quantity')} *
                    </label>
                    <QuantityInput
                      id="qty"
                      min={1}
                      max={20}
                      value={qty}
                      onValueChange={(v: number | undefined) => setQty(Math.max(1, v ?? 1))}
                      disabled={!product}
                    />
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title={<StepTitle n={2} label={t('seller.order.stepCustomer')} />}>
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                <FormInput
                  name="name"
                  label={t('seller.order.customerName')}
                  required
                  autoComplete="off"
                />
                <FormInput
                  name="phone"
                  label={t('seller.order.customerPhone')}
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                  required
                />
                <FormInput
                  name="altPhone"
                  label={t('seller.order.altPhone')}
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                  hint={t('common.optional')}
                />
                <FormSelect
                  name="district"
                  label={t('seller.order.district')}
                  items={districts}
                  showSearch
                  required
                />
                <FormSelect
                  name="upazila"
                  label={t('seller.order.upazila')}
                  items={upazilas}
                  showSearch
                  required
                  disabled={!district}
                />
                <FormSelect
                  name="area"
                  label={t('seller.order.deliveryArea')}
                  hint={t('seller.order.deliveryAreaHint')}
                  items={DELIVERY_AREAS.map((a) => ({
                    value: a,
                    label: `${t(`area.${a}`)} — ${money(settings.deliveryCharges[a])}`,
                  }))}
                />
                <FormTextarea
                  name="address"
                  label={t('seller.order.fullAddress')}
                  placeholder={t('seller.order.fullAddressPh')}
                  rows={2}
                  required
                  className="sm:col-span-2"
                />
                <FormTextarea
                  name="note"
                  label={t('seller.order.orderNote')}
                  rows={2}
                  className="sm:col-span-2"
                />
              </div>
            </Panel>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Panel title={<StepTitle n={3} label={t('seller.order.summary')} />}>
              <dl className="space-y-2 text-[13px]">
                <SumRow
                  label={`${t('seller.order.subtotal')}${qty > 1 ? ` (${qty}×)` : ''}`}
                  value={quote.subtotal}
                />
                <SumRow label={t('seller.order.codAmount')} value={quote.codAmount} strong />
              </dl>
              <div className="bg-well/60 mt-4 rounded-xl p-3">
                <p className="text-subtle mb-1.5 text-[11px] font-bold tracking-wide uppercase">
                  {t('seller.order.payNow')}
                </p>
                <dl className="space-y-1.5 text-[13px]">
                  <SumRow
                    label={`${t('invoice.deliveryCharge')} · ${t(`area.${area}`)}`}
                    value={deliveryCharge}
                  />
                  <SumRow label={t('invoice.packagingCharge')} value={packagingCharge} />
                  <div className="border-line flex items-center justify-between border-t pt-2">
                    <dt className="text-ink font-semibold">{t('common.total')}</dt>
                    <dd>
                      <Money value={quote.payNow} className="text-ink text-base font-extrabold" />
                    </dd>
                  </div>
                </dl>
              </div>
              <dl className="mt-4 space-y-1.5 text-[13px]">
                <SumRow label={t('seller.order.walletBalance')} value={wallet.available} />
                <SumRow
                  label={t('seller.order.balanceAfter')}
                  value={quote.balanceAfter}
                  tone={
                    quote.balanceAfter < 0
                      ? 'text-[var(--status-danger-fg)] font-semibold'
                      : undefined
                  }
                />
              </dl>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--status-ok-bg)] px-3 py-2.5">
                <span className="text-[13px] font-semibold text-[var(--status-ok-fg)]">
                  {t('seller.order.expectedProfit')}
                </span>
                <Money
                  value={ready ? quote.expectedProfit : 0}
                  signed
                  className="text-lg font-extrabold text-[var(--status-ok-fg)]"
                />
              </div>

              {!quote.sufficient && product ? (
                <div className="mt-4 space-y-3">
                  <Callout
                    tone="danger"
                    title={t('seller.order.insufficient')}
                    description={t('seller.order.insufficientDesc', {
                      need: money(quote.payNow),
                      have: money(wallet.available),
                      short: money(Math.max(short, settings.minAddBalance)),
                    })}
                  />
                  <Button asChild variant="primary" className="w-full">
                    <Link
                      href={`/seller/wallet/add-balance?amount=${Math.max(settings.minAddBalance, Math.ceil(short / 10) * 10)}`}
                    >
                      <Icon name="moneyAdd" size={16} />
                      {t('seller.order.addBalance')}
                    </Link>
                  </Button>
                  <Button type="button" disabled className="w-full">
                    {t('seller.order.confirmOrder')}
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  disabled={!ready}
                  className="bg-highlight text-highlight-contrast hover:bg-highlight-hover mt-4 w-full font-bold"
                >
                  <Icon name="check" size={17} />
                  {t('seller.order.confirmOrder')}
                </Button>
              )}
              <p className="text-subtle mt-3 flex gap-1.5 text-[11.5px]">
                <Icon name="info" size={14} className="mt-px shrink-0" />
                {t('seller.order.chargedOnce')}
              </p>
            </Panel>
          </div>
        </div>
      </Form>

      <ConfirmDialog
        open={!!confirming}
        onOpenChange={(o) => !o && !placing && setConfirming(null)}
        tone="info"
        icon="cart"
        title={t('seller.order.confirmTitle')}
        description={t('seller.order.confirmDesc', { amount: money(quote.payNow) })}
        bullets={
          confirming && product
            ? [
                { icon: 'box' as const, text: `${product.name} × ${qty}` },
                { icon: 'user' as const, text: `${confirming.name} · ${confirming.phone}` },
                {
                  icon: 'coin' as const,
                  text: `${t('seller.order.codAmount')}: ${money(quote.codAmount)}`,
                },
                {
                  icon: 'wallet' as const,
                  text: `${t('seller.order.payNow')}: ${money(quote.payNow)}`,
                },
              ]
            : undefined
        }
        confirmLabel={placing ? t('seller.order.placing') : t('seller.order.confirmOrder')}
        cancelLabel={t('common.cancel')}
        loading={placing}
        autoClose={false}
        onConfirm={confirm}
      />
    </div>
  );
}

function StepTitle({ n, label }: { n: number; label: string }) {
  const { num } = useI18n();
  return (
    <span className="flex items-center gap-2.5">
      <span className="bg-brand num grid size-6 place-items-center rounded-full text-[11px] font-bold text-white">
        {num(n)}
      </span>
      {label}
    </span>
  );
}

function SumRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: number;
  strong?: boolean;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd>
        <Money
          value={value}
          className={tone ?? (strong ? 'text-ink text-base font-bold' : 'text-ink font-semibold')}
        />
      </dd>
    </div>
  );
}

function Success({ order }: { order: Order }) {
  const { t, money } = useI18n();
  return (
    <div className="mx-auto max-w-xl py-6 text-center sm:py-12">
      <div className="relative mx-auto grid size-20 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--status-ok-bg)]" />
        <span className="relative grid size-20 place-items-center rounded-full bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]">
          <Icon name="checkCircle" size={40} />
        </span>
      </div>
      <h1 className="type-page-title text-ink mt-6">{t('seller.order.successTitle')}</h1>
      <p className="type-body text-muted mt-2">
        {t('seller.order.successDesc', {
          id: order.id,
          amount: money(order.deliveryCharge + order.packagingCharge),
        })}
      </p>
      <div className="bg-panel border-line mt-6 rounded-2xl border p-4 text-left text-[13px]">
        <div className="flex justify-between py-1.5">
          <span className="text-muted">{t('common.orderId')}</span>
          <span className="text-ink font-semibold">{order.id}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-muted">{t('common.product')}</span>
          <span className="text-ink text-right font-semibold">
            {order.productName} × {order.quantity}
          </span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-muted">{t('seller.order.codAmount')}</span>
          <Money value={order.sellingPrice * order.quantity} className="text-ink font-semibold" />
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-muted">{t('seller.order.expectedProfit')}</span>
          <Money
            value={(order.sellingPrice - order.basePrice) * order.quantity}
            className="font-bold text-[var(--status-ok-fg)]"
          />
        </div>
      </div>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button variant="primary" asChild>
          <Link href={`/seller/orders/${order.id}`}>{t('seller.order.viewOrder')}</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href={`/seller/invoices/${order.id}`}>
            <Icon name="receipt" size={16} />
            {t('seller.order.viewInvoice')}
          </Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/seller/products">{t('seller.order.placeAnother')}</Link>
        </Button>
      </div>
    </div>
  );
}
