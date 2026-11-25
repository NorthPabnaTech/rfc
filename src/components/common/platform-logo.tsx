import Image from 'next/image';
import Link from 'next/link';

import { PLATFORM } from '@config/platform';
import { cn } from '@lib/utils';

type Props = {
  /** `light` = on navy surfaces (sidebar, hero); `dark` = on light surfaces. */
  tone?: 'light' | 'dark' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  /** Show only the mark (collapsed sidebar, favicon-like spots). */
  markOnly?: boolean;
  href?: string | null;
  className?: string;
};

const MARK_RATIO = 863 / 381;
const SIZES = {
  sm: { mark: 22, word: 'text-[13px] tracking-[0.22em] -mr-[0.22em]' },
  md: { mark: 26, word: 'text-[15px] tracking-[0.24em] -mr-[0.24em]' },
  lg: { mark: 36, word: 'text-[20px] tracking-[0.26em] -mr-[0.26em]' },
} as const;

export function PlatformMark({
  size = 26,
  tone = 'light',
  className,
}: {
  size?: number;
  tone?: 'light' | 'dark' | 'auto';
  className?: string;
}) {
  const width = Math.round(size * MARK_RATIO);
  return (
    <Image
      src={tone === 'dark' ? '/brand/rfc-mark-dark.png' : '/brand/rfc-mark-light.png'}
      alt={PLATFORM.name}
      width={width}
      height={size}
      priority
      className={cn('block shrink-0', className)}
      style={{ width, height: size }}
    />
  );
}

export function PlatformLogo({
  tone = 'auto',
  size = 'md',
  markOnly = false,
  href = '/',
  className,
}: Props) {
  const s = SIZES[size];
  const word = PLATFORM.name.replace(/^RFC\s*/i, '').trim() || 'HUB';
  const lockup = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <PlatformMark size={s.mark} tone={tone} />
      {!markOnly && (
        <span className="cap-trim block">
          <span
            className={cn(
              'font-display block leading-none font-semibold uppercase',
              s.word,
              tone === 'light' ? 'text-brand-300' : 'text-brand-600',
            )}
          >
            {word}
          </span>
        </span>
      )}
    </span>
  );
  if (!href) return lockup;
  return (
    <Link href={href} aria-label={PLATFORM.name} className="focus-ring rounded-md">
      {lockup}
    </Link>
  );
}
