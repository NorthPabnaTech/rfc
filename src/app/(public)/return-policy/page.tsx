import type { Metadata } from 'next';

import { getSettings } from '@/services/settings';
import { RETURN_WINDOW_HOURS } from '@lib/constants';

export const metadata: Metadata = { title: 'Return & cancellation policy' };

export default async function ReturnPolicyPage() {
  const settings = await getSettings();
  const days = RETURN_WINDOW_HOURS / 24;
  return (
    <article className="container-page max-w-3xl py-14">
      <h1 className="type-display text-ink">Return & cancellation policy</h1>
      <div className="prose-store mt-8">
        <h2>Cancelling an order</h2>
        <p>
          You can cancel your order yourself from <strong>My orders</strong> while it is still{' '}
          <em>Pending</em>. Once our team has confirmed the order it is sent for processing and can
          no longer be cancelled online — please call us at {settings.supportPhone} if you need
          help.
        </p>
        <h2>Returns</h2>
        <p>
          If something is wrong with your order, you can request a return within{' '}
          <strong>{days} days</strong> of delivery from the order’s page in your account. Tell us
          the reason and, if possible, add photos of the product.
        </p>
        <ul>
          <li>The product should be unused and in its original packaging.</li>
          <li>Our team reviews every request and will contact you to arrange the pickup.</li>
          <li>Approved returns are refunded once the product is received back.</li>
        </ul>
        <h2>Need help?</h2>
        <p>Call {settings.supportPhone}</p>
      </div>
    </article>
  );
}
