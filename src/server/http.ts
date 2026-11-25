import 'server-only';

import { NextResponse } from 'next/server';
import { z, type ZodType } from 'zod';

import { AppError, zodFieldErrors } from '@lib/errors';

import { en } from '@/i18n/dictionaries/en';
import type { TKey, TVars } from '@/i18n/provider';

import { connectDB } from './db';

/*
 * Route-handler plumbing for /api/v1. Every handler returns
 *   200/201 { ok: true, data }
 *   4xx     { ok: false, error, fieldErrors? }
 * Unknown errors are logged and replaced with a generic message, so driver
 * errors and stack traces never reach the browser.
 */

export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data } satisfies ApiOk<T>, { status });
}

export function fail(error: string, status = 400, fieldErrors?: Record<string, string>) {
  return NextResponse.json({ ok: false, error, fieldErrors } satisfies ApiFail, { status });
}

function toResponse(error: unknown) {
  if (error instanceof AppError) return fail(error.message, error.status);
  if (error instanceof z.ZodError) return fail('Please fix the highlighted fields.', 422, zodFieldErrors(error));
  if ((error as { code?: number })?.code === 11000) {
    const field = Object.keys((error as { keyValue?: object }).keyValue ?? {})[0];
    return fail(field ? `That ${field} is already in use.` : 'Duplicate value.', 409);
  }
  console.error('[api]', error);
  return fail('Something went wrong. Please try again.', 500);
}

type Ctx<P> = { params: Promise<P> };

/** Wraps a handler: connects the DB, maps errors to JSON responses. */
export function handler<P = Record<string, never>>(
  fn: (req: Request, params: P) => Promise<Response>,
) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      await connectDB();
      return await fn(req, (await ctx?.params) ?? ({} as P));
    } catch (error) {
      return toResponse(error);
    }
  };
}

/** Parses and validates the JSON body. */
export async function body<S extends ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError('Invalid JSON body.', 400);
  }
  return schema.parse(raw);
}

/** English translator for the shared Zod schema builders (lib/validators/reseller). */
export function serverT(key: TKey, vars?: TVars): string {
  let cur: unknown = en;
  for (const part of key.split('.')) cur = (cur as Record<string, unknown>)?.[part];
  const s = typeof cur === 'string' ? cur : key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : s;
}

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
