'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { deleteBanner, saveBanner, setBannerActive } from '@/services/banners';
import {
  deleteCategory,
  deleteSupplier,
  deleteTag,
  saveCategory,
  saveSupplier,
  saveTag,
} from '@/services/catalog';
import { saveCombo } from '@/services/combos';
import {
  answerQuestion,
  deleteQuestion,
  deleteReview,
  setQuestionHidden,
  setReviewHidden,
} from '@/services/engagement';
import { createManualOrder, updateOrderMeta, updateOrderStatus } from '@/services/orders';
import { deleteProduct, pickerSearch, saveProduct } from '@/services/products';
import { updateReturn } from '@/services/returns';
import { updateSettings } from '@/services/settings';
import { searchCustomers, setCustomerActive } from '@/services/users';
import { requireAdmin } from '@lib/auth/current-user';
import { type ActionResult, runAction } from '@lib/errors';
import { type BannerOutput, bannerSchema } from '@lib/validators/banner';
import {
  categorySchema,
  comboSchema,
  productSchema,
  supplierSchema,
  tagSchema,
} from '@lib/validators/catalog';
import { objectId } from '@lib/validators/common';
import {
  answerSchema,
  manualOrderSchema,
  updateOrderMetaSchema,
  updateOrderStatusSchema,
  updateReturnSchema,
} from '@lib/validators/order';
import { settingsSchema } from '@lib/validators/settings';

/** Storefront pages that show catalog data and must refresh after edits. */
function revalidateStorefront() {
  revalidatePath('/', 'layout');
}

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? objectId.parse(v) : undefined));

/* ─── Products ───────────────────────────────────────────────────────────── */

export async function saveProductAction(
  input: unknown,
  id?: string,
): Promise<ActionResult<{ id: string; slug: string }>> {
  return runAction(
    async () => {
      await requireAdmin();
      const result = await saveProduct(productSchema.parse(input), optionalId.parse(id));
      revalidateStorefront();
      return result;
    },
    id ? 'Product updated' : 'Product created',
  );
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteProduct(objectId.parse(id));
    revalidateStorefront();
    return undefined;
  }, 'Product deleted');
}

export async function productPickerAction(q: string, opts: { singlesOnly?: boolean } = {}) {
  return runAction(async () => {
    await requireAdmin();
    return pickerSearch(z.string().max(80).parse(q), { singlesOnly: opts.singlesOnly === true });
  });
}

/* ─── Combos ───────────────────────────────────────────────────────────── */

export async function saveComboAction(
  input: unknown,
  id?: string,
): Promise<ActionResult<{ id: string; slug: string }>> {
  return runAction(
    async () => {
      await requireAdmin();
      const result = await saveCombo(comboSchema.parse(input), optionalId.parse(id));
      revalidateStorefront();
      return result;
    },
    id ? 'Combo updated' : 'Combo created',
  );
}

/* ─── Banners ──────────────────────────────────────────────────────────── */

export async function saveBannerAction(input: unknown, id?: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await saveBanner(bannerSchema.parse(input) as BannerOutput, optionalId.parse(id));
    revalidateStorefront();
    return undefined;
  }, 'Banner saved');
}

export async function setBannerActiveAction(id: string, active: boolean): Promise<ActionResult> {
  return runAction(
    async () => {
      await requireAdmin();
      await setBannerActive(objectId.parse(id), active);
      revalidateStorefront();
      return undefined;
    },
    active ? 'Banner enabled' : 'Banner disabled',
  );
}

export async function deleteBannerAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteBanner(objectId.parse(id));
    revalidateStorefront();
    return undefined;
  }, 'Banner deleted');
}

/* ─── Categories / tags / suppliers ──────────────────────────────────────── */

export async function saveCategoryAction(input: unknown, id?: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await saveCategory(categorySchema.parse(input), optionalId.parse(id));
    revalidateStorefront();
    return undefined;
  }, 'Category saved');
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteCategory(objectId.parse(id));
    revalidateStorefront();
    return undefined;
  }, 'Category deleted');
}

export async function saveTagAction(input: unknown, id?: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await saveTag(tagSchema.parse(input), optionalId.parse(id));
    revalidateStorefront();
    return undefined;
  }, 'Tag saved');
}

