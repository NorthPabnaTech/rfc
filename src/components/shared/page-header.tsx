import * as React from 'react';

import { cn } from '@lib/utils';

import { BackNavigation } from './back-navigation';

type Props = {
  title: string;
  /** Small label shown above the title (optional). */
  subtitle?: React.ReactNode;
  /** One-line description shown below the title (optional). */
  description?: React.ReactNode;
  /** Right-aligned action buttons (optional). */
  actions?: React.ReactNode;
  className?: string;
  /** Callback for top-left Back navigation. */
  onBack?: () => void;
  /** Target route for top-left Back navigation. */
  backHref?: string;
  /** Label for Back navigation (default: "Back"). */
  backLabel?: string;
};

/**
 * Page header — an optional back navigation link, an optional subtitle above
 * the title, the title, and an optional description below it, with actions aligned to the right.
 *
 *   title       26px / 600 / base-800
 *   description 14px / 500 / base-600
 *   subtitle    14px / 400 / base-500
 */
export function PageHeader({
  title,
  subtitle,
  description,
  actions,
  className,
  onBack,
  backHref,
  backLabel,
}: Props) {
  return (
    <div className={cn('mb-6', className)}>
      {(onBack || backHref) && (
        <div className="mb-2.5">
          <BackNavigation to={backHref} onBack={onBack} label={backLabel} />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {subtitle && <p className="type-helper text-muted mb-1">{subtitle}</p>}

          <h1 className="type-page-title text-ink break-words">{title}</h1>

          {description && <p className="type-body text-muted mt-1.5">{description}</p>}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
