'use client';

import { Toaster, useSonner } from 'sonner';

import { toast } from '@lib/toast';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * AppToaster — the sonner <Toaster> plus a "Clear all" pill that reveals on
 * hover when more than one toast is live. The stack is offset down by `TOP` to
 * reserve a slim header strip; the pill's bottom edge overlaps the stack top so
 * the hover region stays continuous (otherwise moving onto the pill would fire
 * mouseleave and dismiss it before it could be clicked).
 * ──────────────────────────────────────────────────────────────────────── */

const TOP = 60; // toaster top offset (px) — leaves room for the Clear-all pill
const RIGHT = 16; // toaster right offset (px)
const WIDTH = 356; // sonner's default toast width (px)

/**
 * True when a Radix "outside" interaction actually landed on a toast (a toast
 * card, its dismiss button, or the Clear-all pill). Dialog/Sheet contents use
 * this in `onInteractOutside` to keep an open dialog/drawer from closing when
 * the user merely dismisses a notification.
 */
export function isToastInteraction(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest('[data-sonner-toaster], [data-toast-region]'))
  );
}

export function AppToaster() {
  const { toasts } = useSonner();
  const showClear = toasts.length > 1;

  return (
    <div>
      <Toaster
        position="top-right"
        offset={{ top: TOP, right: RIGHT }}
        gap={10}
        visibleToasts={4}
        duration={3500}
        toastOptions={{ unstyled: true, classNames: { toast: 'w-full' } }}
      />

      {/* Clear all — sits in the header strip above the stack, revealed on hover */}
      <div
        data-toast-region
        className="pointer-events-none fixed z-[1000000000] flex justify-end"
        style={{ top: TOP - 22, right: RIGHT, width: WIDTH, maxWidth: 'calc(100vw - 2rem)' }}
      >
        <button
          type="button"
          onClick={() => toast.dismiss()}
          aria-label="Clear all notifications"
          tabIndex={showClear ? 0 : -1}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
            'border-line bg-panel/95 shadow-pop border backdrop-blur-sm',
            'text-muted hover:text-ink text-[11.5px] font-medium tracking-tight',
            'transition duration-150 ease-out',
            showClear
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-1 opacity-0',
          )}
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
