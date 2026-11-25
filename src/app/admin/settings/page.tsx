'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { PlatformMark } from '@components/common/platform-logo';
import { Panel } from '@components/dashboard/panel';
import { Form, FormCurrency, FormInput, FormNumber, FormSelect } from '@components/form';
import { Icon } from '@components/icon/icon';
import { DemoDataPanel } from '@components/platform/demo-data-panel';
import { Callout, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Tabs } from '@components/ui/tabs';
import { withdrawalFee } from '@lib/business/wallet';
import { toast } from '@lib/toast';
import {
  businessSettingsSchema,
  generalSettingsSchema,
  telegramLink,
} from '@lib/validators/reseller';

export default function GeneralSettingsPage() {
  const { t } = useI18n();
  const [tab, setTab] = React.useState('general');
  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.settings.generalTitle')}
        description={t('admin.settings.generalSubtitle')}
      />
      <Tabs
        variant="line"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'general', label: t('admin.settings.general'), icon: 'settings' },
          { value: 'business', label: t('admin.settings.business'), icon: 'calculator' },
          { value: 'telegram', label: t('admin.settings.telegram'), icon: 'telegram' },
        ]}
      />
      {tab === 'general' && <GeneralTab />}
      {tab === 'business' && <BusinessTab />}
      {tab === 'telegram' && <TelegramTab />}
      <DemoDataPanel />
    </div>
  );
}

function GeneralTab() {
  const { t } = useI18n();
  const settings = usePlatformStore((s) => s.settings);
  const update = usePlatformStore((s) => s.updateSettings);
  const schema = React.useMemo(() => generalSettingsSchema(t), [t]);
  return (
    <Panel>
      <Form
        schema={schema}
        initialValues={{
          platformName: settings.platformName,
          contactEmail: settings.contactEmail,
          supportPhone: settings.supportPhone,
          currency: settings.currency,
          timezone: settings.timezone,
        }}
        onFinish={(v: {
          platformName: string;
          contactEmail: string;
          supportPhone: string;
          currency: string;
          timezone: string;
        }) => {
          update(v);
          toast.success(t('common.saved'));
        }}
        className="grid grid-cols-1 gap-x-4 gap-y-5 pt-5 sm:grid-cols-2"
      >
        <div className="flex items-center gap-4 sm:col-span-2">
          <PlatformMark size={56} />
          <div>
            <p className="type-label text-ink">{t('admin.settings.logo')}</p>
            <p className="type-helper text-muted">{t('admin.settings.logoHint')}</p>
          </div>
        </div>
        <FormInput name="platformName" label={t('admin.settings.platformName')} required />
        <FormInput
          name="contactEmail"
          type="email"
          label={t('admin.settings.contactEmail')}
          required
        />
        <FormInput
          name="supportPhone"
          label={t('admin.settings.supportPhone')}
          placeholder="01XXXXXXXXX"
        />
        <FormSelect
          name="currency"
          label={t('admin.settings.currency')}
          items={[{ value: 'BDT', label: 'BDT — Bangladeshi Taka (৳)' }]}
        />
        <FormSelect
          name="timezone"
          label={t('admin.settings.timezone')}
          items={[{ value: 'Asia/Dhaka', label: 'Asia/Dhaka (GMT+6)' }]}
        />
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" variant="primary">
            <Icon name="check" size={16} />
            {t('common.saveChanges')}
          </Button>
        </div>
      </Form>
    </Panel>
  );
}

type BizValues = {
  defaultMargin: number;
  defaultPackagingCharge: number;
  inside: number;
  sub: number;
  outside: number;
  minAddBalance: number;
  minWithdrawal: number;
  threshold: number;
  lowFee: number;
  highFee: number;
  atThresholdFee: number;
  earningsReleaseHours: number;
};

