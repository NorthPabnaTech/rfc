'use client';

import * as React from 'react';
import { z } from 'zod';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { Panel } from '@components/dashboard/panel';
import { Form, FormInput } from '@components/form';
import { Icon } from '@components/icon/icon';
import { UserAvatar } from '@components/platform/user-avatar';
import { Callout, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { toast } from '@lib/toast';
import { BD_PHONE } from '@lib/validators/reseller';

export default function AdminProfilePage() {
  const { t } = useI18n();
  const admin = usePlatformStore((s) => s.admin);
  const update = usePlatformStore((s) => s.updateAdminProfile);
  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t('common.required')),
        email: z.string().trim().email(t('common.invalidEmail')),
        phone: z
          .string()
          .trim()
          .refine((v) => BD_PHONE.test(v.replace(/-/g, '')), t('common.invalidPhone')),
      }),
    [t],
  );
  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.settings.profileTitle')}
        description={t('admin.settings.profileSubtitle')}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Panel className="items-center text-center lg:self-start">
          <div className="flex flex-col items-center pt-6">
            <UserAvatar name={admin.name} size={84} />
            <h2 className="type-section-title text-ink mt-4">{admin.name}</h2>
            <p className="text-muted text-sm">{admin.email}</p>
            <span className="bg-brand-soft text-brand-ink mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
              <Icon name="shieldCheck" size={14} />
              {t('auth.demoAdmin')}
            </span>
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel title={t('seller.profile.personal')}>
            <Form
              schema={schema}
              initialValues={{ name: admin.name, email: admin.email, phone: admin.phone }}
              onFinish={(v: { name: string; email: string; phone: string }) => {
                update(v);
                toast.success(t('common.saved'));
              }}
              className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2"
            >
              <FormInput name="name" label={t('common.name')} required />
              <FormInput name="email" type="email" label={t('common.email')} required />
              <FormInput name="phone" label={t('common.phone')} required />
              <div className="flex flex-col gap-1.5">
                <span className="type-label text-ink">{t('admin.settings.role')}</span>
                <span className="border-line bg-well/60 text-muted flex h-10 items-center rounded-md border px-3 text-sm">
                  {t('auth.demoAdmin')}
                </span>
              </div>
              <div className="flex justify-end sm:col-span-2">
                <Button type="submit" variant="primary">
                  {t('common.saveChanges')}
                </Button>
              </div>
            </Form>
          </Panel>
          <Panel title={t('seller.profile.security')}>
            <Callout tone="neutral" compact description={t('seller.profile.passwordDemo')} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
