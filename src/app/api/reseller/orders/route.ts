import { NextRequest } from 'next/server';
import { z } from 'zod';

import { listResellerOrders, placeResellerOrder } from '@/services/resellers';
import {
  requireReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';
import { RESELLER_DELIVERY_PAYMENT_MODES, RESELLER_MAX_LINE_QUANTITY } from '@lib/constants';
import { AppError } from '@lib/errors';
import { objectId } from '@lib/validators/common';

const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(8).max(20),
    email: z.string().trim().email().optional(),
  }),
  shippingAddress: z.object({
    fullName: z.string().trim().max(80).optional(),
    phone: z.string().trim().max(20).optional(),
    division: z.string().trim().min(2).max(60),
    district: z.string().trim().min(2).max(60),
    area: z.string().trim().min(2).max(80),
    street: z.string().trim().min(4).max(300),
  }),
  items: z
    .array(
      z.object({
        productId: objectId,
        quantity: z
          .number()
          .int('Quantity must be a whole number.')
          .min(1)
          .max(RESELLER_MAX_LINE_QUANTITY),
        sellingPrice: z.number().int('Selling price must be a whole number.').min(1).max(10_000_000),
        variant: z.record(z.string().max(60), z.string().max(120)).optional(),
        /** Optional: the base reseller price the seller saw. A mismatch → 409. */
        expectedResellerPrice: z.number().finite().min(0).optional(),
      }),
    )
    .min(1)
    .max(50),
  customerNote: z.string().trim().max(1000).optional(),
  /** Default `with_product`: courier collects delivery with the product. */
  deliveryPaymentMode: z.enum(RESELLER_DELIVERY_PAYMENT_MODES).default('with_product'),
  // Any client-sent charges / zone (deliveryCharge, packagingCost, zone…) are
  // ignored: z.object strips unknown keys and the server computes them.
});

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;

  try {
    const sp = req.nextUrl.searchParams;
    const data = await listResellerOrders(String(auth.reseller._id), {
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      limit: sp.get('limit') ? Number(sp.get('limit')) : 20,
      status: sp.get('status') ?? undefined,
    });
    return resellerJson({ ok: true, data });
  } catch {
    return resellerError('Failed to load orders.', 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return resellerError(parsed.error.issues[0]?.message ?? 'Invalid order payload.', 400);
    }

    const order = await placeResellerOrder(String(auth.reseller._id), parsed.data);
    return resellerJson(
      {
        ok: true,
        data: {
          id: String(order._id),
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          resellerSummary: order.resellerSummary,
          createdAt: order.createdAt,
        },
      },
      201,
    );
  } catch (err) {
    if (err instanceof AppError) return resellerError(err.message, err.status);
    return resellerError('Failed to place reseller order.', 500);
  }
}
