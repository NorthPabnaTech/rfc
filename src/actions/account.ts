'use server';

import { revalidatePath } from 'next/cache';

import { askQuestion, createReview } from '@/services/engagement';
import { cancelOrderByCustomer } from '@/services/orders';
import { createReturnRequest } from '@/services/returns';
import { changePassword, deleteAddress, saveAddress, updateProfile } from '@/services/users';
import { requireUser } from '@lib/auth/current-user';
import { type ActionResult, runAction } from '@lib/errors';
import { addressSchema, changePasswordSchema, profileSchema } from '@lib/validators/auth';
import { objectId } from '@lib/validators/common';
import {
  cancelOrderSchema,
  questionSchema,
  returnRequestSchema,
  reviewSchema,
} from '@lib/validators/order';

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await updateProfile(user.id, profileSchema.parse(input));
    revalidatePath('/', 'layout');
    return undefined;
  }, 'Profile updated');
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const data = changePasswordSchema.parse(input);
    await changePassword(user.id, data.currentPassword, data.newPassword);
    return undefined;
  }, 'Password changed');
}

export async function saveAddressAction(input: unknown, id?: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await saveAddress(user.id, addressSchema.parse(input), id ? objectId.parse(id) : undefined);
    revalidatePath('/account/addresses');
    return undefined;
  }, 'Address saved');
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await deleteAddress(user.id, objectId.parse(id));
    revalidatePath('/account/addresses');
    return undefined;
  }, 'Address removed');
}

export async function cancelOrderAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const { orderId, reason } = cancelOrderSchema.parse(input);
    await cancelOrderByCustomer(user.id, orderId, reason);
    revalidatePath('/account/orders', 'layout');
    revalidatePath('/admin/orders', 'layout');
    return undefined;
  }, 'Order cancelled');
}

export async function requestReturnAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await createReturnRequest(user.id, returnRequestSchema.parse(input));
    revalidatePath('/account/orders', 'layout');
    revalidatePath('/admin/returns');
    return undefined;
  }, 'Return requested — we will review it shortly');
}

export async function submitReviewAction(
  input: unknown,
  productSlug: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await createReview(user.id, reviewSchema.parse(input));
    revalidatePath(`/products/${productSlug}`);
    return undefined;
  }, 'Thanks for your review!');
}

export async function askQuestionAction(
  input: unknown,
  productSlug: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const { productId, question } = questionSchema.parse(input);
    await askQuestion(user.id, productId, question);
    revalidatePath(`/products/${productSlug}`);
    return undefined;
  }, 'Question sent — we will answer soon');
}
