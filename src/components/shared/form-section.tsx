import * as React from 'react';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * FormSection — a labelled group of fields, the building block for structured
 * forms. Renders an "eyebrow" header (small, uppercase, accent icon) with a
 * trailing hairline rule so a long form reads as distinct, separated sections
 * instead of one undifferentiated stack.
 *
 *   <FormSection title="Contact" icon="user" description="How we reach them.">
 *     <FormInput ... />
 *     <FormInput ... />
 *   </FormSection>
 * ──────────────────────────────────────────────────────────────────────── */

type Props = {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Small accent icon shown before the title. */
  icon?: IconRegistryKey;
  /** Right-aligned control on the header row (e.g. an "Add" button). */
  action?: React.ReactNode;
  /** Layout of the field area. `grid` (default) stacks with a 4-gap. */
  children: React.ReactNode;
  className?: string;
  /** Classes for the inner field container. */
  contentClassName?: string;
};

export function FormSection({
  title,
  description,
  icon,
  action,
  children,
  className,
  contentClassName,
}: Props) {
  return (
    <section className={cn('space-y-4', className)}>
      <header className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="bg-accent-soft text-accent grid h-5 w-5 shrink-0 place-items-center rounded-md">
              <Icon name={icon} size={12} stroke={1.9} />
            </span>
          )}
          <h3 className="type-overline text-subtle">{title}</h3>
          <span className="bg-line h-px flex-1" aria-hidden />
          {action}
        </div>
        {description && <p className="type-helper text-muted">{description}</p>}
      </header>

      <div className={cn('grid gap-x-4 gap-y-5', contentClassName)}>{children}</div>
    </section>
  );
}
