import Link from 'next/link';

import type { CategoryTreeDTO, SettingsDTO } from '@/types';
import { IconMedallion, IconText } from '@components/common/icon-text';
import { Logo } from '@components/common/logo';
import { Icon, type IconRegistryKey } from '@components/icon/icon';

export function SiteFooter({
  settings,
  categories,
}: {
  settings: SettingsDTO;
  categories: CategoryTreeDTO[];
}) {
  const socials = (
    [
      ['facebook', settings.social.facebook],
      ['instagram', settings.social.instagram],
      ['tiktok', settings.social.tiktok],
      ['youtube', settings.social.youtube],
      [
        'whatsapp',
        settings.social.whatsapp
          ? `https://wa.me/88${settings.social.whatsapp.replace(/\D/g, '').replace(/^88/, '')}`
          : undefined,
      ],
    ] as [IconRegistryKey, string | undefined][]
  ).filter(([, href]) => !!href);

  return (
    <footer className="bg-noir-glow mt-16 text-white">
      {/* Trust strip */}
      <div className="border-noir-line border-b">
        <div className="container-page grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {(
            [
              ['shipping', 'Nationwide delivery', 'Inside & outside Dhaka'],
              ['money', 'Cash on Delivery', 'Pay when it arrives'],
              ['badgeCheck', 'Quality checked', 'Every product reviewed'],
              ['support', 'Real support', settings.supportPhone],
            ] as [IconRegistryKey, string, string][]
          ).map(([icon, title, sub]) => (
            <IconText
              key={title}
              className="gap-3"
              media={
                <IconMedallion
                  icon={icon}
                  className="text-brand-300 border border-white/10 bg-white/5"
                />
              }
              textClassName="text-sm font-semibold"
              subtitle={sub}
              subtitleClassName="text-noir-fg text-xs font-normal"
            >
              {title}
            </IconText>
          ))}
        </div>
      </div>

      <div className="container-page grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo tone="light" size="lg" tagline />
          <p className="text-noir-fg mt-5 max-w-sm text-sm leading-relaxed">
            Curated fashion, gadgets and lifestyle essentials, delivered to your door anywhere in
            Bangladesh.
          </p>
          {socials.length > 0 && (
            <div className="mt-6 flex gap-2">
              {socials.map(([icon, href]) => (
                <a
                  key={icon}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={icon}
                  className="hover:bg-brand hover:text-brand-contrast grid size-10 place-items-center rounded-full border border-white/10 text-white/80 transition"
                >
                  <Icon name={icon} size={18} />
                </a>
              ))}
            </div>
          )}
        </div>

        <FooterCol title="Shop" className="md:col-span-3">
          {categories.slice(0, 6).map((c) => (
            <FooterLink key={c.id} href={`/products?category=${c.slug}`}>
              {c.name}
            </FooterLink>
          ))}
          <FooterLink href="/products?onSale=1">Deals</FooterLink>
        </FooterCol>

        <FooterCol title="Help" className="md:col-span-2">
          <FooterLink href="/track-order">Track your order</FooterLink>
          <FooterLink href="/account/orders">My orders</FooterLink>
          <FooterLink href="/return-policy">Return policy</FooterLink>
          <FooterLink href="/contact">Contact us</FooterLink>
        </FooterCol>

        <FooterCol title="Contact" className="md:col-span-3">
          <li className="text-noir-fg text-sm">
            <IconText icon="location" iconSize={17} iconClassName="text-brand-400">
              {settings.address}
            </IconText>
          </li>
          <li>
            <a
              href={`tel:${settings.supportPhone}`}
              className="text-noir-fg text-sm hover:text-white"
            >
              <IconText icon="phone" iconSize={17} iconClassName="text-brand-400">
                {settings.supportPhone}
              </IconText>
            </a>
          </li>
          {settings.supportEmail && (
            <li>
              <a
                href={`mailto:${settings.supportEmail}`}
                className="text-noir-fg text-sm hover:text-white"
              >
                <IconText icon="mail" iconSize={17} iconClassName="text-brand-400">
                  {settings.supportEmail}
                </IconText>
              </a>
            </li>
          )}
        </FooterCol>
      </div>

      <div className="border-noir-line border-t">
        <div className="container-page text-noir-fg flex flex-col items-center justify-between gap-2 py-5 text-xs sm:flex-row">
          <p className="cap-trim">
            © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
          </p>
          <IconText icon="money" iconSize={15} iconClassName="text-brand-400" className="gap-2">
            Cash on Delivery available nationwide
          </IconText>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <h3 className="font-display text-brand-300 text-[13px] font-medium tracking-[0.2em] uppercase">
        {title}
      </h3>
      <ul className="mt-5 space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-noir-fg text-sm transition-colors hover:text-white">
        {children}
      </Link>
    </li>
  );
}
