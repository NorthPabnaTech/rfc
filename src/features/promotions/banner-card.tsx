import Image from 'next/image';
import Link from 'next/link';

import { ProductImage } from '@/features/products/product-image';
import { cn } from '@lib/utils';

export type BannerContent = {
  title: string;
  description?: string;
  eyebrow?: string;
  ctaLabel?: string;
  link?: string;
  /** Omit for a designed brand banner (noir + blue, no photo). */
  imageUrl?: string;
};

type Props = BannerContent & {
  /** `xl` = hero slide, `lg` = wide special banner, `md` = side card. */
  size?: 'xl' | 'lg' | 'md';
  priority?: boolean;
  sizes?: string;
  className?: string;
};

const TITLE = {
  xl: 'text-[26px] sm:text-4xl lg:text-5xl',
  lg: 'text-2xl sm:text-4xl',
  md: 'text-lg sm:text-2xl',
};

/**
 * A promotional banner: full-bleed image with a left-to-right scrim so the
 * copy stays legible on any photo. The whole banner is one link.
 */
export function BannerCard({
  title,
  description,
  eyebrow,
  ctaLabel,
  link,
  imageUrl,
  size = 'lg',
  priority,
  sizes = '100vw',
  className,
}: Props) {
  const body = (
    <>
      {imageUrl ? (
        <>
          <ProductImage
            src={imageUrl}
            alt=""
            fill
            priority={priority}
            sizes={sizes}
            className="-z-10 transition duration-700 group-hover:scale-[1.03]"
          />
          <span
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/35 to-transparent"
          />
        </>
      ) : (
        <>
          <span aria-hidden className="bg-noir-glow absolute inset-0 -z-20" />
          <Image
            src="/brand/rfc-mark-light.png"
            alt=""
            width={300}
            height={132}
            className="pointer-events-none absolute -right-6 -bottom-10 -z-10 w-[45%] max-w-[300px] opacity-25"
          />
        </>
      )}
      <div
        className={cn(
          'relative flex h-full max-w-[34rem] flex-col justify-center text-white',
          size === 'md' ? 'p-4 sm:p-6' : 'p-6 sm:p-10 lg:p-12',
        )}
      >
        {eyebrow && (
          <span className="bg-brand text-brand-contrast mb-3 w-fit rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase">
            {eyebrow}
          </span>
        )}
        <h2 className={cn('font-display leading-[1.08] font-semibold text-balance', TITLE[size])}>
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              'mt-2.5 line-clamp-2 text-white/80',
              size === 'md' ? 'hidden text-[13px] sm:block' : 'text-sm sm:text-base',
            )}
          >
            {description}
          </p>
        )}
        {link && (
          <span
            className={cn(
              'mt-5 inline-flex w-fit items-center gap-1.5 rounded-lg font-semibold transition',
              size === 'md'
                ? 'text-brand-300 text-[13px] group-hover:gap-2.5'
                : 'bg-brand text-brand-contrast group-hover:bg-brand-hover px-5 py-2.5 text-sm',
            )}
          >
            {ctaLabel || 'Shop now'} <span aria-hidden>→</span>
          </span>
        )}
      </div>
    </>
  );

  const classes = cn('group relative isolate block overflow-hidden rounded-2xl bg-noir', className);
  if (!link) return <div className={classes}>{body}</div>;
  const external = /^https?:\/\//.test(link);
  return external ? (
    <a href={link} target="_blank" rel="noopener noreferrer" className={classes}>
      {body}
    </a>
  ) : (
    <Link href={link} className={classes}>
      {body}
    </Link>
  );
}
