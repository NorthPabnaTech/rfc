import { NextRequest } from 'next/server';
import { z } from 'zod';

import { AddressModel, connectDB } from '@/database';
import { toAddress } from '@/services/mappers';
import { deleteAddress, saveAddress } from '@/services/users';
import { AppError } from '@lib/errors';
import {
  getStorefrontCustomerId,
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';
import { addressSchema } from '@lib/validators/auth';
import { objectId } from '@lib/validators/common';

const defaultOnlySchema = z.object({ isDefault: z.boolean() }).strict();

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const userId = await getStorefrontCustomerId(req);
    if (!userId) throw new AppError('Unauthorized.', 401);

    const { id } = await context.params;
    if (!objectId.safeParse(id).success) throw new AppError('Address not found.', 404);

    await connectDB();
    const existing = await AddressModel.findOne({ _id: id, user: userId }).lean();
    if (!existing) throw new AppError('Address not found.', 404);

    const body: unknown = await req.json();
    const defaultOnly = defaultOnlySchema.safeParse(body);
    if (defaultOnly.success) {
      if (defaultOnly.data.isDefault) {
        await AddressModel.updateMany({ user: userId }, { $set: { isDefault: false } });
      }
      const updated = await AddressModel.findOneAndUpdate(
        { _id: id, user: userId },
        { $set: { isDefault: defaultOnly.data.isDefault } },
        { new: true },
      ).lean();
      if (!updated) throw new AppError('Address not found.', 404);
      return storefrontJson(toAddress(updated));
    }

    const raw =
      typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    const merged = {
      label: existing.label,
      fullName: existing.fullName,
      phone: existing.phone,
      addressLine: existing.addressLine,
      division: existing.division ?? '',
      city: existing.city,
      area: existing.area ?? '',
      zone: existing.zone,
      isDefault: existing.isDefault,
      ...raw,
    };
    const input = addressSchema.parse(merged);
    const updated = await saveAddress(userId, input, id);
    return storefrontJson(updated);
  } catch (error) {
    return storefrontError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const userId = await getStorefrontCustomerId(req);
    if (!userId) throw new AppError('Unauthorized.', 401);

    const { id } = await context.params;
    if (!objectId.safeParse(id).success) throw new AppError('Address not found.', 404);

    await connectDB();
    const exists = await AddressModel.exists({ _id: id, user: userId });
    if (!exists) throw new AppError('Address not found.', 404);

    await deleteAddress(userId, id);
    return storefrontJson({ deleted: true, id });
  } catch (error) {
    return storefrontError(error);
  }
}
