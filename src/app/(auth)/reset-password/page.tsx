'use client';

import * as React from 'react';
import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { Form, FormPassword } from '@components/form';
import { Icon } from '@components/icon/icon';
import { Callout } from '@components/shared';
import { Button } from '@components/ui/button';
import { resetSchema } from '@lib/validators/reseller';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const schema = React.useMemo(() => resetSchema(t), [t]);
  const [done, setDone] = React.useState(false);

  return (
    <div>
      <span className="bg-brand-soft text-brand-ink grid size-12 place-items-center rounded-2xl">
        <Icon name="shieldCheck" size={22} />
      </span>
      <h1 className="type-page-title text-ink mt-5">{t('auth.resetTitle')}</h1>
      <p className="type-body text-muted mt-1.5">{t('auth.resetSubtitle')}</p>
      {done ? (
        <div className="mt-7 space-y-4">
          <Callout tone="success" description={t('auth.resetDone')} />
          <Button variant="primary" asChild className="w-full">
            <Link href="/login">{t('auth.signIn')}</Link>
          </Button>
        </div>
      ) : (
        <Form
          schema={schema}
          initialValues={{ password: '', confirm: '' }}
          onFinish={() => setDone(true)}
          className="mt-7 flex flex-col gap-y-5"
        >
          <FormPassword
            name="password"
            label={t('auth.newPassword')}
            hint={t('auth.passwordMin')}
            required
            autoComplete="new-password"
          />
          <FormPassword
            name="confirm"
            label={t('auth.confirmPassword')}
            required
            autoComplete="new-password"
          />
          <Button type="submit" variant="primary" size="lg" className="w-full">
            {t('auth.updatePassword')}
          </Button>
        </Form>
      )}
      <Callout tone="neutral" compact className="mt-5" description={t('auth.demoNotice')} />
    </div>
  );
}
