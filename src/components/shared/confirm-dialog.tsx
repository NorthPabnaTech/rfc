'use client';

import * as React from 'react';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@components/ui/dialog';
import { cn } from '@lib/utils';

import { Spinner } from './loader';

type Tone = 'danger' | 'warning' | 'info' | 'success';

type Bullet = { icon?: IconRegistryKey; text: React.ReactNode };

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Heading. Falls back to a tone-aware default ("Danger" / "Warning" / etc). */
  title?: string;
  /** Supporting copy. Falls back to a tone-aware default question. */
  description?: React.ReactNode;
  /** Visual tone — drives the medallion icon/colors and confirm button. */
  tone?: Tone;
  /** Override the medallion icon. */
  icon?: IconRegistryKey;
  /** A short list of consequences / what-you-get, each with an icon. */
  bullets?: Bullet[];
  /** Custom content rendered after the description and before the actions. */
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmClassName?: string;
  /** Shortcut for tone="danger" — kept for backwards compatibility. */
  destructive?: boolean;
  /** Show a spinner + disable actions (for async confirms). */
  loading?: boolean;
  /** Close the dialog automatically after confirming. Default true. */
  autoClose?: boolean;
  onConfirm: () => void;
};

const TONE: Record<
  Tone,
  { bg: string; fg: string; icon: IconRegistryKey; title: string; description: string }
> = {
  danger: {
    bg: '--status-danger-bg',
    fg: '--status-danger-fg',
    icon: 'alert',
    title: 'Danger',
    description: 'This action cannot be undone. Are you sure you want to continue?',
  },
  warning: {
    bg: '--status-warn-bg',
    fg: '--status-warn-fg',
    icon: 'alert',
    title: 'Warning',
    description: 'Please review before continuing. Are you sure you want to proceed?',
  },
  info: {
    bg: '--status-info-bg',
    fg: '--status-info-fg',
    icon: 'info',
    title: 'Confirm',
    description: 'Are you sure you want to continue with this action?',
  },
  success: {
    bg: '--status-ok-bg',
    fg: '--status-ok-fg',
    icon: 'checkCircle',
    title: 'Success',
    description: 'Are you sure you want to continue?',
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  tone,
  icon,
  bullets,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmClassName,
  destructive = false,
  loading = false,
  autoClose = true,
  onConfirm,
}: Props) {
  const resolvedTone: Tone = tone ?? (destructive ? 'danger' : 'info');
  const t = TONE[resolvedTone];
  const headIcon = icon ?? t.icon;
  const resolvedTitle = title ?? t.title;
  const resolvedDescription = description ?? t.description;
  const confirmVariant = resolvedTone === 'danger' ? 'danger' : 'primary';

  const handleConfirm = () => {
    onConfirm();
    if (autoClose && !loading) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="!max-w-sm gap-0 overflow-hidden p-0">
        <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
          {/* tone medallion — concentric soft halo over a tinted disc */}
          <span
            className="relative grid size-16 shrink-0 place-items-center rounded-full"
            style={{
              background: `color-mix(in oklch, var(${t.fg}) 7%, transparent)`,
            }}
            aria-hidden="true"
          >
            <span
              className="grid size-12 place-items-center rounded-full"
              style={{
                background: `var(${t.bg})`,
                color: `var(${t.fg})`,
                boxShadow: `0 0 0 1px color-mix(in oklch, var(${t.fg}) 14%, transparent)`,
              }}
            >
              <Icon name={headIcon} size={26} stroke={1.9} />
            </span>
          </span>

          <DialogTitle className="text-ink mt-5 text-[17px] leading-tight font-semibold tracking-tight">
            {resolvedTitle}
          </DialogTitle>

          {resolvedDescription && (
            <DialogDescription className="text-muted mt-2 max-w-[36ch] text-[13px] leading-relaxed">
              {resolvedDescription}
            </DialogDescription>
          )}

          {bullets && bullets.length > 0 && (
            <ul
              className="mt-5 w-full space-y-2.5 rounded-xl px-3.5 py-3 text-left"
              style={{ background: `var(${t.bg})` }}
            >
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[12.5px]">
                  <span className="mt-px shrink-0" style={{ color: `var(${t.fg})` }}>
                    <Icon name={b.icon ?? headIcon} size={15} stroke={1.9} />
                  </span>
                  <span className="text-ink/80 leading-snug">{b.text}</span>
                </li>
              ))}
            </ul>
          )}

          {children && <div className="mt-5 w-full text-left">{children}</div>}
        </div>

        <div className="border-line bg-well/40 grid grid-cols-2 gap-2.5 border-t px-6 py-4">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            className={cn('w-full', confirmClassName)}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Spinner size="sm" className="!text-white" />}
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
