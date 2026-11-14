import { jsPDF } from 'jspdf';

import type { BusinessDTO, OrderDTO } from '@/types';
import { ORDER_PLATFORM_LABELS, PAYMENT_METHOD_LABELS } from '@lib/constants';
import { formatNumber, formatStoreDate } from '@lib/utils';

type StoreIdentity = Pick<BusinessDTO, 'name' | 'address' | 'phone'> & {
  logoUrl?: string;
};

const DEFAULT_STORE: StoreIdentity = {
  name: 'RFC Gadget',
  address: 'Hazipara, Uttor Badda, Dhaka',
  phone: '01330363517',
};

const tk = (n: number) => `Tk ${formatNumber(n)}`;
const HAS_NON_ASCII = /[^\x00-\x7F]/;

type TextOpts = {
  size: number;
  weight?: 'normal' | 'bold';
  color?: [number, number, number];
  align?: 'left' | 'right' | 'center';
};

/**
 * Loads an external image URL into a PNG data URL + aspect ratio so jsPDF can
 * embed WebP/AVIF/Cloudinary logos reliably. Returns null if loading fails.
 */
async function loadLogoPng(
  url: string,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const width = bitmap.width;
    const height = bitmap.height;
    bitmap.close();
    return { dataUrl: canvas.toDataURL('image/png'), width, height };
  } catch {
    return null;
  }
}

/**
 * Renders non-ASCII strings (e.g. Bangla Unicode names/addresses) onto an
 * offscreen high-DPI canvas so the browser's native shaper handles conjuncts
 * and vowel signs cleanly instead of jsPDF's WinAnsi Helvetica garbling them.
 */
function drawSmartText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  opts: TextOpts,
): void {
  const { size, weight = 'normal', color = [17, 24, 39], align = 'left' } = opts;

  if (!HAS_NON_ASCII.test(text)) {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, x, y, align === 'left' ? undefined : { align });
    return;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    doc.text(text, x, y, align === 'left' ? undefined : { align });
    return;
  }

  const dpi = 4;
  const fontFamily = '"Noto Sans Bengali", "Hind Siliguri", "Kalpurush", Arial, sans-serif';
  const font = `${weight === 'bold' ? '700' : '400'} ${size * dpi}px ${fontFamily}`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const padX = 2 * dpi;
  const textW = Math.ceil(metrics.width) + padX * 2;
  const lineH = Math.ceil(size * 1.35 * dpi);

  canvas.width = Math.max(textW, 1);
  canvas.height = Math.max(lineH, 1);

  ctx.font = font;
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  ctx.textBaseline = 'alphabetic';
  const baselinePx = Math.round(size * 1.02 * dpi);
  ctx.fillText(text, padX, baselinePx);

  const wPt = canvas.width / dpi;
  const hPt = canvas.height / dpi;
  const baselinePt = baselinePx / dpi;
  let drawX = x - padX / dpi;
  if (align === 'right') drawX = x - wPt + padX / dpi;
  else if (align === 'center') drawX = x - wPt / 2;

  doc.addImage(canvas.toDataURL('image/png'), 'PNG', drawX, y - baselinePt, wPt, hPt);
}