export async function deleteTagAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteTag(objectId.parse(id));
    revalidateStorefront();
    return undefined;
  }, 'Tag deleted');
}

export async function saveSupplierAction(input: unknown, id?: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await saveSupplier(supplierSchema.parse(input), optionalId.parse(id));
    revalidatePath('/admin', 'layout');
    return undefined;
  }, 'Supplier saved');
}

export async function deleteSupplierAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteSupplier(objectId.parse(id));
    revalidatePath('/admin', 'layout');
    return undefined;
  }, 'Supplier deleted');
}

/* ─── Orders & returns ───────────────────────────────────────────────────── */

export async function createManualOrderAction(
  input: unknown,
): Promise<ActionResult<{ id: string; orderNumber: string }>> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const d = manualOrderSchema.parse(input);
    const result = await createManualOrder({
      lines: d.items,
      userId: d.userId,
      customer: { name: d.customerName, phone: d.phone, email: d.email },
      shippingAddress: {
        fullName: d.fullName,
        phone: d.phone,
        addressLine: d.addressLine,
        division: d.division,
        area: d.area,
        city: d.city,
        zone: d.zone,
      },
      platform: d.platform,
      status: d.status,
      shippingFeeOverride: d.shippingFee,
      discount: d.discount,
      customerNote: d.customerNote,
      adminNote: d.adminNote,
      createdBy: admin.id,
    });
    revalidatePath('/admin', 'layout');
    return result;
  }, 'Order created');
}

export async function updateOrderStatusAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const { orderId, status, note } = updateOrderStatusSchema.parse(input);
    await updateOrderStatus(orderId, status, admin.id, note);
    revalidatePath('/admin', 'layout');
    revalidatePath('/account/orders', 'layout');
    return undefined;
  }, 'Order status updated');
}

export async function updateOrderMetaAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const { orderId, ...data } = updateOrderMetaSchema.parse(input);
    await updateOrderMeta(orderId, data);
    revalidatePath(`/admin/orders/${orderId}`);
    return undefined;
  }, 'Order updated');
}

export async function updateReturnAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const { returnId, ...data } = updateReturnSchema.parse(input);
    await updateReturn(returnId, admin.id, data);
    revalidatePath('/admin', 'layout');
    revalidatePath('/account/orders', 'layout');
    return undefined;
  }, 'Return updated');
}

/* ─── Reviews & questions ────────────────────────────────────────────────── */

export async function setReviewHiddenAction(id: string, hidden: boolean): Promise<ActionResult> {
  return runAction(
    async () => {
      await requireAdmin();
      await setReviewHidden(objectId.parse(id), hidden);
      revalidateStorefront();
      return undefined;
    },
    hidden ? 'Review hidden' : 'Review visible again',
  );
}

export async function deleteReviewAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteReview(objectId.parse(id));
    revalidateStorefront();
    return undefined;
  }, 'Review deleted');
}

export async function answerQuestionAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const { questionId, answer } = answerSchema.parse(input);
    await answerQuestion(questionId, answer, admin.id);
    revalidateStorefront();
    return undefined;
  }, 'Answer published');
}

export async function setQuestionHiddenAction(id: string, hidden: boolean): Promise<ActionResult> {
  return runAction(
    async () => {
      await requireAdmin();
      await setQuestionHidden(objectId.parse(id), hidden);
      revalidateStorefront();
      return undefined;
    },
    hidden ? 'Question hidden' : 'Question visible again',
  );
}

export async function deleteQuestionAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteQuestion(objectId.parse(id));
    revalidateStorefront();
    return undefined;
  }, 'Question deleted');
}

/* ─── Customers & settings ───────────────────────────────────────────────── */

export async function setCustomerActiveAction(id: string, active: boolean): Promise<ActionResult> {
  return runAction(
    async () => {
      await requireAdmin();
      await setCustomerActive(objectId.parse(id), active);
      revalidatePath('/admin/customers', 'layout');
      return undefined;
    },
    active ? 'Customer re-activated' : 'Customer disabled',
  );
}

export async function customerSearchAction(q: string) {
  return runAction(async () => {
    await requireAdmin();
    return searchCustomers(z.string().min(1).max(80).parse(q));
  });
}

export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await updateSettings(settingsSchema.parse(input));
    revalidateStorefront();
    return undefined;
  }, 'Settings saved');
}
