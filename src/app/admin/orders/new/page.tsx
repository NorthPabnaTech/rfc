import type { Metadata } from 'next';

import { getSettings } from '@/services/settings';
import { PageHeader } from '@components/shared';

import { ManualOrderForm } from './components/manual-order-form';

export const metadata: Metadata = { title: 'Create order' };

export default async function NewOrderPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader
        title="Create manual order"
        description="For orders received on Facebook, Messenger, Instagram, TikTok, WhatsApp or by phone."
        backHref="/admin/orders"
        backLabel="Orders"
      />
      <ManualOrderForm
        fees={{
          inside_dhaka: settings.shippingFeeInsideDhaka,
          outside_dhaka: settings.shippingFeeOutsideDhaka,
        }}
      />
    </>
  );
}
