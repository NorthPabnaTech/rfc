import * as React from 'react';

import { DialogDescription, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * DialogeHeader — header for form dialogs: title + optional description,
 * divided from the body by a border. The close button comes from
 * <DialogContent>. Mirrors `DrawerHeader`.
 *
 * Must be rendered inside `<DialogContent>` (uses Radix's DialogTitle for a11y).
 * ──────────────────────────────────────────────────────────────────────── */

type Props = {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
};

export function DialogeHeader({ title, description, className }: Props) {
  return (
    <DialogHeader
      className={cn('border-line bg-surface gap-0 border-b px-5 py-4 text-left', className)}
    >
      <div className="min-w-0 space-y-0.5 pr-9">
        <DialogTitle className="text-ink text-[15px] leading-tight font-semibold tracking-tight">
          {title}
        </DialogTitle>
        {description && (
          <DialogDescription className="text-muted text-[12.5px] leading-relaxed">
            {description}
          </DialogDescription>
        )}
      </div>
    </DialogHeader>
  );
}
