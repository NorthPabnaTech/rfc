import { body, handler, ok } from '@/server/http';
import { toExpense } from '@/server/mappers';
import { addExpense, expenseInput } from '@/server/services/accounts';
import { requireAdmin } from '@/server/session';

export const POST = handler(async (req) => {
  await requireAdmin();
  return ok(toExpense(await addExpense(await body(req, expenseInput))), 201);
});
