'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { PlatformLogo } from '@components/common/platform-logo';
import { Icon } from '@components/icon/icon';
import { useTelegramLinks } from '@components/platform/telegram-card';
import { PLATFORM } from '@config/platform';

export function SiteFooter() {
  const { t } = useI18n();
  const links = useTelegramLinks();
  const year = new Date().getFullYear();

  const tg = (href: string, label: string, icon: 'telegram' | 'users') =>
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 transition-colors hover:text-white"
      >
        <Icon name={icon} size={16} />
        {label}
      </a>
    ) : (
      <span className="inline-flex items-center gap-2 opacity-60" title={t('common.notConfigured')}>
        <Icon name={icon} size={16} />
        {label} <span className="text-[11px]">· {t('common.notConfigured')}</span>
      </span>
    );

  return (
    <footer className="bg-noir-glow text-noir-fg">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <PlatformLogo tone="light" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">{t('site.footer.about')}</p>
        </div>
        <div>
          <h3 className="text-[13px] font-bold tracking-wider text-white uppercase">
            {t('site.footer.platform')}
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/#how-it-works" className="hover:text-white">
                {t('site.howItWorks')}
              </Link>
            </li>
            <li>
              <Link href="/#features" className="hover:text-white">
                {t('site.navFeatures')}
              </Link>
            </li>
            <li>
              <Link href="/products" className="hover:text-white">
                {t('site.products')}
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="hover:text-white">
                {t('site.navFaq')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-[13px] font-bold tracking-wider text-white uppercase">
            {t('site.footer.company')}
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/register" className="hover:text-white">
                {t('site.becomeSeller')}
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                {t('site.login')}
              </Link>
            </li>
            <li>
              <Link href="/#contact" className="hover:text-white">
                {t('site.navContact')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-[13px] font-bold tracking-wider text-white uppercase">
            {t('site.footer.support')}
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>{tg(links.support, t('site.contact.supportTitle'), 'telegram')}</li>
            <li>{tg(links.group, t('site.contact.groupTitle'), 'users')}</li>
          </ul>
        </div>
      </div>
      <div className="border-noir-line border-t">
        <div className="container-page flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {year} {PLATFORM.name}. {t('site.footer.rights')}
          </span>
          <span className="flex gap-4">
            <span>{t('site.footer.terms')}</span>
            <span>{t('site.footer.privacy')}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
