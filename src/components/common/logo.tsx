import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@lib/utils';

type Props = {
  /** `light` = for dark (noir) backgrounds; `dark` = for light backgrounds. */
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  /** Show the "Smart gadgets, delivered" tagline under the lockup. */
  tagline?: boolean;
  href?: string | null;
  className?: string;
};

/**
 * Intrinsic proportions of /brand/rfc-mark-*.png (863 × 381, trimmed to the
 * ink). `-light` has white letters for noir surfaces, `-dark` has ink letters
 * for light surfaces; the blue "C" orbit is identical in both.
 */
const MARK_RATIO = 863 / 381;

// Negative right margins cancel the letter-spacing added after the last
// letter, so the lockup is optically centred in its container.
const SIZES = {
  sm: { mark: 26, word: 'text-[13px] tracking-[0.24em] -mr-[0.24em]', tag: 'text-[7px]' },
  md: { mark: 32, word: 'text-[16px] tracking-[0.26em] -mr-[0.26em]', tag: 'text-[8px]' },
  lg: { mark: 46, word: 'text-[22px] tracking-[0.28em] -mr-[0.28em]', tag: 'text-[10px]' },
};

/**
 * The RFC Gadget lockup: the RFC orbit mark (cut from the logo artwork) next
 * to the GADGET wordmark in brand blue, like the original logo.
 */
export function Logo({
  tone = 'dark',
  size = 'md',
  tagline = false,
  href = '/',
  className,
}: Props) {
  const s = SIZES[size];
  const width = Math.round(s.mark * MARK_RATIO);
  const lockup = (
    <span className={cn('inline-flex items-center gap-2.5', !tagline && className)}>
      <Image
        src={tone === 'light' ? '/brand/rfc-mark-light.png' : '/brand/rfc-mark-dark.png'}
        alt=""
        width={width}
        height={s.mark}
        priority
        className="block shrink-0"
        style={{ width, height: s.mark }}
      />
      <span className="cap-trim block">
        <span
          className={cn(
            'font-display block leading-none font-semibold uppercase',
            s.word,
            tone === 'light' ? 'text-brand-300' : 'text-brand-600',
          )}
        >
          Gadget
        </span>
      </span>
    </span>
  );

  // The tagline is centred under the whole lockup, so the mark + wordmark row
  // keeps its exact alignment.
  const content = (
    <span className={cn('inline-flex flex-col items-center', className)}>
      {lockup}
      {tagline && (
        <span
          className={cn(
            'cap-trim mt-3 mr-[-0.25em] block leading-none font-semibold tracking-[0.25em] uppercase',
            tone === 'light' ? 'text-noir-fg' : 'text-muted',
            s.tag,
          )}
        >
          Smart gadgets, delivered
        </span>
      )}
      <span className="sr-only">RFC Gadget</span>
    </span>
  );

  return href ? (
    <Link
      href={href}
      aria-label="RFC Gadget home"
      className="focus-ring inline-flex items-center rounded-md"
    >
      {content}
    </Link>
  ) : (
    content
  );
}
