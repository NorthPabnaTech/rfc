'use client';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { InvoiceActions, InvoiceSheet } from '@components/platform/invoice';
import { NotFoundState } from '@components/platform/not-found-state';
import { PageHeader } from '@components/shared';

import { useSellerRecords } from '../../components/use-seller-data';

export function SellerInvoice({ id }: { id: string }) {
  const { t } = useI18n();
  const { seller, orders } = useSellerRecords();
  const platformName = usePlatformStore((s) => s.settings.platformName);
  const order = orders.find((o) => o.id === id);
  if (!order)
    return <NotFoundState title={t('seller.orders.notFound')} backHref="/seller/invoices" />;
  return (
    <div className="space-y-5">
      <PageHeader
        title={`${t('invoice.title')} ${order.invoiceNo}`}
        description={order.id}
        backHref="/seller/invoices"
        backLabel={t('seller.invoices.title')}
        className="no-print"
        actions={<InvoiceActions order={order} seller={seller} platformName={platformName} />}
      />
      <InvoiceSheet order={order} seller={seller} platformName={platformName} />
    </div>
  );
}
