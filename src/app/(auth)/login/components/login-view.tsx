'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { Role } from '@/types/platform';
import { Form, FormCheckbox, FormInput, FormPassword } from '@components/form';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { Callout } from '@components/shared';
import { Button } from '@components/ui/button';
import { toast } from '@lib/toast';
import { cn } from '@lib/utils';
import { loginSchema } from '@lib/validators/reseller';

export function LoginView() {
  const { t } = useI18n();
  const login = usePlatformStore((s) => s.login);
  const router = useRouter();
  const [role, setRole] = React.useState<Role>('seller');
  const schema = React.useMemo(() => loginSchema(t), [t]);

  const enter = (r: Role) => {
    login(r);
    router.push(r === 'admin' ? '/admin' : '/seller');
  };

  const roles: { value: Role; icon: IconRegistryKey; title: string; desc: string }[] = [
    { value: 'seller', icon: 'store', title: t('auth.demoSeller'), desc: t('auth.demoSellerDesc') },
    {
      value: 'admin',
      icon: 'shieldCheck',
      title: t('auth.demoAdmin'),
      desc: t('auth.demoAdminDesc'),
    },
  ];

  return (
    <div>
      <h1 className="type-page-title text-ink">{t('auth.welcomeBack')}</h1>
      <p className="type-body text-muted mt-1.5">{t('auth.loginSubtitle')}</p>

      {/* Development preview: demo role selector */}
      <div className="border-brand-200 bg-brand-soft/50 mt-7 rounded-2xl border border-dashed p-4 dark:border-white/15">
        <div className="flex items-center gap-2">
          <Icon name="sparkles" size={16} className="text-brand-ink" />
          <span className="type-label text-ink">{t('auth.demoTitle')}</span>
        </div>
        <p className="type-helper text-muted mt-1">{t('auth.demoHint')}</p>
        <div
          className="mt-3 grid gap-2.5 sm:grid-cols-2"
          role="radiogroup"
          aria-label={t('auth.demoTitle')}
        >
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={role === r.value}
              onClick={() => setRole(r.value)}
              className={cn(
                'focus-ring bg-panel rounded-xl border p-3 text-left transition-colors',
                role === r.value
                  ? 'border-brand ring-brand ring-1'
                  : 'border-line hover:border-line-2',
              )}
            >
              <span className="flex items-center gap-2">
                <Icon
                  name={r.icon}
                  size={18}
                  className={role === r.value ? 'text-accent' : 'text-muted'}
                />
                <span className="type-label text-ink">{r.title}</span>
              </span>
              <span className="type-caption text-muted mt-1 block">{r.desc}</span>
            </button>
          ))}
        </div>
        <Button variant="primary" className="mt-3 w-full" onClick={() => enter(role)}>
          {t('auth.continueAs', {
            role: role === 'admin' ? t('auth.demoAdmin') : t('auth.demoSeller'),
          })}
          <Icon name="chevRight" size={16} />
        </Button>
      </div>

      <div className="text-subtle my-6 flex items-center gap-3 text-xs">
        <span className="bg-line h-px flex-1" />
        {t('auth.or')}
        <span className="bg-line h-px flex-1" />
      </div>

      <Form
        schema={schema}
        initialValues={{ email: '', password: '', remember: true }}
        onFinish={() => {
          toast.info(t('auth.demoNotice'));
        }}
        className="flex flex-col gap-y-5"
      >
        <FormInput
          name="email"
          label={t('common.email')}
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        <FormPassword
          name="password"
          label={t('auth.password')}
          required
          autoComplete="current-password"
        />
        <div className="flex items-center justify-between gap-3">
          <FormCheckbox name="remember" label={t('auth.remember')} />
          <Link
            href="/forgot-password"
            className="text-accent text-[13px] font-semibold hover:underline"
          >
            {t('auth.forgot')}
          </Link>
        </div>
        <Button type="submit" variant="noir" size="lg" className="w-full">
          {t('auth.signIn')}
        </Button>
      </Form>

      <Callout tone="neutral" compact className="mt-5" description={t('auth.demoNotice')} />

      <p className="text-muted mt-6 text-center text-sm">
        {t('auth.noAccount')}{' '}
        <Link href="/register" className="text-accent font-semibold hover:underline">
          {t('auth.register')}
        </Link>
      </p>
    </div>
  );
}
