import type { Metadata } from 'next';

import { listBusinesses } from '@/services/businesses';
import { getSettings } from '@/services/settings';
import { PageHeader } from '@components/shared';

import { ManualOrderForm } from './components/manual-order-form';

export const metadata: Metadata = { title: 'Create order' };

export default async function NewOrderPage() {
  const [settings, businesses] = await Promise.all([
    getSettings(),
    listBusinesses({ activeOnly: true }),
  ]);
  return (
    <>
      <PageHeader
        title="Create manual order"
        description="For orders received on Facebook, Instagram, TikTok, WhatsApp or by phone."
        backHref="/admin/orders"
        backLabel="Orders"
      />
      <ManualOrderForm
        businesses={businesses}
        fees={{
          inside_dhaka: settings.shippingFeeInsideDhaka,
          outside_dhaka: settings.shippingFeeOutsideDhaka,
        }}
      />
    </>
  );
}
