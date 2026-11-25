'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { useCurrentSeller, usePlatformStore } from '@/stores/platform-store';
import type { PaymentMethod } from '@/types/platform';
import { Panel } from '@components/dashboard/panel';
import { Form, FormInput, FormSelect } from '@components/form';
import { Icon } from '@components/icon/icon';
import { StatusPill } from '@components/platform/status-pill';
import { UserAvatar } from '@components/platform/user-avatar';
import { Callout, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { DISTRICTS } from '@lib/business/delivery';
import { toast } from '@lib/toast';
import { profileSchema } from '@lib/validators/reseller';

type Values = {
  name: string;
  shopName: string;
  email: string;
  phone: string;
  district: string;
  address: string;
  payoutMethod: PaymentMethod;
  payoutAccount: string;
};

export default function SellerProfilePage() {
  const { t, date, locale } = useI18n();
  const seller = useCurrentSeller();
  const updateSeller = usePlatformStore((s) => s.updateSeller);
  const schema = React.useMemo(() => profileSchema(t), [t]);
  if (!seller) return null;

  return (
    <div className="space-y-5">
      <PageHeader title={t('seller.profile.title')} description={t('seller.profile.subtitle')} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Panel className="lg:self-start">
          <div className="flex flex-col items-center pt-6 text-center">
            <UserAvatar name={seller.name} color={seller.avatarColor} size={84} />
            <h2 className="type-section-title text-ink mt-4">{seller.name}</h2>
            <p className="text-muted text-sm">{seller.shopName}</p>
            <StatusPill kind="seller" value={seller.status} className="mt-3" />
            <p className="text-subtle mt-3 text-xs">
              {t('seller.profile.memberSince', { date: date(seller.joinedAt) })}
            </p>
          </div>
        </Panel>
        <Form<Values>
          schema={schema}
          initialValues={{
            name: seller.name,
            shopName: seller.shopName,
            email: seller.email,
            phone: seller.phone,
            district: seller.district,
            address: seller.address,
            payoutMethod: seller.payout.method,
            payoutAccount: seller.payout.account,
          }}
          onFinish={(v) => {
            updateSeller(seller.id, {
              name: v.name,
              shopName: v.shopName,
              email: v.email,
              phone: v.phone,
              district: v.district,
              address: v.address,
              payout: { method: v.payoutMethod, account: v.payoutAccount },
            });
            toast.success(t('common.saved'));
          }}
          className="space-y-5"
        >
          <Panel title={t('seller.profile.personal')}>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              <FormInput name="name" label={t('common.name')} required />
              <FormInput name="email" type="email" label={t('common.email')} required />
              <FormInput name="phone" label={t('common.phone')} required />
              <FormSelect
                name="district"
                label={t('auth.district')}
                showSearch
                items={DISTRICTS.map((d) => ({
                  value: d.name,
                  label: locale === 'bn' ? d.nameBn : d.name,
                }))}
              />
            </div>
          </Panel>
          <Panel title={t('seller.profile.shop')}>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              <FormInput name="shopName" label={t('auth.shopName')} required />
              <FormInput name="address" label={t('common.address')} required />
            </div>
          </Panel>
          <Panel title={t('seller.profile.payout')}>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              <FormSelect
                name="payoutMethod"
                label={t('seller.profile.payoutMethod')}
                items={(['bkash', 'nagad', 'rocket', 'bank'] as const).map((m) => ({
                  value: m,
                  label: t(`payment.${m}`),
                }))}
              />
              <FormInput name="payoutAccount" label={t('seller.profile.payoutAccount')} required />
            </div>
          </Panel>
          <Panel title={t('seller.profile.security')}>
            <Callout tone="neutral" compact description={t('seller.profile.passwordDemo')} />
          </Panel>
          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              <Icon name="check" size={16} />
              {t('common.saveChanges')}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
