import { handler, ok } from '@/server/http';
import { deleteExpense } from '@/server/services/accounts';
import { requireAdmin } from '@/server/session';

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await requireAdmin();
  await deleteExpense(id);
  return ok({ deleted: id });
});