function wrapSmartText(
  doc: jsPDF,
  text: string,
  maxWidthPt: number,
  size: number,
  weight: 'normal' | 'bold' = 'normal',
): string[] {
  if (!HAS_NON_ASCII.test(text)) {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    return doc.splitTextToSize(text, maxWidthPt) as string[];
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [text];

  ctx.font = `${weight === 'bold' ? '700' : '400'} ${size}px "Noto Sans Bengali", "Hind Siliguri", Arial, sans-serif`;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidthPt || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

/**
 * Generates and downloads a clean, printable A4 PDF invoice for an order.
 * Reused across the Order Details page and post-submission manual order flow.
 */
export async function downloadOrderInvoicePdf(
  order: OrderDTO,
  store?: Partial<StoreIdentity>,
): Promise<void> {
  const biz: StoreIdentity = {
    name: store?.name || DEFAULT_STORE.name,
    address: store?.address || DEFAULT_STORE.address,
    phone: store?.phone || DEFAULT_STORE.phone,
    logoUrl: store?.logoUrl,
  };

  const logo = biz.logoUrl ? await loadLogoPng(biz.logoUrl) : null;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 42;
  const rightX = pageWidth - margin;
  let y = 48;

  // Header band
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 88, 'F');

  let brandX = margin;
  if (logo) {
    const maxBox = 44;
    const ratio = Math.min(maxBox / logo.width, maxBox / logo.height);
    const drawW = logo.width * ratio;
    const drawH = logo.height * ratio;
    const logoY = 22 + (maxBox - drawH) / 2;
    doc.addImage(logo.dataUrl, 'PNG', margin, logoY, drawW, drawH);
    brandX = margin + drawW + 12;
  }

  drawSmartText(doc, biz.name.toUpperCase(), brandX, 40, {
    size: 20,
    weight: 'bold',
    color: [255, 255, 255],
  });

  const subParts = [biz.address, biz.phone ? `Phone: ${biz.phone}` : ''].filter(Boolean);
  if (subParts.length) {
    drawSmartText(doc, subParts.join('  |  '), brandX, 58, {
      size: 9.5,
      weight: 'normal',
      color: [255, 255, 255],
    });
  }

  drawSmartText(doc, 'INVOICE', rightX, 40, {
    size: 18,
    weight: 'bold',
    color: [255, 255, 255],
    align: 'right',
  });
  drawSmartText(doc, order.invoiceNumber || `INV-${order.orderNumber}`, rightX, 58, {
    size: 9.5,
    weight: 'normal',
    color: [255, 255, 255],
    align: 'right',
  });

  y = 114;

  // Invoice & Customer Info columns
  const colMid = pageWidth / 2 + 10;

  drawSmartText(doc, 'BILLED TO', margin, y, {
    size: 9,
    weight: 'bold',
    color: [107, 114, 128],
  });
  drawSmartText(doc, 'ORDER DETAILS', colMid, y, {
    size: 9,
    weight: 'bold',
    color: [107, 114, 128],
  });

  y += 16;
  drawSmartText(doc, order.customer.name, margin, y, {
    size: 11,
    weight: 'bold',
    color: [17, 24, 39],
  });
  drawSmartText(doc, `Order No: ${order.orderNumber}`, colMid, y, {
    size: 9.5,
    color: [17, 24, 39],
  });

  y += 15;
  drawSmartText(doc, `Phone: ${order.customer.phone}`, margin, y, {
    size: 9.5,
    color: [17, 24, 39],
  });
  drawSmartText(doc, `Date: ${formatStoreDate(order.createdAt, 'DD MMM YYYY')}`, colMid, y, {
    size: 9.5,
    color: [17, 24, 39],
  });

  y += 15;
  if (order.customer.email) {
    drawSmartText(doc, `Email: ${order.customer.email}`, margin, y, {
      size: 9.5,
      color: [17, 24, 39],
    });
  }
  drawSmartText(doc, `Source: ${ORDER_PLATFORM_LABELS[order.platform]}`, colMid, y, {
    size: 9.5,
    color: [17, 24, 39],
  });

  y += 15;
  const fullAddress = [
    order.shippingAddress.addressLine,
    order.shippingAddress.area,
    order.shippingAddress.city,
  ]
    .filter(Boolean)
    .join(', ');
  const addrLines = wrapSmartText(doc, fullAddress, colMid - margin - 24, 9.5);
  addrLines.forEach((line, idx) => {
    drawSmartText(doc, line, margin, y + idx * 13, { size: 9.5, color: [17, 24, 39] });
  });
  drawSmartText(
    doc,
    `Payment: ${PAYMENT_METHOD_LABELS[order.paymentMethod]} (${order.paymentStatus.toUpperCase()})`,
    colMid,
    y,
    { size: 9.5, color: [17, 24, 39] },
  );

  y += Math.max(addrLines.length * 13, 18) + 22;

  // Items Table Header
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, pageWidth - margin * 2, 24, 'F');
  const headerOpts: TextOpts = { size: 9, weight: 'bold', color: [55, 65, 81] };
  drawSmartText(doc, 'ITEM', margin + 8, y + 15, headerOpts);
  drawSmartText(doc, 'QTY', rightX - 170, y + 15, { ...headerOpts, align: 'right' });
  drawSmartText(doc, 'UNIT PRICE', rightX - 90, y + 15, { ...headerOpts, align: 'right' });
  drawSmartText(doc, 'TOTAL', rightX - 8, y + 15, { ...headerOpts, align: 'right' });

  y += 32;

  for (const item of order.items) {
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
    const variantStr = Object.entries(item.variant ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    const titleLines = wrapSmartText(
      doc,
      item.sku ? `${item.name} (${item.sku})` : item.name,
      rightX - margin - 210,
      9.5,
      'bold',
    );

    titleLines.forEach((line, idx) => {
      drawSmartText(doc, line, margin + 8, y + idx * 13, {
        size: 9.5,
        weight: 'bold',
        color: [17, 24, 39],
      });
    });

    drawSmartText(doc, String(item.quantity), rightX - 170, y, {
      size: 9.5,
      color: [17, 24, 39],
      align: 'right',
    });
    drawSmartText(doc, tk(item.unitPrice), rightX - 90, y, {
      size: 9.5,
      color: [17, 24, 39],
      align: 'right',
    });
    drawSmartText(doc, tk(item.lineTotal), rightX - 8, y, {
      size: 9.5,
      color: [17, 24, 39],
      align: 'right',
    });

    let rowH = titleLines.length * 13;
    if (variantStr) {
      drawSmartText(doc, variantStr, margin + 8, y + rowH, {
        size: 8.5,
        color: [107, 114, 128],
      });
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
  const drawTotalRow = (
    label: string,
    val: string,
    bold = false,
    color: [number, number, number] = [17, 24, 39],
  ) => {
    const opts: TextOpts = { size: bold ? 11 : 9.5, weight: bold ? 'bold' : 'normal', color };
    drawSmartText(doc, label, totalsX, y, opts);
    drawSmartText(doc, val, rightX - 8, y, { ...opts, align: 'right' });
    y += bold ? 22 : 16;
  };

  drawTotalRow('Subtotal', tk(order.subtotal));
  drawTotalRow('Delivery Charge', tk(order.shippingFee));
  if (order.discount > 0) {
    drawTotalRow('Discount', `-${tk(order.discount)}`);
  }

  // Breathing room above the divider and between the divider and Total Payable
  y += 4;
  doc.setDrawColor(17, 24, 39);
  doc.line(totalsX, y, rightX, y);
  y += 18;
  drawTotalRow('Total Payable', tk(order.total), true);

  if (order.refundedAmount && order.refundedAmount > 0) {
    drawTotalRow('Refunded', `-${tk(order.refundedAmount)}`, false, [185, 28, 28]);
  }

  // Footer
  drawSmartText(doc, `Thank you for shopping with ${biz.name}!`, pageWidth / 2, 800, {
    size: 8.5,
    color: [107, 114, 128],
    align: 'center',
  });

  doc.save(`${order.invoiceNumber || `INV-${order.orderNumber}`}.pdf`);
}
