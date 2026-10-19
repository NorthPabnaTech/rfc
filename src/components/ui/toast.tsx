'use client';

import { toast as sonner } from 'sonner';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * Toast — a design-system card rendered through sonner's `toast.custom`, so it
 * keeps sonner's stacking + swipe-to-dismiss behaviour while matching the rest
 * of the UI (icon medallion, status tokens, hairline + soft elevation). Each
 * variant carries a coloured accent rail and a medallion tinted with the paired
 * status tokens; the close affordance reveals on hover.
 * ──────────────────────────────────────────────────────────────────────── */

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'message';

type Tone = {
  icon: IconRegistryKey;
  /** medallion background / foreground / accent-rail colours (CSS values) */
  bg: string;
  fg: string;
  rail: string;
};

const TONES: Record<ToastVariant, Tone> = {
  success: {
    icon: 'check',
    bg: 'var(--status-ok-bg)',
    fg: 'var(--status-ok-fg)',
    rail: 'var(--status-ok-dot)',
  },
  error: {
    icon: 'alert',
    bg: 'var(--status-danger-bg)',
    fg: 'var(--status-danger-fg)',
    rail: 'var(--status-danger-dot)',
  },
  warning: {
    icon: 'alert',
    bg: 'var(--status-warn-bg)',
    fg: 'var(--status-warn-fg)',
    rail: 'var(--status-warn-dot)',
  },
  info: {
    icon: 'info',
    bg: 'var(--status-info-bg)',
    fg: 'var(--status-info-fg)',
    rail: 'var(--status-info-dot)',
  },
  message: {
    icon: 'bell',
    bg: 'var(--color-accent-soft)',
    fg: 'var(--color-accent)',
    rail: 'var(--color-accent)',
  },
};

type ToastCardProps = {
  id: string | number;
  variant: ToastVariant;
  title: string;
  description?: string;
};

function ToastCard({ id, variant, title, description }: ToastCardProps) {
  const tone = TONES[variant];

  return (
    <div
      role="status"
      className={cn(
        'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden',
        'rounded-xl2 border-line bg-panel shadow-pop border px-3.5 py-3',
        // opacity-only entrance — sonner owns the transform (stacking/slide),
        // so a transform-based keyframe here would fight it mid-animation.
        'animate-in fade-in-0 duration-200 ease-out',
      )}
    >
      {/* coloured accent rail */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: tone.rail }}
      />

      {/* icon medallion */}
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-lg"
        style={{ background: tone.bg, color: tone.fg }}
      >
        <Icon name={tone.icon} size={16} stroke={2.1} />
      </span>

      {/* copy */}
      <div className="min-w-0 flex-1 pt-px pr-5">
        <p className="text-ink text-[13px] leading-snug font-semibold tracking-[-0.01em]">
          {title}
        </p>
        {description && (
          <p className="text-muted mt-0.5 text-[12px] leading-relaxed">{description}</p>
        )}
      </div>

      {/* dismiss (reveals on hover / focus) */}
      <button
        type="button"
        onClick={() => sonner.dismiss(id)}
        aria-label="Dismiss notification"
        className={cn(
          'text-subtle hover:text-ink hover:bg-well absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md',
          'opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        <Icon name="x" size={13} />
      </button>
    </div>
  );
}

/** Render helper consumed by the `toast` wrapper (see `@/lib/toast`). */
export function renderToast(props: ToastCardProps) {
  return <ToastCard {...props} />;
}
