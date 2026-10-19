'use client';

import { type ExternalToast, toast as sonner } from 'sonner';

import { renderToast, type ToastVariant } from '@components/ui/toast';

type Options = Omit<ExternalToast, 'description'> & { description?: string };

/**
 * Thin, typed wrapper over sonner. Every variant renders the design-system
 * toast card (see `@/components/ui/toast`) via `toast.custom`, so call sites
 * stay simple while the UI stays consistent. `promise`/`dismiss` pass through.
 */
const emit = (variant: ToastVariant) => (message: string, opts?: Options) => {
  const { description, ...rest } = opts ?? {};
  return sonner.custom((id) => renderToast({ id, variant, title: message, description }), rest);
};

export const toast = {
  success: emit('success'),
  error: emit('error'),
  info: emit('info'),
  warning: emit('warning'),
  message: emit('message'),
  promise: sonner.promise.bind(sonner),
  dismiss: sonner.dismiss.bind(sonner),
} as const;
