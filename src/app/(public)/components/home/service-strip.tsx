import { IconMedallion, IconText } from '@components/common/icon-text';
import type { IconRegistryKey } from '@components/icon/icon';

const ITEMS: [IconRegistryKey, string, string][] = [
  ['money', 'Cash on Delivery', 'Pay when you receive'],
  ['shipping', 'Nationwide delivery', 'All 64 districts'],
  ['badgeCheck', 'Quality checked', 'Every product reviewed'],
  ['support', 'Friendly support', 'Call or message us'],
];

export function ServiceStrip() {
  return (
    <section className="container-page pt-3 sm:pt-4" aria-label="Why shop with us">
      <ul className="border-line grid grid-cols-2 divide-y divide-[var(--color-line)] overflow-hidden rounded-2xl border bg-white shadow-xs lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {ITEMS.map(([icon, title, sub]) => (
          <li
            key={title}
            className="hover:bg-cream/50 flex items-center px-3.5 py-3 transition-colors sm:px-5 sm:py-3.5"
          >
            <IconText
              className="gap-3"
              media={
                <IconMedallion icon={icon} size="md" className="bg-brand-soft text-brand-ink" />
              }
              textClassName="text-ink text-[13px] font-semibold"
              subtitle={sub}
              subtitleClassName="text-muted hidden text-[12px] font-normal sm:block"
            >
              {title}
            </IconText>
          </li>
        ))}
      </ul>
    </section>
  );
}
