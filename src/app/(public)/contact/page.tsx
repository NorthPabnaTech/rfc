import type { Metadata } from 'next';

import { getSettings } from '@/services/settings';
import { Icon, type IconRegistryKey } from '@components/icon/icon';

export const metadata: Metadata = { title: 'Contact us' };

export default async function ContactPage() {
  const s = await getSettings();
  const cards: [IconRegistryKey, string, string, string | undefined][] = [
    ['phone', 'Call us', s.supportPhone, `tel:${s.supportPhone}`],
    ['location', 'Visit us', s.address, undefined],
  ];
  if (s.supportEmail) cards.push(['mail', 'Email', s.supportEmail, `mailto:${s.supportEmail}`]);
  if (s.social.whatsapp) {
    const wa = s.social.whatsapp.replace(/\D/g, '').replace(/^88/, '');
    cards.push(['whatsapp', 'WhatsApp', s.social.whatsapp, `https://wa.me/88${wa}`]);
  }
  return (
    <div className="container-page max-w-4xl py-14">
      <p className="text-accent text-[11px] font-bold tracking-[0.22em] uppercase">
        We’re here to help
      </p>
      <h1 className="type-display text-ink mt-2">Contact {s.storeName}</h1>
      <p className="text-muted mt-3 max-w-lg">
        Questions about a product, an order or a delivery? Reach out — we usually reply within a few
        hours.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {cards.map(([icon, title, value, href]) => {
          const body = (
            <>
              <span className="bg-noir text-brand-300 grid size-12 place-items-center rounded-2xl">
                <Icon name={icon} size={22} />
              </span>
              <div className="cap-trim">
                <p className="text-muted text-sm leading-tight">{title}</p>
                <p className="text-ink mt-1.5 leading-tight font-semibold">{value}</p>
              </div>
            </>
          );
          return href ? (
            <a
              key={title}
              href={href}
              className="bg-cream hover:shadow-pop flex items-center gap-4 rounded-3xl p-6 transition"
            >
              {body}
            </a>
          ) : (
            <div key={title} className="bg-cream flex items-center gap-4 rounded-3xl p-6">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
