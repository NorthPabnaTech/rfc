'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { deleteBanner,saveBanner, setBannerActive } from '@/services/banners';
import { saveBusiness } from '@/services/businesses';
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
import {
  deleteExpense,
  deleteExpenseCategory,
  saveExpense,
  saveExpenseCategory,
} from '@/services/expenses';
import { adjustProductStock } from '@/services/inventory';
import {
  deleteMediaAsset,
  findMediaReferences,
  listMediaAssets,
  syncCloudinaryMedia,
} from '@/services/media';
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
  businessSchema,
  expenseCategorySchema,
  expenseSchema,
  stockAdjustmentSchema,
} from '@lib/validators/management';
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

export async function productPickerAction(
  q: string,
  opts: { singlesOnly?: boolean; business?: string } = {},
) {
  return runAction(async () => {
    await requireAdmin();
    return pickerSearch(z.string().max(80).parse(q), {
      singlesOnly: opts.singlesOnly === true,
      business: opts.business ? z.string().max(60).parse(opts.business) : undefined,
    });
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
): Promise<ActionResult<{ id: string; orderNumber: string; invoiceNumber: string; total: number }>> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const d = manualOrderSchema.parse(input);
    const result = await createManualOrder({
      business: d.business,
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
    const { orderId, status, note, refundAmount, returnItems } =
      updateOrderStatusSchema.parse(input);
    await updateOrderStatus(orderId, status, admin.id, note, { refundAmount, returnItems });
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
    revalidatePath('/admin', 'layout');
    return undefined;
  }, 'Settings saved');
}

/* ─── Inventory, Expenses & Businesses ───────────────────────────────────── */

export async function adjustStockAction(
  input: unknown,
): Promise<ActionResult<{ stockQuantity: number; stockStatus: string }>> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const parsed = stockAdjustmentSchema.parse(input);
    const res = await adjustProductStock(parsed, admin.id);
    revalidateStorefront();
    revalidatePath('/admin', 'layout');
    return res;
  }, 'Stock updated');
}

export async function saveExpenseAction(input: unknown, id?: string): Promise<ActionResult> {
  return runAction(
    async () => {
      const admin = await requireAdmin();
      await saveExpense(expenseSchema.parse(input), admin.id, optionalId.parse(id));
      revalidatePath('/admin', 'layout');
      return undefined;
    },
    id ? 'Expense updated' : 'Expense recorded',
  );
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteExpense(objectId.parse(id));
    revalidatePath('/admin', 'layout');
    return undefined;
  }, 'Expense deleted');
}

export async function saveExpenseCategoryAction(
  input: unknown,
  id?: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await saveExpenseCategory(expenseCategorySchema.parse(input), optionalId.parse(id));
    revalidatePath('/admin/expenses', 'layout');
    return undefined;
  }, 'Expense category saved');
}

export async function deleteExpenseCategoryAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteExpenseCategory(objectId.parse(id));
    revalidatePath('/admin/expenses', 'layout');
    return undefined;
  }, 'Expense category deleted');
}

export async function saveBusinessAction(input: unknown, id?: string): Promise<ActionResult> {
  return runAction(
    async () => {
      await requireAdmin();
      await saveBusiness(businessSchema.parse(input), optionalId.parse(id));
      revalidatePath('/admin', 'layout');
      return undefined;
    },
    id ? 'Business updated' : 'Business created',
  );
}

/* ─── Media Library ──────────────────────────────────────────────────────── */

export async function listMediaAssetsAction(input: {
  q?: string;
  purpose?: string;
  page?: number;
}) {
  return runAction(async () => {
    await requireAdmin();
    return listMediaAssets({
      q: input.q,
      purpose: input.purpose as never,
      page: input.page,
      pageSize: 18,
    });
  });
}

export async function checkMediaReferencesAction(id: string) {
  return runAction(async () => {
    await requireAdmin();
    return findMediaReferences(objectId.parse(id));
  });
}

export async function deleteMediaAssetAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteMediaAsset(objectId.parse(id));
    revalidatePath('/admin/media');
    return undefined;
  }, 'Media deleted');
}

export async function syncCloudinaryMediaAction(): Promise<ActionResult<{ imported: number }>> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const imported = await syncCloudinaryMedia(admin.id);
    revalidatePath('/admin/media');
    return { imported };
  }, 'Media library synced');
}
