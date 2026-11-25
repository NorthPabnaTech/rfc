import type { DeliveryArea, Order, OrderStatus, PlatformSettings } from '@/types/platform';

/** Every status, in pipeline order (used by filters, timelines, charts). */
export const ORDER_STATUSES: OrderStatus[] = [
  'placed',
  'processing',
  'confirmed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
];

/** The happy path shown on the tracking timeline. */
export const ORDER_PIPELINE: OrderStatus[] = [
  'placed',
  'processing',
  'confirmed',
  'shipped',
  'out_for_delivery',
  'delivered',
];

/** Allowed admin status changes. Terminal states allow none. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['processing', 'confirmed', 'cancelled'],
  processing: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'returned'],
  out_for_delivery: ['delivered', 'returned'],
  delivered: [],
  cancelled: [],
  returned: [],
};

/** Statuses that count as "pending" (not yet shipped). */
export const PENDING_STATUSES: OrderStatus[] = ['placed', 'processing', 'confirmed'];
export const IN_TRANSIT_STATUSES: OrderStatus[] = ['shipped', 'out_for_delivery'];

export function deliveryChargeFor(
  area: DeliveryArea,
  settings: Pick<PlatformSettings, 'deliveryCharges'>,
): number {
  return settings.deliveryCharges[area];
}

/** All the money in one order, derived from its price snapshot. */
export function orderMoney(o: Order) {
  const subtotal = o.sellingPrice * o.quantity;
  const charges = o.deliveryCharge + o.packagingCharge;
  return {
    /** Amount the customer pays (Cash on Delivery). */
    subtotal,
    codAmount: subtotal,
    /** Prepaid by the seller from the wallet when the order is placed. */
    charges,
    supplierTotal: o.supplierCost * o.quantity,
    platformProfit: o.platformMargin * o.quantity,
    baseTotal: o.basePrice * o.quantity,
    sellerProfit: (o.sellingPrice - o.basePrice) * o.quantity,
  };
}

export type OrderQuote = {
  subtotal: number;
  deliveryCharge: number;
  packagingCharge: number;
  /** Charged to the wallet now. */
  payNow: number;
  /** Collected from the customer on delivery. */
  codAmount: number;
  expectedProfit: number;
  balanceAfter: number;
  sufficient: boolean;
};

/**
 * Quote for the place-order screen. The wallet is charged delivery +
 * packaging exactly once, when the order is confirmed.
 */
export function quoteOrder(args: {
  basePrice: number;
  sellingPrice: number;
  quantity: number;
  deliveryCharge: number;
  packagingCharge: number;
  available: number;
}): OrderQuote {
  const subtotal = args.sellingPrice * args.quantity;
  const payNow = args.deliveryCharge + args.packagingCharge;
  return {
    subtotal,
    deliveryCharge: args.deliveryCharge,
    packagingCharge: args.packagingCharge,
    payNow,
    codAmount: subtotal,
    expectedProfit: (args.sellingPrice - args.basePrice) * args.quantity,
    balanceAfter: args.available - payNow,
    sufficient: args.available >= payNow,
  };
}

export function isPending(s: OrderStatus) {
  return PENDING_STATUSES.includes(s);
}
