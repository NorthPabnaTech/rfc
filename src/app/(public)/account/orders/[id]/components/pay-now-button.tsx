'use client';

import * as React from 'react';

import { Icon } from '@components/icon/icon';
import { Spinner } from '@components/shared';
import { Button } from '@components/ui/button';
import { toast } from '@lib/toast';

export function PayNowButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = React.useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/paymently/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const json = (await res.json()) as { ok?: boolean; paymentUrl?: string; error?: string };
      if (res.ok && json.ok && json.paymentUrl) {
        window.location.assign(json.paymentUrl);
        return;
      }
      toast.error('Unable to start payment', { description: json.error });
    } catch {
      toast.error('Unable to reach payment gateway');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      className="mt-3 w-full"
      disabled={loading}
      onClick={handlePay}
    >
      {loading ? (
        <>
          <Spinner size="sm" /> Redirecting to payment…
        </>
      ) : (
        <>
          <Icon name="card" size={14} /> Pay Now
        </>
      )}
    </Button>
  );
}
