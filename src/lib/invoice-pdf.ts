import { jsPDF } from 'jspdf';

import type { BusinessDTO, OrderDTO } from '@/types';
import { ORDER_PLATFORM_LABELS, PAYMENT_METHOD_LABELS } from '@lib/constants';
import { formatNumber, formatStoreDate } from '@lib/utils';

type StoreIdentity = Pick<BusinessDTO, 'name' | 'address' | 'phone'>;

const DEFAULT_STORE: StoreIdentity = {
  name: 'RFC Gadget',
  address: 'Hazipara, Uttor Badda, Dhaka',
  phone: '01330363517',
};

const tk = (n: number) => `Tk ${formatNumber(n)}`;

/**
 * Generates and downloads a clean, printable A4 PDF invoice for an order.
 * Reused across the Order Details page and post-submission manual order flow.
 */
export function downloadOrderInvoicePdf(order: OrderDTO, store?: Partial<StoreIdentity>): void {
  const biz: StoreIdentity = {
    name: store?.name || DEFAULT_STORE.name,
    address: store?.address || DEFAULT_STORE.address,
    phone: store?.phone || DEFAULT_STORE.phone,
  };

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 42;
  const rightX = pageWidth - margin;
  let y = 48;

  // Header band
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 88, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(biz.name.toUpperCase(), margin, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const subParts = [biz.address, biz.phone ? `Phone: ${biz.phone}` : ''].filter(Boolean);
  if (subParts.length) {
    doc.text(subParts.join('  |  '), margin, 58);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('INVOICE', rightX, 40, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(order.invoiceNumber || `INV-${order.orderNumber}`, rightX, 58, { align: 'right' });

  y = 114;
  doc.setTextColor(17, 24, 39);

  // Invoice & Customer Info columns
  const colMid = pageWidth / 2 + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('BILLED TO', margin, y);
  doc.text('ORDER DETAILS', colMid, y);

  y += 16;
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(order.customer.name, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Order No: ${order.orderNumber}`, colMid, y);

  y += 15;
  doc.text(`Phone: ${order.customer.phone}`, margin, y);
  doc.text(`Date: ${formatStoreDate(order.createdAt, 'DD MMM YYYY')}`, colMid, y);

  y += 15;
  if (order.customer.email) {
    doc.text(`Email: ${order.customer.email}`, margin, y);
  }
  doc.text(`Source: ${ORDER_PLATFORM_LABELS[order.platform]}`, colMid, y);

  y += 15;
  const addrLines = doc.splitTextToSize(
    [
      order.shippingAddress.addressLine,
      order.shippingAddress.area,
      order.shippingAddress.city,
    ]
      .filter(Boolean)
      .join(', '),
    colMid - margin - 24,
  );
  doc.text(addrLines, margin, y);
  doc.text(
    `Payment: ${PAYMENT_METHOD_LABELS[order.paymentMethod]} (${order.paymentStatus.toUpperCase()})`,
    colMid,
    y,
  );

  y += Math.max(addrLines.length * 13, 18) + 22;

  // Items Table Header
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, pageWidth - margin * 2, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.text('ITEM', margin + 8, y + 15);
  doc.text('QTY', rightX - 170, y + 15, { align: 'right' });
  doc.text('UNIT PRICE', rightX - 90, y + 15, { align: 'right' });
  doc.text('TOTAL', rightX - 8, y + 15, { align: 'right' });

  y += 32;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);

  for (const item of order.items) {
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
    const variantStr = Object.entries(item.variant ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    const titleLines = doc.splitTextToSize(
      item.sku ? `${item.name} (${item.sku})` : item.name,
      rightX - margin - 210,
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(titleLines, margin + 8, y);

    doc.setFont('helvetica', 'normal');
    doc.text(String(item.quantity), rightX - 170, y, { align: 'right' });
    doc.text(tk(item.unitPrice), rightX - 90, y, { align: 'right' });
    doc.text(tk(item.lineTotal), rightX - 8, y, { align: 'right' });

    let rowH = titleLines.length * 13;
    if (variantStr) {
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text(variantStr, margin + 8, y + rowH);
      doc.setTextColor(17, 24, 39);
      rowH += 13;
    }

    y += rowH + 8;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y - 4, rightX, y - 4);
    y += 4;
  }

  // Totals block
  y += 10;
  const totalsX = rightX - 200;
  const drawTotalRow = (label: string, val: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 9.5);
    doc.text(label, totalsX, y);
    doc.text(val, rightX - 8, y, { align: 'right' });
    y += bold ? 20 : 16;
  };

  drawTotalRow('Subtotal', tk(order.subtotal));
  drawTotalRow('Delivery Charge', tk(order.shippingFee));
  if (order.discount > 0) {
    drawTotalRow('Discount', `-${tk(order.discount)}`);
  }
  doc.setDrawColor(17, 24, 39);
  doc.line(totalsX, y - 8, rightX, y - 8);
  drawTotalRow('Total Payable', tk(order.total), true);

  if (order.refundedAmount && order.refundedAmount > 0) {
    doc.setTextColor(185, 28, 28);
    drawTotalRow('Refunded', `-${tk(order.refundedAmount)}`);
    doc.setTextColor(17, 24, 39);
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text(`Thank you for shopping with ${biz.name}!`, pageWidth / 2, 800, { align: 'center' });

  doc.save(`${order.invoiceNumber || `INV-${order.orderNumber}`}.pdf`);
}
