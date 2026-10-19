'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Icon } from '@components/icon/icon';
import { cn } from '@lib/utils';

export type BackNavigationProps = {
  /** Target route to navigate back to. If omitted and onBack is not provided, navigates back in history. */
  to?: string;
  /** Custom click handler. */
  onBack?: () => void;
  /** Button label (default: "Back"). */
  label?: string;
  /** Additional CSS classes. */
  className?: string;
};

const CLASSES =
  'group text-muted hover:text-brand-ink focus-visible:ring-brand/40 inline-flex cursor-pointer items-center gap-1.5 rounded-sm py-0.5 text-xs font-semibold transition-colors select-none focus:outline-hidden focus-visible:ring-2';

/**
 * Details-page back link, positioned above the page title.
 * Renders a real <Link> when `to` is given (prefetchable, works without JS).
 */
export function BackNavigation({ to, onBack, label = 'Back', className }: BackNavigationProps) {
  const router = useRouter();
  const content = (
    <>
      <Icon
        name="arrowLeft"
        size={14}
        className="text-current transition-transform group-hover:-translate-x-0.5"
      />
      <span>{label}</span>
    </>
  );

  if (to && !onBack) {
    return (
      <Link href={to} className={cn(CLASSES, className)}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => (onBack ? onBack() : router.back())}
      className={cn(CLASSES, className)}
      aria-label={label}
    >
      {content}
    </button>
  );
}
