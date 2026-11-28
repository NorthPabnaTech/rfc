import { NextRequest } from 'next/server';

import { placeWebsiteOrder } from '@/services/orders';
import { enforceRateLimit, requestIp } from '@/services/rate-limit';
import {
  getStorefrontBusiness,
  getStorefrontCustomerId,
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';
import { checkoutSchema } from '@lib/validators/order';

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function POST(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const business = await getStorefrontBusiness(req);
    const body: unknown = await req.json();
    const data = checkoutSchema.parse(body);
    const userId = await getStorefrontCustomerId(req);
    await enforceRateLimit('placeOrder', `ip:${await requestIp()}`, `phone:${data.phone}`);

    const { id, orderNumber, paymentToken } = await placeWebsiteOrder({
      business,
      lines: data.items,
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
      saveAddress: false,
    });

    return storefrontJson({ orderNumber, orderId: id, paymentToken }, 201);
  } catch (error) {
    return storefrontError(error);
  }
}
