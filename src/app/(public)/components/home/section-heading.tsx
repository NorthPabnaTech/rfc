import Link from 'next/link';

import { Icon, type IconRegistryKey } from '@components/icon/icon';

/** Store section header: icon + title on the left, "View all" on the right. */
export function SectionHeading({
  title,
  subtitle,
  icon,
  href,
  linkLabel = 'View all',
}: {
  title: string;
  subtitle?: string;
  icon?: IconRegistryKey;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="bg-noir text-brand-300 hidden size-10 shrink-0 place-items-center rounded-xl sm:grid">
            <Icon name={icon} size={19} />
          </span>
        )}
        <div className="cap-trim">
          <h2 className="font-display text-ink text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h2>
          {subtitle && <p className="text-muted mt-0.5 text-[13px]">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="group text-ink hover:border-ink border-line-2/70 flex shrink-0 items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-[13px] font-semibold transition"
        >
          {linkLabel}
          <Icon
            name="chevRight"
            size={14}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </div>
  );
}
