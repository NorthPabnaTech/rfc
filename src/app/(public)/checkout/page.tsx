import type { Metadata } from 'next';

import { getSettings } from '@/services/settings';
import { listAddresses } from '@/services/users';
import { getCurrentUser } from '@lib/auth/current-user';

import { CheckoutForm } from './components/checkout-form';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const [settings, addresses] = await Promise.all([
    getSettings(),
    user ? listAddresses(user.id) : [],
  ]);

  return (
    <div className="container-page py-10">
      <h1 className="type-display text-ink">Checkout</h1>
      <p className="text-muted mt-1.5 text-sm">
        Cash on Delivery · You pay when your order arrives.
      </p>
      <CheckoutForm
        className="mt-8"
        user={user && { name: user.name, email: user.email, phone: user.phone }}
        addresses={addresses}
        fees={{
          inside_dhaka: settings.shippingFeeInsideDhaka,
          outside_dhaka: settings.shippingFeeOutsideDhaka,
        }}
      />
    </div>
  );
}
