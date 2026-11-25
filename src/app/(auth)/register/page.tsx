'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { Form, FormCheckbox, FormInput, FormPassword, FormSelect } from '@components/form';
import { Callout } from '@components/shared';
import { Button } from '@components/ui/button';
import { DISTRICTS } from '@lib/business/delivery';
import { toast } from '@lib/toast';
import { registerSchema } from '@lib/validators/reseller';

export default function RegisterPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const schema = React.useMemo(() => registerSchema(t), [t]);
  const districts = React.useMemo(
    () => DISTRICTS.map((d) => ({ value: d.name, label: locale === 'bn' ? d.nameBn : d.name })),
    [locale],
  );

  return (
    <div>
      <h1 className="type-page-title text-ink">{t('auth.registerTitle')}</h1>
      <p className="type-body text-muted mt-1.5">{t('auth.registerSubtitle')}</p>
      <Form
        schema={schema}
        initialValues={{
          name: '',
          shopName: '',
          email: '',
          phone: '',
          district: '',
          password: '',
          confirm: '',
          agree: false,
        }}
        onFinish={(v: { email: string }) => {
          toast.success(t('auth.registered'));
          router.push(`/verify-email?email=${encodeURIComponent(v.email)}`);
        }}
        className="mt-7 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2"
      >
        <FormInput name="name" label={t('auth.fullName')} required autoComplete="name" />
        <FormInput name="shopName" label={t('auth.shopName')} required />
        <FormInput
          name="email"
          type="email"
          label={t('common.email')}
          required
          autoComplete="email"
        />
        <FormInput
          name="phone"
          label={t('common.phone')}
          placeholder="01XXXXXXXXX"
          required
          inputMode="tel"
        />
        <FormSelect
          name="district"
          label={t('auth.district')}
          items={districts}
          showSearch
          required
          className="sm:col-span-2"
        />
        <FormPassword
          name="password"
          label={t('auth.password')}
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
        <FormCheckbox name="agree" label={t('auth.agree')} className="sm:col-span-2" />
        <Button type="submit" variant="primary" size="lg" className="w-full sm:col-span-2">
          {t('auth.createAccount')}
        </Button>
      </Form>
      <Callout tone="neutral" compact className="mt-5" description={t('auth.demoNotice')} />
      <p className="text-muted mt-6 text-center text-sm">
        {t('auth.haveAccount')}{' '}
        <Link href="/login" className="text-accent font-semibold hover:underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </div>
  );
}
