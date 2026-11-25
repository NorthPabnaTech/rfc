'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { useResellerAuth } from '@/stores/reseller-auth';
import type { OrderDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { NotFoundState } from '@components/platform/not-found-state';
import { StatusPill } from '@components/platform/status-pill';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { downloadOrderInvoicePdf } from '@lib/invoice-pdf';
import { toast } from '@lib/toast';

import { useSellerOrder } from '../../components/use-seller-data';

export function SellerInvoice({ id }: { id: string }) {
  const { t, dateTime, num } = useI18n();
  const reseller = useResellerAuth((s) => s.reseller);
  const { order, loading } = useSellerOrder(id);
  const [downloading, setDownloading] = React.useState(false);

  if (loading) return <div className="skeleton h-80 rounded-2xl" />;
  if (!order) {
    return <NotFoundState title={t('seller.orders.notFound')} backHref="/seller/invoices" />;
  }

  const s = order.resellerSummary;
  const addr = order.shippingAddress as
    | (typeof order.shippingAddress & { addressLine?: string; city?: string })
    | undefined;
  const streetAddress = addr?.street || addr?.addressLine || '';
  const district = addr?.district || addr?.city || '';
  const formattedAddress = [streetAddress, addr?.area, district, addr?.division]
    .filter(Boolean)
    .join(', ');

  const items = order.items ?? [];
  const subtotal =
    s?.resellerSellingTotal ??
    order.subtotal ??
    items.reduce((sum, it) => sum + (it.sellingPrice ?? it.unitPrice ?? 0) * it.quantity, 0);
  const deliveryCharge = s?.deliveryCharge ?? order.shippingFee ?? 0;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const dto: OrderDTO = {
        id: order.id,
        orderNumber: order.orderNumber,
        invoiceNumber: `INV-${order.orderNumber}`,
        business: 'reseller',
        userId: null,
        customer: {
          name: order.customer?.name || 'Customer',
          phone: order.customer?.phone || '',
          email: order.customer?.email,
        },
        shippingAddress: {
          fullName: order.customer?.name || 'Customer',
          phone: order.customer?.phone || '',
          addressLine: streetAddress,
          division: addr?.division,
          area: addr?.area,
          city: district,
          zone: district.toLowerCase() === 'dhaka' ? 'inside_dhaka' : 'outside_dhaka',
        },
        items: items.map((it, idx) => {
          const unitPrice = it.sellingPrice ?? it.unitPrice ?? 0;
          return {
            id: `${order.id}-${idx}`,
            productId: it.productId,
            name: it.productName || it.name || it.productId,
            slug: it.slug || '',
            variant: it.variant ?? {},
            quantity: it.quantity,
            unitPrice,
            lineTotal: it.lineTotal ?? unitPrice * it.quantity,
          };
        }),
        subtotal,
        shippingFee: deliveryCharge,
        discount: 0,
        total: order.total,
        paymentMethod: 'cod',
        paymentStatus: 'unpaid',
        platform: 'other',
        status: order.status as OrderDTO['status'],
        statusHistory: [],
        createdAt: order.createdAt,
        updatedAt: order.updatedAt || order.createdAt,
      };

      await downloadOrderInvoicePdf(dto, {
        name: reseller?.shopName || 'Reseller Shop',
        address: '',
        phone: reseller?.phone || undefined,
      });
    } catch {
      toast.error(t('common.somethingWrong'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${t('invoice.title')} ${order.orderNumber}`}
        description={dateTime(order.createdAt)}
        backHref="/seller/invoices"
        backLabel={t('seller.invoices.title')}
        className="no-print"
        actions={
          <Button variant="primary" onClick={handleDownload} disabled={downloading}>
            <Icon name="download" size={16} />
            {downloading ? t('common.loading') : 'Download Invoice'}
          </Button>
        }
      />

      <div className="print-area bg-panel border-line mx-auto max-w-3xl overflow-hidden rounded-2xl border shadow-sm">
        {/* Top Black Header Banner */}
        <div className="flex flex-wrap items-start justify-between gap-4 bg-[#111827] px-6 py-6 text-white sm:px-8">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              Invoice
            </span>
            <h2 className="text-xl font-bold text-white">
              {reseller?.shopName || 'Reseller Shop'}
            </h2>
            {reseller?.phone && (
              <p className="num text-xs text-slate-300">{reseller.phone}</p>
            )}
          </div>

          <div className="text-left sm:text-right">
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Order Number
            </p>
            <p className="font-mono text-base font-bold text-white">{order.orderNumber}</p>
            <p className="mt-0.5 text-xs text-slate-300">{dateTime(order.createdAt)}</p>
            <div className="mt-2">
              <StatusPill kind="order" value={order.status} />
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6 sm:px-8">
          {/* Customer & Shipping Info */}
          <div className="border-line bg-well/30 grid gap-5 rounded-xl border p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-subtle text-[11px] font-bold tracking-wider uppercase">
                Bill To
              </p>
              <p className="text-ink mt-1.5 font-semibold">{order.customer?.name || '—'}</p>
              {order.customer?.phone && (
                <p className="num text-muted mt-0.5 text-xs">{order.customer.phone}</p>
              )}
              {order.customer?.email && (
                <p className="text-muted mt-0.5 text-xs">{order.customer.email}</p>
              )}
            </div>

            <div>
              <p className="text-subtle text-[11px] font-bold tracking-wider uppercase">
                Shipping Address
              </p>
              <p className="text-ink mt-1.5 text-xs leading-relaxed">
                {formattedAddress || '—'}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border-line overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="border-line bg-well/60 text-subtle border-b text-[11px] font-bold tracking-wider uppercase">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {items.length > 0 ? (
                  items.map((item, idx) => {
                    const unitPrice = item.sellingPrice ?? item.unitPrice ?? 0;
                    const lineTotal = item.lineTotal ?? unitPrice * item.quantity;
                    const variantText = item.variant
                      ? Object.entries(item.variant)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')
                      : '';
                    return (
                      <tr key={idx}>
                        <td className="text-muted px-4 py-3 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="text-ink font-medium">
                            {item.productName || item.name || item.productId}
                          </p>
                          {variantText && (
                            <p className="text-muted mt-0.5 text-xs">{variantText}</p>
                          )}
                        </td>
                        <td className="num text-ink px-4 py-3 text-center font-medium">
                          {num(item.quantity)}
                        </td>
                        <td className="num text-muted px-4 py-3 text-right">
                          <Money value={unitPrice} />
                        </td>
                        <td className="num text-ink px-4 py-3 text-right font-semibold">
                          <Money value={lineTotal} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-muted px-4 py-4 text-center text-xs">
                      Order {order.orderNumber}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <dl className="w-full space-y-2 text-sm sm:max-w-xs">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="num text-ink font-medium">
                  <Money value={subtotal} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery Charge</dt>
                <dd className="num text-ink font-medium">
                  <Money value={deliveryCharge} />
                </dd>
              </div>
              <div className="border-line flex justify-between border-t pt-2.5 text-base">
                <dt className="text-ink font-bold">COD Total</dt>
                <dd className="num text-ink font-extrabold">
                  <Money value={order.total} />
                </dd>
              </div>
            </dl>
          </div>

          <div className="border-line text-subtle border-t pt-4 text-center text-xs">
            Thank you for shopping with {reseller?.shopName || 'us'}!
          </div>
        </div>
      </div>
    </div>
  );
}
