import { z } from 'zod';

/**
 * An error whose message is safe to show the user. Anything else thrown
 * inside an action is logged and replaced with a generic message, so stack
 * traces, driver errors and internals never leak to the browser.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export type FieldErrors = Record<string, string>;

export type ActionResult<T = undefined> =
  { ok: true; data: T; message?: string } | { ok: false; error: string; fieldErrors?: FieldErrors };

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (path && !out[path]) out[path] = issue.message;
  }
  return out;
}

function isDuplicateKeyError(error: unknown): error is { code: number; keyValue?: object } {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

export function toActionError(error: unknown): {
  ok: false;
  error: string;
  fieldErrors?: FieldErrors;
} {
  if (error instanceof AppError) return { ok: false, error: error.message };
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: zodFieldErrors(error),
    };
  }
  if (isDuplicateKeyError(error)) {
    const field = Object.keys(error.keyValue ?? {})[0];
    return { ok: false, error: field ? `That ${field} is already in use.` : 'Duplicate value.' };
  }
  console.error('[action error]', error);
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

/**
 * Wraps a server action body: validation, auth and domain errors become a
 * typed `{ ok: false }` result the form can render; success returns data.
 */
export async function runAction<T>(
  fn: () => Promise<T>,
  message?: string,
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message };
  } catch (error) {
    // Let Next.js control-flow errors (redirect / notFound) propagate.
    if (
      error instanceof Error &&
      'digest' in error &&
      typeof (error as { digest?: unknown }).digest === 'string' &&
      /^NEXT_(REDIRECT|HTTP_ERROR_FALLBACK|NOT_FOUND)/.test((error as { digest: string }).digest)
    ) {
      throw error;
    }
    return toActionError(error);
  }
}
