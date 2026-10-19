import * as React from 'react';

import { cn } from '@lib/utils';

type Props = {
  /** Left cluster — search, infos, chips, stats, bulk actions. Optional. */
  left?: React.ReactNode;
  /** Right cluster — filters, view toggle, primary action. */
  right?: React.ReactNode;
  /** Breakpoint at which the two clusters sit side-by-side. Default `sm`. */
  breakpoint?: 'sm' | 'lg';
  className?: string;
  children?: React.ReactNode;
};

/**
 * FilterBar — Standard list/table toolbar row.
 *
 * A light card (matching the DataTable's own header band) so the toolbar
 * reads as one cohesive control surface instead of loose floating controls.
 * Groups search and filters with consistent 12px (gap-3) spacing inside each
 * cluster; the two clusters split with `justify-between` on wider screens.
 */
export function FilterBar({ left, right, children, className }: Props) {
  const shell = cn(
    'bg-panel hairline rounded-xl2 mb-5 flex flex-wrap items-center gap-3.5 px-4 py-3',
    className,
  );

  if (children != null) {
    return <div className={cn(shell, 'gap-3')}>{children}</div>;
  }

  return (
    <div className={cn(shell, 'justify-between')}>
      {left != null && <div className="flex flex-wrap items-center gap-3">{left}</div>}
      {right != null && <div className="flex flex-wrap items-center gap-3">{right}</div>}
    </div>
  );
}
