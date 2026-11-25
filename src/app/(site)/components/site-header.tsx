'use client';

import * as React from 'react';
import Link from 'next/link';

import { type TKey, useI18n } from '@/i18n/provider';
import { useResellerAuth } from '@/stores/reseller-auth';
import { PlatformLogo } from '@components/common/platform-logo';
import { Icon } from '@components/icon/icon';
import { LanguageSwitcher, ThemeSwitcher } from '@components/platform/switchers';
import { Button } from '@components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@components/ui/sheet';
import { cn } from '@lib/utils';

export const SITE_LINKS: { label: TKey; href: string }[] = [
  { label: 'site.home', href: '/' },
  { label: 'site.howItWorks', href: '/#how-it-works' },
  { label: 'site.navFeatures', href: '/#features' },
  { label: 'site.products', href: '/products' },
  { label: 'site.navFaq', href: '/#faq' },
  { label: 'site.navContact', href: '/#contact' },
];

export function SiteHeader() {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { initialized, reseller, init } = useResellerAuth();
  const dashboard = '/seller';

  React.useEffect(() => {
    void init();
  }, [init]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-200',
        scrolled
          ? 'bg-panel/85 border-line border-b shadow-[0_4px_20px_-12px_rgb(2_48_71/0.25)] backdrop-blur-md'
          : 'border-b border-transparent',
      )}
    >
      <div className="container-page flex h-16 items-center gap-4 lg:h-[72px]">
        <PlatformLogo size="md" />
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
          {SITE_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-muted hover:text-ink focus-ring rounded-md px-3 py-2 text-[14px] font-medium transition-colors"
            >
              {t(l.label)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {initialized && reseller ? (
            <Button variant="primary" size="md" asChild className="ml-1 hidden sm:inline-flex">
              <Link href={dashboard}>
                <Icon name="grid" size={16} />
                {t('site.goToDashboard')}
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="md" asChild className="ml-1 hidden sm:inline-flex">
                <Link href="/login">{t('site.login')}</Link>
              </Button>
              <Button
                size="md"
                asChild
                className="bg-highlight text-highlight-contrast hover:bg-highlight-hover hidden font-semibold sm:inline-flex"
              >
                <Link href="/register">{t('site.becomeSeller')}</Link>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label={t('common.menu')}
          >
            <Icon name="menu" size={20} />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[300px] max-w-[85vw] gap-0 p-0">
          <SheetTitle className="sr-only">{t('common.menu')}</SheetTitle>
          <div className="border-line flex h-16 items-center border-b px-5">
            <PlatformLogo size="sm" />
          </div>
          <nav className="flex flex-col p-3" aria-label="Mobile">
            {SITE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-ink hover:bg-well rounded-lg px-3 py-3 text-[15px] font-medium"
              >
                {t(l.label)}
              </Link>
            ))}
          </nav>
          <div className="border-line mt-auto flex flex-col gap-2 border-t p-4">
            {initialized && reseller ? (
              <Button variant="primary" asChild>
                <Link href={dashboard}>{t('site.goToDashboard')}</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/login">{t('site.login')}</Link>
                </Button>
                <Button
                  asChild
                  className="bg-highlight text-highlight-contrast hover:bg-highlight-hover font-semibold"
                >
                  <Link href="/register">{t('site.becomeSeller')}</Link>
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
