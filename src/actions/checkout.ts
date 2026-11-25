'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { placeWebsiteOrder, quoteCart, trackOrder } from '@/services/orders';
import { enforceRateLimit, requestIp } from '@/services/rate-limit';
import type { CartQuote } from '@/types';
import { getCurrentUser } from '@lib/auth/current-user';
import { SHIPPING_ZONES } from '@lib/constants';
import { type ActionResult, AppError, runAction } from '@lib/errors';
import { grantOrderAccess } from '@lib/order-access';
import { cartLineSchema, checkoutSchema, trackOrderSchema } from '@lib/validators/order';

const quoteSchema = z.object({
  items: z.array(cartLineSchema).max(50),
  zone: z.enum(SHIPPING_ZONES).optional(),
  couponCode: z.string().trim().max(32).optional(),
});

/** Live prices/availability for the cart — the browser's copy is only a hint. */
export async function quoteCartAction(input: unknown): Promise<ActionResult<CartQuote>> {
  return runAction(async () => {
    const { items, zone, couponCode } = quoteSchema.parse(input);
    return quoteCart(items, zone, couponCode);
  });
}

export async function placeOrderAction(
  input: unknown,
): Promise<ActionResult<{ orderNumber: string; orderId: string; paymentToken: string }>> {
  return runAction(async () => {
    const data = checkoutSchema.parse(input);
    const user = await getCurrentUser();
    await enforceRateLimit('placeOrder', `ip:${await requestIp()}`, `phone:${data.phone}`);
    const { id, orderNumber, paymentToken } = await placeWebsiteOrder({
      lines: data.items,
      userId: user?.id ?? null,
      name: data.fullName,
      phone: data.phone,
      email: data.email ?? user?.email,
      address: {
        fullName: data.fullName,
        phone: data.phone,
        addressLine: data.addressLine,
        division: data.division,
        area: data.area,
        city: data.city,
        zone: data.zone,
      },
      paymentMethod: data.paymentMethod,
      couponCode: data.couponCode,
      customerNote: data.customerNote,
      saveAddress: data.saveAddress,
    });
    await grantOrderAccess(orderNumber);
    revalidatePath('/admin', 'layout');
    revalidatePath('/account/orders');
    return { orderNumber, orderId: id, paymentToken };
  });
}

export async function trackOrderAction(input: unknown) {
  return runAction(async () => {
    const { orderNumber, phone } = trackOrderSchema.parse(input);
    await enforceRateLimit('trackOrder', `ip:${await requestIp()}`, `order:${orderNumber}`);
    const order = await trackOrder(orderNumber, phone);
    if (!order) throw new AppError('No order found with that number and phone.');
    return order;
  });
}
