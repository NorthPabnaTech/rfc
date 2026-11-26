import { NextRequest } from 'next/server';
import { z } from 'zod';

import { connectDB, UserModel } from '@/database';
import { AppError } from '@lib/errors';
import {
  getStorefrontCustomerId,
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';
import { bdPhone, requiredText } from '@lib/validators/common';

const updateMeSchema = z.object({
  name: requiredText('Name', 80),
  phone: bdPhone,
});

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function GET(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const userId = await getStorefrontCustomerId(req);
    if (!userId) throw new AppError('Unauthorized.', 401);

    await connectDB();
    const user = await UserModel.findById(userId)
      .select('name email phone avatar isActive')
      .lean();
    if (!user || !user.isActive) throw new AppError('Unauthorized.', 401);

    return storefrontJson({
      id: String(user._id),
      name: user.name,
      email: user.email ?? null,
      phone: user.phone ?? null,
      avatarUrl: user.avatar?.url ?? null,
    });
  } catch (error) {
    return storefrontError(error);
  }
}

export async function PATCH(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const userId = await getStorefrontCustomerId(req);
    if (!userId) throw new AppError('Unauthorized.', 401);

    const body: unknown = await req.json();
    const input = updateMeSchema.parse(body);

    await connectDB();
    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) throw new AppError('Unauthorized.', 401);

    if (
      input.phone !== user.phone &&
      (await UserModel.exists({ phone: input.phone, _id: { $ne: user._id } }))
    ) {
      throw new AppError('Another account already uses this mobile number.');
    }

    user.name = input.name;
    user.phone = input.phone;
    await user.save();

    return storefrontJson({
      id: String(user._id),
      name: user.name,
      email: user.email ?? null,
      phone: user.phone ?? null,
      avatarUrl: user.avatar?.url ?? null,
    });
  } catch (error) {
    return storefrontError(error);
  }
}