function BusinessTab() {
  const { t, money } = useI18n();
  const s = usePlatformStore((x) => x.settings);
  const update = usePlatformStore((x) => x.updateSettings);
  const schema = React.useMemo(() => businessSettingsSchema(t), [t]);
  const fees = s.withdrawalFees;
  return (
    <Form<BizValues>
      schema={schema}
      initialValues={{
        defaultMargin: s.defaultMargin,
        defaultPackagingCharge: s.defaultPackagingCharge,
        inside: s.deliveryCharges.inside_dhaka,
        sub: s.deliveryCharges.sub_dhaka,
        outside: s.deliveryCharges.outside_dhaka,
        minAddBalance: s.minAddBalance,
        minWithdrawal: s.minWithdrawal,
        threshold: fees.threshold,
        lowFee: fees.lowFee,
        highFee: fees.highFee,
        atThresholdFee: fees.atThresholdFee,
        earningsReleaseHours: s.earningsReleaseHours,
      }}
      onFinish={(v) => {
        const n = (x: unknown) => Number(x) || 0;
        update({
          defaultMargin: n(v.defaultMargin),
          defaultPackagingCharge: n(v.defaultPackagingCharge),
          deliveryCharges: {
            inside_dhaka: n(v.inside),
            sub_dhaka: n(v.sub),
            outside_dhaka: n(v.outside),
          },
          minAddBalance: n(v.minAddBalance),
          minWithdrawal: n(v.minWithdrawal),
          withdrawalFees: {
            threshold: n(v.threshold),
            lowFee: n(v.lowFee),
            highFee: n(v.highFee),
            atThresholdFee: n(v.atThresholdFee),
          },
          earningsReleaseHours: n(v.earningsReleaseHours),
        });
        toast.success(t('common.saved'));
      }}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title={t('admin.products.pricing')}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <FormCurrency name="defaultMargin" label={t('admin.settings.defaultMargin')} />
            <FormCurrency
              name="defaultPackagingCharge"
              label={t('admin.settings.defaultPackaging')}
            />
          </div>
          <p className="type-label text-ink mt-6 mb-3">{t('admin.settings.deliveryCharges')}</p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-3">
            <FormCurrency name="inside" label={t('area.inside_dhaka')} />
            <FormCurrency name="sub" label={t('area.sub_dhaka')} />
            <FormCurrency name="outside" label={t('area.outside_dhaka')} />
          </div>
        </Panel>
        <Panel title={t('nav.groups.wallet')}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <FormCurrency name="minAddBalance" label={t('admin.settings.minAdd')} />
            <FormCurrency name="minWithdrawal" label={t('admin.settings.minWithdraw')} />
            <FormNumber
              name="earningsReleaseHours"
              label={t('admin.settings.releaseHours')}
              className="sm:col-span-2"
            />
          </div>
        </Panel>
        <Panel title={t('admin.settings.feeRules')} className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            <FormCurrency name="threshold" label={t('admin.settings.threshold')} />
            <FormCurrency name="lowFee" label={t('admin.settings.lowFee')} />
            <FormCurrency name="highFee" label={t('admin.settings.highFee')} />
            <FormCurrency
              name="atThresholdFee"
              label={t('admin.settings.atFee')}
              hint={t('admin.settings.atFeeHint')}
            />
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[500, fees.threshold, 1500].map((amt) => (
              <div key={amt} className="bg-well/60 rounded-xl p-3 text-[14px]">
                <span className="text-muted">{money(amt)} → </span>
                <span className="text-ink num font-semibold">
                  {money(withdrawalFee(amt, fees))}
                </span>
                <span className="text-muted"> · {t('seller.wallet.netAmount')} </span>
                <span className="num font-semibold text-[var(--status-ok-fg)]">
                  {money(amt - withdrawalFee(amt, fees))}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" variant="primary">
          <Icon name="check" size={16} />
          {t('common.saveChanges')}
        </Button>
      </div>
    </Form>
  );
}

function TelegramTab() {
  const { t } = useI18n();
  const s = usePlatformStore((x) => x.settings);
  const update = usePlatformStore((x) => x.updateSettings);
  const [support, setSupport] = React.useState(s.telegramSupport);
  const [group, setGroup] = React.useState(s.telegramGroup);
  const [errors, setErrors] = React.useState<{ support?: string; group?: string }>({});
  const schema = React.useMemo(() => telegramLink(t), [t]);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const a = schema.safeParse(support);
    const b = schema.safeParse(group);
    setErrors({
      support: a.success ? undefined : a.error.issues[0]?.message,
      group: b.success ? undefined : b.error.issues[0]?.message,
    });
    if (!a.success || !b.success) return;
    update({ telegramSupport: a.data, telegramGroup: b.data });
    toast.success(t('common.saved'));
  };
  const field = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    error?: string,
  ) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-label text-ink">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder="https://t.me/…"
        className="h-10 text-sm"
        aria-invalid={!!error || undefined}
      />
      <p
        className={error ? 'type-helper text-[var(--status-danger-fg)]' : 'type-helper text-muted'}
      >
        {error ?? t('admin.support.linkHint')}
      </p>
    </div>
  );
  return (
    <Panel>
      <form onSubmit={save} className="grid grid-cols-1 gap-x-4 gap-y-5 pt-5 sm:grid-cols-2">
        {field('tg-support', t('nav.telegramSupport'), support, setSupport, errors.support)}
        {field('tg-group', t('nav.telegramCommunity'), group, setGroup, errors.group)}
        <Callout
          tone="neutral"
          compact
          className="sm:col-span-2"
          description="NEXT_PUBLIC_TELEGRAM_SUPPORT · NEXT_PUBLIC_TELEGRAM_GROUP"
        />
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" variant="primary">
            <Icon name="check" size={16} />
            {t('common.saveChanges')}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
