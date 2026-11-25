import * as React from 'react';
import type { Metadata } from 'next';

import { PlaceOrder } from './place-order';

export const metadata: Metadata = { title: 'Place order' };

export default function PlaceOrderPage() {
  return (
    <React.Suspense>
      <PlaceOrder />
    </React.Suspense>
  );
}
