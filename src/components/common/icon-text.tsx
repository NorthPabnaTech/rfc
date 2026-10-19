import * as React from 'react';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { cn } from '@lib/utils';

type Props = {
  /** Registry icon, or pass `media` for a custom visual (medallion, image…). */
  icon?: IconRegistryKey;
  iconSize?: number;
  iconClassName?: string;
  media?: React.ReactNode;
  /** First line (or the only line). */
  children: React.ReactNode;
  /** Optional second line under `children`. */
  subtitle?: React.ReactNode;
  className?: string;
  textClassName?: string;
  subtitleClassName?: string;
};

/**
 * An icon beside text, with the text optically centred on the icon.
 *
 * Use this for every "icon + label" row in the store (delivery promises,
 * contact lines, footer notes…) rather than hand-tuning margins. The row is a
 * flex container centred on the cross axis, and the text block is trimmed to
 * cap-height/baseline (`cap-trim`), so the letters — not the font's line box
 * — line up with the middle of the icon, for one line or two.
 */
export function IconText({
  icon,
  iconSize = 18,
  iconClassName,
  media,
  children,
  subtitle,
  className,
  textClassName,
  subtitleClassName,
}: Props) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {media ??
        (icon && <Icon name={icon} size={iconSize} className={cn('shrink-0', iconClassName)} />)}
      {/* A plain block (not flex): text-box trimming applies to block containers. */}
      <span className={cn('cap-trim block min-w-0', textClassName)}>
        <span className="block leading-tight">{children}</span>
        {subtitle && (
          <span className={cn('mt-1.5 block leading-tight', subtitleClassName)}>{subtitle}</span>
        )}
      </span>
    </span>
  );
}

/** Round icon medallion used with `IconText` in feature/trust strips. */
export function IconMedallion({
  icon,
  size = 'md',
  className,
}: {
  icon: IconRegistryKey;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const box = { sm: 'size-9', md: 'size-11', lg: 'size-12' }[size];
  const glyph = { sm: 17, md: 20, lg: 22 }[size];
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full', box, className)}>
      <Icon name={icon} size={glyph} />
    </span>
  );
}
