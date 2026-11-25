'use client';

import * as React from 'react';

import { formatDate, formatMoney } from '@/i18n/format';
import { useI18n } from '@/i18n/provider';
import type { Order, Seller } from '@/types/platform';
import { PlatformMark } from '@components/common/platform-logo';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { orderMoney } from '@lib/business/orders';
import { toast } from '@lib/toast';
import { cn } from '@lib/utils';

/*
 * Invoice — generated on the frontend from the order snapshot. The sheet
 * always renders on paper colours (it is printed), whatever the theme.
 * Print uses the browser (only `.print-area` is printed, see globals.css);
 * the PDF is drawn with jsPDF (Latin text — the PDF base fonts carry no
 * Bangla glyphs, so it is always produced in English).
 */

export function InvoiceSheet({
  order,
  seller,
  platformName,
  className,
}: {
  order: Order;
  seller?: Seller;
  platformName: string;
  className?: string;
}) {
  const { t, money, date, num, tx } = useI18n();
  const m = orderMoney(order);
  const c = order.customer;
  return (
    <div
      className={cn(
        'print-area mx-auto w-full max-w-[800px] rounded-2xl border border-[#d7e6ee] bg-[#ffffff] p-6 text-[#0b2230] shadow-[0_20px_60px_-30px_rgb(2_48_71/0.35)] sm:p-10',
        className,
      )}
    >
      <div className="flex flex-col justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-3">
          <PlatformMark size={44} />
          <div>
            <div className="text-xl font-extrabold">{platformName}</div>
            <div className="text-xs text-[#5e718d]">{t('nav.sellerPanel')}</div>
          </div>
        </div>
        <div className="sm:text-right">
          <div className="text-2xl font-extrabold tracking-tight text-[#187f9b] uppercase">
            {t('invoice.title')}
          </div>
          <dl className="mt-2 space-y-0.5 text-[13px]">
            <div>
              <span className="text-[#5e718d]">{t('invoice.invoiceNo')}: </span>
              <span className="font-semibold">{order.invoiceNo}</span>
            </div>
            <div>
              <span className="text-[#5e718d]">{t('common.orderId')}: </span>
              <span className="font-semibold">{order.id}</span>
            </div>
            <div>
              <span className="text-[#5e718d]">{t('invoice.invoiceDate')}: </span>
              <span className="num font-semibold">{date(order.createdAt)}</span>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-[#f2fafd] p-4">
          <div className="text-[11px] font-bold tracking-wider text-[#187f9b] uppercase">
            {t('invoice.billedTo')}
          </div>
          <div className="mt-2 font-bold">{c.name}</div>
          <div className="num text-[13px]">
            {c.phone}
            {c.altPhone ? ` · ${c.altPhone}` : ''}
          </div>
          <div className="mt-1 text-[13px] text-[#455468]">
            {c.address}, {c.upazila}, {c.district}
          </div>
          <div className="mt-1 text-xs text-[#5e718d]">{tx(`area.${c.area}`)}</div>
        </div>
        <div className="rounded-xl bg-[#f2fafd] p-4">
          <div className="text-[11px] font-bold tracking-wider text-[#187f9b] uppercase">
            {t('invoice.soldBy')}
          </div>
          <div className="mt-2 font-bold">{seller?.shopName ?? '—'}</div>
          <div className="text-[13px]">{seller?.name}</div>
          <div className="num text-[13px] text-[#455468]">{seller?.phone}</div>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[480px] text-[13px]">
          <thead>
            <tr className="border-b-2 border-[#023047] text-left text-[11px] tracking-wider text-[#5e718d] uppercase">
              <th className="py-2 pr-3">{t('common.product')}</th>
              <th className="px-3 py-2 text-center">{t('common.qty')}</th>
              <th className="px-3 py-2 text-right">{t('invoice.unitPrice')}</th>
              <th className="py-2 pl-3 text-right">{t('invoice.lineTotal')}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#e3eef3]">
              <td className="py-3 pr-3 font-semibold">{order.productName}</td>
              <td className="num px-3 py-3 text-center">{num(order.quantity)}</td>
              <td className="num px-3 py-3 text-right">{money(order.sellingPrice)}</td>
              <td className="num py-3 pl-3 text-right font-semibold">{money(m.subtotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col-reverse justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs text-[#5e718d]">{t('invoice.orderStatus')}</div>
          <div className="mt-1 inline-flex rounded-full bg-[#e3f4f9] px-3 py-1 text-xs font-bold text-[#136780]">
            {t(`status.order.${order.status}`)}
          </div>
          <p className="mt-4 text-sm font-semibold">{t('invoice.thanks')}</p>
        </div>
        <dl className="w-full space-y-2 text-[13px] sm:w-72">
          <Row label={t('invoice.subtotal')} value={money(m.subtotal)} />
          <Row
            label={t('invoice.deliveryCharge')}
            value={money(order.deliveryCharge)}
            note={t('invoice.prepaid')}
          />
          <Row
            label={t('invoice.packagingCharge')}
            value={money(order.packagingCharge)}
            note={t('invoice.prepaid')}
          />
          <div className="flex items-center justify-between rounded-xl bg-[#023047] px-4 py-3 text-white">
            <dt className="pr-3 text-xs font-semibold">{t('invoice.totalAmount')}</dt>
            <dd className="num text-lg font-extrabold">{money(m.codAmount)}</dd>
          </div>
        </dl>
      </div>
      <p className="mt-8 border-t border-[#e3eef3] pt-4 text-center text-[11px] text-[#5e718d]">
        {t('invoice.footer')}
      </p>
    </div>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[#455468]">
        {label}
        {note && <span className="block text-[11px] text-[#187f9b]">✓ {note}</span>}
      </dt>
      <dd className="num font-semibold">{value}</dd>
    </div>
  );
}

export function InvoiceActions({
  order,
  seller,
  platformName,
}: {
  order: Order;
  seller?: Seller;
  platformName: string;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = React.useState(false);

  const downloadPdf = async () => {
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const m = orderMoney(order);
      // PDF base fonts have no ৳ glyph → "Tk".
      const tk = (n: number) => formatMoney(n, 'en').replace('৳', 'Tk ');
      const W = doc.internal.pageSize.getWidth();
      let y = 56;
      doc.setFillColor(2, 48, 71).rect(0, 0, W, 8, 'F');
      doc
        .setFont('helvetica', 'bold')
        .setFontSize(20)
        .setTextColor(2, 48, 71)
        .text(platformName, 48, y);
      doc
        .setTextColor(24, 127, 155)
        .setFontSize(22)
        .text('INVOICE', W - 48, y, { align: 'right' });
      y += 22;
      doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(70, 84, 104);
      doc.text(`Invoice No: ${order.invoiceNo}`, W - 48, y, { align: 'right' });
      doc.text(`Order ID: ${order.id}`, W - 48, y + 14, { align: 'right' });
      doc.text(`Date: ${formatDate(order.createdAt, 'en')}`, W - 48, y + 28, { align: 'right' });
      y += 64;
      const c = order.customer;
      doc
        .setFont('helvetica', 'bold')
        .setTextColor(24, 127, 155)
        .setFontSize(9)
        .text('BILL TO (CUSTOMER)', 48, y);
      doc.text('SOLD BY (SELLER)', W / 2 + 10, y);
      doc.setFont('helvetica', 'normal').setTextColor(11, 34, 48).setFontSize(10.5);
      const left = [
        c.name,
        c.phone + (c.altPhone ? ` / ${c.altPhone}` : ''),
        ...doc.splitTextToSize(`${c.address}, ${c.upazila}, ${c.district}`, W / 2 - 70),
      ];
      left.forEach((line: string, i: number) => doc.text(line, 48, y + 16 + i * 14));
      [seller?.shopName ?? '-', seller?.name ?? '', seller?.phone ?? ''].forEach((line, i) =>
        doc.text(line, W / 2 + 10, y + 16 + i * 14),
      );
      y += 40 + Math.max(left.length, 3) * 14;
      doc
        .setDrawColor(2, 48, 71)
        .setLineWidth(1.5)
        .line(48, y, W - 48, y);
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(94, 113, 141);
      doc
        .text('PRODUCT', 48, y + 16)
        .text('QTY', W - 250, y + 16, { align: 'center' })
        .text('UNIT PRICE', W - 150, y + 16, { align: 'right' })
        .text('TOTAL', W - 48, y + 16, { align: 'right' });
      y += 36;
      doc.setFont('helvetica', 'normal').setFontSize(10.5).setTextColor(11, 34, 48);
      const nameLines = doc.splitTextToSize(order.productName, W - 360);
      doc.text(nameLines, 48, y);
      doc
        .text(String(order.quantity), W - 250, y, { align: 'center' })
        .text(tk(order.sellingPrice), W - 150, y, { align: 'right' })
        .text(tk(m.subtotal), W - 48, y, { align: 'right' });
      y += nameLines.length * 14 + 16;
      doc
        .setDrawColor(227, 238, 243)
        .setLineWidth(1)
        .line(48, y, W - 48, y);
      y += 24;
      const row = (label: string, value: string) => {
        doc.setTextColor(69, 84, 104).text(label, W - 260, y);
        doc.setTextColor(11, 34, 48).text(value, W - 48, y, { align: 'right' });
        y += 18;
      };
      row('Subtotal', tk(m.subtotal));
      row('Delivery charge (prepaid by seller)', tk(order.deliveryCharge));
      row('Packaging charge (prepaid by seller)', tk(order.packagingCharge));
      doc.setFillColor(2, 48, 71).roundedRect(W - 270, y - 4, 222, 34, 6, 6, 'F');
      doc
        .setFont('helvetica', 'bold')
        .setTextColor(255, 255, 255)
        .setFontSize(10)
        .text('Total (Cash on Delivery)', W - 258, y + 17);
      doc.setFontSize(13).text(tk(m.codAmount), W - 60, y + 17, { align: 'right' });
      doc
        .setFont('helvetica', 'normal')
        .setFontSize(10)
        .setTextColor(19, 103, 128)
        .text(`Status: ${order.status.replace(/_/g, ' ')}`, 48, y + 17);
      doc
        .setFontSize(8.5)
        .setTextColor(94, 113, 141)
        .text(
          'This is a computer-generated invoice and does not need a signature.',
          W / 2,
          doc.internal.pageSize.getHeight() - 40,
          { align: 'center' },
        );
      doc.save(`${order.invoiceNo}.pdf`);
      toast.success(t('invoice.pdfReady'));
    } catch {
      toast.error(t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => window.print()}>
        <Icon name="printer" size={16} />
        {t('common.print')}
      </Button>
      <Button variant="primary" onClick={downloadPdf} disabled={busy}>
        <Icon name="download" size={16} />
        {t('common.downloadPdf')}
      </Button>
    </div>
  );
}
