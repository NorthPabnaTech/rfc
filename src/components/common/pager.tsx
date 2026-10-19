import Link from 'next/link';

import { Icon } from '@components/icon/icon';
import { cn } from '@lib/utils';

/**
 * Link-based pagination for server-rendered lists: each page is a real URL
 * (crawlable, works without JS). `hrefFor(page)` builds the URL.
 */
export function Pager({
  page,
  pageCount,
  hrefFor,
  className,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  const pages: (number | '…')[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  const item =
    'grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-semibold transition-colors';

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1.5', className)}
    >
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className={cn(item, 'hover:bg-well')}
          aria-label="Previous page"
        >
          <Icon name="chevLeft" size={16} />
        </Link>
      ) : (
        <span className={cn(item, 'text-subtle opacity-40')} aria-hidden>
          <Icon name="chevLeft" size={16} />
        </span>
      )}
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="text-subtle px-1">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(item, p === page ? 'bg-noir text-white' : 'text-ink hover:bg-well')}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={cn(item, 'hover:bg-well')} aria-label="Next page">
          <Icon name="chevRight" size={16} />
        </Link>
      ) : (
        <span className={cn(item, 'text-subtle opacity-40')} aria-hidden>
          <Icon name="chevRight" size={16} />
        </span>
      )}
    </nav>
  );
}
