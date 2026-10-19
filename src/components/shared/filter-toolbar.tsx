import * as React from 'react';

import { cn } from '@lib/utils';

export type FilterToolbarProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
};

/**
 * FilterToolbar — Standard shared toolbar layout for table/list pages.
 *
 * Enforces consistent, equal spacing (12px / gap-3) between Search and all filters.
 * Eliminates large arbitrary gaps, ml-auto pushes, justify-between, and flex-1 sprawl.
 * Controls stay naturally grouped on desktop and wrap gracefully with consistent
 * horizontal and vertical gaps on narrower viewports.
 */
export function FilterToolbar({ children, className, ...props }: FilterToolbarProps) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-center gap-3', className)} {...props}>
      {children}
    </div>
  );
}
