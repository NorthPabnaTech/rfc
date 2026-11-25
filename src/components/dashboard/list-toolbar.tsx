'use client';

import { SearchInput } from '@components/shared';
import { cn } from '@lib/utils';

/** Search + filter controls row above a table (one row on desktop, stacked on mobile). */
export function ListToolbar({
  query,
  onQuery,
  placeholder,
  children,
  end,
  className,
}: {
  query: string;
  onQuery: (q: string) => void;
  placeholder: string;
  children?: React.ReactNode;
  end?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2 lg:flex-row lg:items-center', className)}>
      <SearchInput value={query} onChange={onQuery} placeholder={placeholder} className="lg:w-80" />
      {children && (
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {children}
        </div>
      )}
      {end && <div className="flex items-center gap-2 lg:ml-auto">{end}</div>}
    </div>
  );
}
