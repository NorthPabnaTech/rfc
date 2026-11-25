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

const SIZES = { sm: 28, md: 34, lg: 42 } as const;

/**
 * Platform mark: an open box with an upward "growth" arrow — reselling
 * without holding stock. Ocean → sky gradient body with an orange arrow.
 */
export function PlatformMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id="pm-body" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8ecae6" />
          <stop offset="0.55" stopColor="#219ebc" />
          <stop offset="1" stopColor="#136780" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="11" fill="url(#pm-body)" />
      <path
        d="M11 17.5 20 13l9 4.5v9L20 31l-9-4.5v-9Z"
        fill="#fff"
        fillOpacity="0.16"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M11 17.5 20 22l9-4.5M20 22v9"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M24.5 12.5 30 7m0 0h-4.6M30 7v4.6"
        stroke="#ffb703"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlatformLogo({
  tone = 'auto',
  size = 'md',
  markOnly = false,
  href = '/',
  className,
}: Props) {
  const px = SIZES[size];
  const [first, ...rest] = splitName(PLATFORM.name);
  const lockup = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <PlatformMark size={px} />
      {!markOnly && (
        <span
          className={cn(
            'leading-none font-extrabold tracking-tight',
            size === 'sm' ? 'text-[16px]' : size === 'lg' ? 'text-[24px]' : 'text-[19px]',
            tone === 'light' ? 'text-white' : 'text-ink',
          )}
        >
          {first}
          <span className={tone === 'light' ? 'text-brand-200' : 'text-brand-500'}>
            {rest.join('')}
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

/** "ResellHub" → ["Resell", "Hub"] (split at the last capital) for two-tone type. */
function splitName(name: string): string[] {
  const idx = name.slice(1).search(/[A-Z](?=[^A-Z]*$)/);
  if (idx < 0) return [name];
  return [name.slice(0, idx + 1), name.slice(idx + 1)];
}
