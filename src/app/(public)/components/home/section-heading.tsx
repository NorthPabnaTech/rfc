import Link from 'next/link';

import { Icon, type IconRegistryKey } from '@components/icon/icon';

/** Store section header: icon + title on the left, "View all" on the right. */
export function SectionHeading({
  title,
  subtitle,
  icon,
  href,
  linkLabel = 'View all',
  rightExtra,
}: {
  title: string;
  subtitle?: string;
  icon?: IconRegistryKey;
  href?: string;
  linkLabel?: string;
  rightExtra?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="bg-noir text-brand-300 hidden size-10 shrink-0 place-items-center rounded-xl shadow-xs ring-1 ring-black/5 sm:grid">
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
      {(rightExtra || href) && (
        <div className="flex shrink-0 items-center gap-2">
          {rightExtra}
          {href && (
            <Link
              href={href}
              className="group text-ink border-line-2/70 hover:bg-noir hover:border-noir flex shrink-0 items-center gap-1 rounded-xl border bg-white px-3.5 py-1.5 text-[13px] font-semibold shadow-xs transition-all hover:text-white"
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
      )}
    </div>
  );
}
