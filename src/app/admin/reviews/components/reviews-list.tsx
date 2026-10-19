'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { deleteReviewAction, setReviewHiddenAction } from '@/actions/admin';
import { ProductImage } from '@/features/products/product-image';
import { RatingStars } from '@/features/products/rating-stars';
import type { Paginated, ReviewDTO } from '@/types';
import { Pager } from '@components/common/pager';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, EmptyState, StatusBadge } from '@components/shared';
import { Button } from '@components/ui/button';
import { useUrlFilters } from '@hooks/use-url-filters';
import { handleActionResult } from '@lib/action-client';
import { formatStoreDate } from '@lib/utils';

export function ReviewsList({ data }: { data: Paginated<ReviewDTO> }) {
  const router = useRouter();
  const { params } = useUrlFilters();
  const [deleting, setDeleting] = React.useState<ReviewDTO | null>(null);

  if (data.items.length === 0)
    return <EmptyState title="No reviews found" description="Customer reviews will appear here." />;

  const hrefFor = (page: number) => {
    const next = new URLSearchParams(params.toString());
    if (page === 1) next.delete('page');
    else next.set('page', String(page));
    return `/admin/reviews?${next.toString()}`;
  };

  return (
    <>
      <ul className="grid gap-3">
        {data.items.map((r) => (
          <li key={r.id} className="bg-panel hairline rounded-xl2 p-5">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <RatingStars value={r.rating} />
                  <span className="text-ink text-sm font-semibold">{r.userName}</span>
                  <span className="text-subtle text-xs">{formatStoreDate(r.createdAt)}</span>
                  {r.isHidden && <StatusBadge status="neutral" label="Hidden" />}
                </div>
                {r.productSlug && (
                  <Link
                    href={`/products/${r.productSlug}`}
                    target="_blank"
                    className="text-accent mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold hover:underline"
                  >
                    {r.productName} <Icon name="external" size={11} />
                  </Link>
                )}
                <p className="text-base-700 mt-2 text-sm">{r.comment}</p>
                {r.images.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {r.images.map((img) => (
                      <a
                        key={img.url}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-well relative size-16 overflow-hidden rounded-lg"
                      >
                        <ProductImage src={img.url} alt="" fill sizes="64px" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    const res = await setReviewHiddenAction(r.id, !r.isHidden);
                    if (handleActionResult(res)) router.refresh();
                  }}
                >
                  <Icon name={r.isHidden ? 'eye' : 'eyeOff'} size={14} />{' '}
                  {r.isHidden ? 'Show' : 'Hide'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleting(r)}
                  aria-label="Delete review"
                >
                  <Icon name="trash" size={14} />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Pager className="mt-6" page={data.page} pageCount={data.pageCount} hrefFor={hrefFor} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title="Delete this review?"
        description="The review and its photos are removed permanently. Consider hiding it instead."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteReviewAction(deleting.id);
          if (handleActionResult(res)) router.refresh();
        }}
      />
    </>
  );
}
