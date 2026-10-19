import Link from 'next/link';

import { RatingStars } from '@/features/products/rating-stars';
import type { ReviewDTO } from '@/types';
import { formatStoreDate } from '@lib/utils';

import { SectionHeading } from './section-heading';

export function ReviewsSection({ reviews }: { reviews: ReviewDTO[] }) {
  if (reviews.length === 0) return null;
  return (
    <section className="container-page pt-10 sm:pt-12">
      <SectionHeading
        title="What our customers say"
        subtitle="Verified reviews from real orders"
        icon="star"
      />
      <ul className="scrollbar-hidden -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {reviews.map((r) => (
          <li
            key={r.id}
            className="border-line flex w-[82%] shrink-0 snap-start flex-col rounded-2xl border bg-white p-5 sm:w-auto"
          >
            <RatingStars value={r.rating} size={15} />
            <p className="text-base-700 mt-3 line-clamp-4 flex-1 text-[14px] leading-relaxed">
              “{r.comment}”
            </p>
            <div className="border-line mt-4 flex items-center gap-3 border-t pt-4">
              <span className="bg-brand-gradient text-brand-contrast grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold">
                {r.userName.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="text-ink truncate text-[13px] font-semibold">{r.userName}</p>
                <p className="text-subtle truncate text-[11.5px]">
                  {r.productSlug ? (
                    <Link href={`/products/${r.productSlug}`} className="hover:text-accent">
                      {r.productName}
                    </Link>
                  ) : (
                    r.productName
                  )}{' '}
                  · {formatStoreDate(r.createdAt)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
