'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { useCurrentSeller, usePlatformStore } from '@/stores/platform-store';
import { Panel } from '@components/dashboard/panel';
import { Form, FormInput, FormSelect, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { StatusPill } from '@components/platform/status-pill';
import { TelegramCard } from '@components/platform/telegram-card';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { toast } from '@lib/toast';
import { ticketSchema } from '@lib/validators/reseller';

type Values = { subject: string; message: string; priority: 'low' | 'normal' | 'high' };

export default function SellerSupportPage() {
  const { t, relative } = useI18n();
  const seller = useCurrentSeller();
  const tickets = usePlatformStore((s) => s.tickets).filter((x) => x.sellerId === seller?.id);
  const createTicket = usePlatformStore((s) => s.createTicket);
  const schema = React.useMemo(() => ticketSchema(t), [t]);
  const form = Form.useForm<Values>({
    schema,
    defaultValues: { subject: '', message: '', priority: 'normal' },
  });

  return (
    <div className="space-y-5">
      <PageHeader title={t('seller.support.title')} description={t('seller.support.subtitle')} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TelegramCard kind="support" variant="hero" />
        <TelegramCard kind="group" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title={t('seller.support.newTicket')}>
          <Form<Values>
            form={form}
            onFinish={(v) => {
              if (!seller) return;
              createTicket({ sellerId: seller.id, ...v });
              toast.success(t('seller.support.submitted'));
              form.reset();
            }}
            className="flex flex-col gap-y-5"
          >
            <FormInput name="subject" label={t('seller.support.subject')} required />
            <FormSelect
              name="priority"
              label={t('seller.support.priority')}
              items={(['low', 'normal', 'high'] as const).map((p) => ({
                value: p,
                label: t(`status.priority.${p}`),
              }))}
            />
            <FormTextarea name="message" label={t('seller.support.message')} rows={5} required />
            <Button type="submit" variant="primary" className="self-start">
              <Icon name="mail" size={16} />
              {t('seller.support.submit')}
            </Button>
          </Form>
          <p className="text-subtle mt-4 flex items-center gap-1.5 text-xs">
            <Icon name="clock" size={14} />
            {t('seller.support.hours')}
          </p>
        </Panel>
        <div className="space-y-5">
          <Panel title={t('seller.support.myTickets')}>
            {tickets.length === 0 ? (
              <p className="text-muted py-6 text-center text-sm">{t('seller.support.noTickets')}</p>
            ) : (
              <ul className="space-y-2.5">
                {tickets.map((x) => (
                  <li key={x.id} className="border-line rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-ink text-[13px] font-semibold">{x.subject}</p>
                      <StatusPill kind="ticket" value={x.status} />
                    </div>
                    <p className="text-muted mt-1 line-clamp-2 text-xs">{x.message}</p>
                    <p className="text-subtle mt-2 text-[11px]">
                      {x.id} · {relative(x.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={t('seller.support.quickHelp')}>
            <div className="space-y-2">
              {([1, 3, 4, 5] as const).map((n) => (
                <details key={n} className="group border-line rounded-xl border px-4">
                  <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-[13px] font-semibold [&::-webkit-details-marker]:hidden">
                    {t(`site.faq.q${n}`)}
                    <Icon
                      name="chevDown"
                      size={15}
                      className="text-muted shrink-0 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="text-muted pb-3 text-[13px]">{t(`site.faq.a${n}`)}</p>
                </details>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
