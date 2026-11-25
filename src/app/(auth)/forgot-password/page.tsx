'use client';

import * as React from 'react';
import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { Form, FormInput } from '@components/form';
import { Icon } from '@components/icon/icon';
import { Callout } from '@components/shared';
import { Button } from '@components/ui/button';
import { forgotSchema } from '@lib/validators/reseller';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const schema = React.useMemo(() => forgotSchema(t), [t]);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  return (
    <div>
      <span className="bg-brand-soft text-brand-ink grid size-12 place-items-center rounded-2xl">
        <Icon name="lock" size={22} />
      </span>
      <h1 className="type-page-title text-ink mt-5">{t('auth.forgotTitle')}</h1>
      <p className="type-body text-muted mt-1.5">{t('auth.forgotSubtitle')}</p>
      {sentTo ? (
        <div className="mt-7 space-y-4">
          <Callout tone="success" description={t('auth.linkSent', { email: sentTo })} />
          <Button variant="outline" asChild className="w-full">
            <Link href="/reset-password">{t('auth.resetTitle')}</Link>
          </Button>
        </div>
      ) : (
        <Form
          schema={schema}
          initialValues={{ email: '' }}
          onFinish={(v: { email: string }) => setSentTo(v.email)}
          className="mt-7 flex flex-col gap-y-5"
        >
          <FormInput
            name="email"
            type="email"
            label={t('common.email')}
            required
            autoComplete="email"
          />
          <Button type="submit" variant="primary" size="lg" className="w-full">
            {t('auth.sendLink')}
          </Button>
        </Form>
      )}
      <Link
        href="/login"
        className="text-muted hover:text-ink mt-6 flex items-center justify-center gap-1.5 text-sm font-medium"
      >
        <Icon name="arrowLeft" size={15} />
        {t('auth.backToLogin')}
      </Link>
    </div>
  );
}
