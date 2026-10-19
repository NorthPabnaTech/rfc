'use client';

import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

import type { ActionResult } from '@lib/errors';
import { toast } from '@lib/toast';

/**
 * Shows an action's outcome: success toast, or — on failure — maps server
 * field errors onto the form and shows the summary error. Returns `true` on
 * success so callers can `if (await handle(...)) …`.
 */
export function handleActionResult<T, F extends FieldValues = FieldValues>(
  result: ActionResult<T>,
  form?: Pick<UseFormReturn<F>, 'setError'>,
  { successToast = true }: { successToast?: boolean } = {},
): result is { ok: true; data: T; message?: string } {
  if (result.ok) {
    if (successToast && result.message) toast.success(result.message);
    return true;
  }
  if (form && result.fieldErrors) {
    for (const [name, message] of Object.entries(result.fieldErrors)) {
      form.setError(name as Path<F>, { type: 'server', message });
    }
  }
  toast.error(result.error);
  return false;
}
