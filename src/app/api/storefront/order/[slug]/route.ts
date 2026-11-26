import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getActiveCampaigns } from '@/services/campaigns';
import { listProductReviews } from '@/services/engagement';
import { placeWebsiteOrder } from '@/services/orders';
import { getProductBySlug } from '@/services/products';
import { enforceRateLimit, requestIp } from '@/services/rate-limit';
import { getSettings } from '@/services/settings';
import { listAddresses } from '@/services/users';
import { AppError } from '@lib/errors';
import {
  getStorefrontCustomerId,
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';
import { checkLocation, withDeliveryZone } from '@lib/validators/common';
import { checkoutFields } from '@lib/validators/order';

const expressOrderSchema = checkoutFields
  .omit({ items: true })
  .extend({
    quantity: z.coerce.number().int().min(1).max(50).default(1),
    variant: z.record(z.string(), z.string()).default({}),
  })
  .superRefine(checkLocation)
  .transform(withDeliveryZone);

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const { slug } = await context.params;
    const product = await getProductBySlug(slug);
    if (!product) throw new AppError('Product not found.', 404);

    const userId = await getStorefrontCustomerId(req);
    const [settings, addresses, { reviews }, allCampaigns] = await Promise.all([
      getSettings(),
      userId ? listAddresses(userId) : Promise.resolve([]),
      listProductReviews(product.id),
      getActiveCampaigns(),
    ]);
    const campaigns = allCampaigns.filter(
      (c) => c.scope === 'all' || c.productIds.includes(product.id),
    );

    const whatsappNumber = (settings.social.whatsapp || settings.supportPhone).replace(/[^\d]/g, '');
    const whatsappUrl =
      settings.whatsappEnabled && settings.whatsappProductEnabled && whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I want to order: ${product.name}`)}`
        : null;

    return storefrontJson({
      product,
      reviews,
      addresses,
      campaigns,
      fees: {
        inside_dhaka: settings.shippingFeeInsideDhaka,
        outside_dhaka: settings.shippingFeeOutsideDhaka,
      },
      supportPhone: settings.supportPhone,
      whatsappUrl,
    });
  } catch (error) {
    return storefrontError(error);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const { slug } = await context.params;
    const product = await getProductBySlug(slug);
    if (!product) throw new AppError('Product not found.', 404);

    const body: unknown = await req.json();
    const data = expressOrderSchema.parse(body);
    const userId = await getStorefrontCustomerId(req);
    await enforceRateLimit('placeOrder', `ip:${await requestIp()}`, `phone:${data.phone}`);

    const { id, orderNumber, paymentToken } = await placeWebsiteOrder({
      lines: [
        {
          productId: product.id,
          quantity: data.quantity,
          variant: data.variant,
        },
      ],
      userId,
      name: data.fullName,
      phone: data.phone,
      email: data.email,
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
      saveAddress: Boolean(userId && data.saveAddress),
    });

    return storefrontJson({ orderNumber, orderId: id, paymentToken }, 201);
  } catch (error) {
    return storefrontError(error);
  }
}
