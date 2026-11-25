'use client';

import { useI18n } from '@/i18n/provider';
import { Icon, type IconRegistryKey } from '@components/icon/icon';

export function AuthAside() {
  const { t, money } = useI18n();
  const points: [IconRegistryKey, string][] = [
    ['packageOpen', t('site.hero.point1')],
    ['saleTag', t('site.hero.point2')],
    ['shipping', t('site.hero.point3')],
  ];
  return (
    <aside className="bg-noir-glow relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:p-14">
      <div className="bg-dot-grid absolute inset-0 opacity-20" aria-hidden />
      <div
        className="absolute -right-24 -bottom-24 size-96 rounded-full bg-[#fb8500]/15 blur-3xl"
        aria-hidden
      />
      <div className="relative max-w-md">
        <h2 className="text-[2rem] leading-tight font-extrabold text-white">
          {t('auth.asideTitle')}
        </h2>
        <p className="text-noir-fg mt-4">{t('auth.asideSubtitle')}</p>
        <ul className="mt-8 space-y-4">
          {points.map(([icon, label]) => (
            <li key={label} className="flex items-center gap-3 text-white">
              <span className="grid size-10 place-items-center rounded-xl bg-white/10">
                <Icon name={icon} size={19} />
              </span>
              <span className="font-medium">{label}</span>
            </li>
          ))}
        </ul>
        <div
          className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
          aria-hidden
        >
          <div className="text-noir-fg flex items-center justify-between text-xs">
            <span>{t('site.earnings.selling')}</span>
            <span className="num font-bold text-white">{money(700)}</span>
          </div>
          <div className="text-noir-fg mt-2 flex items-center justify-between text-xs">
            <span>{t('site.earnings.base')}</span>
            <span className="num font-bold text-white">{money(550)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-sm font-semibold text-white">{t('site.earnings.profit')}</span>
            <span className="num text-lg font-extrabold text-[#ffb703]">{money(150)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
