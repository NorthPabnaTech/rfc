'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';

import { Icon } from '@components/icon/icon';
import { Spinner } from '@components/shared';
import { Button } from '@components/ui/button';
import { toast } from '@lib/toast';

type Props = {
  orderId: string;
  orderNumber: string;
  paymentToken: string;
  paymentStatus: string;
  invoiceId?: string;
  cancelled?: boolean;
  gatewayError?: boolean;
};

export function PaymentlyVerifier({
  orderId,
  orderNumber,
  paymentToken,
  paymentStatus,
  invoiceId,
  cancelled,
  gatewayError,
}: Props) {
  const router = useRouter();
  const [verifying, setVerifying] = React.useState(Boolean(invoiceId && paymentStatus !== 'paid'));
  const [verifyMessage, setVerifyMessage] = React.useState<string | null>(null);
  const [retrying, setRetrying] = React.useState(false);

  React.useEffect(() => {
    if (!invoiceId || paymentStatus === 'paid') return;
    let active = true;

    fetch('/api/payments/paymently/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, orderNumber }),
    })
      .then(async (res) => {
        const json = (await res.json()) as {
          ok?: boolean;
          verified?: boolean;
          status?: string;
          message?: string;
          error?: string;
        };
        if (!active) return;
        if (res.ok && json.ok && json.verified) {
          router.refresh();
          return;
        }
        setVerifyMessage(json.message || json.error || 'Payment could not be verified yet.');
      })
      .catch(() => {
        if (active) setVerifyMessage('Unable to verify payment right now. Please refresh.');
      })
      .finally(() => {
        if (active) setVerifying(false);
      });

    return () => {
      active = false;
    };
  }, [invoiceId, orderNumber, paymentStatus, router]);

  if (paymentStatus === 'paid') return null;

  const handleRetryPayment = async () => {
    setRetrying(true);
    try {
      const res = await fetch('/api/payments/paymently/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentToken }),
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
      setRetrying(false);
    }
  };

  return (
    <div className="border-line bg-cream/70 mt-6 rounded-2xl border p-4 text-center">
      {verifying ? (
        <div className="text-ink flex items-center justify-center gap-2 text-sm font-medium">
          <Spinner size="sm" />
          <span>Verifying your payment…</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Icon
              name={cancelled ? 'cancelCircle' : verifyMessage || gatewayError ? 'alert' : 'card'}
              size={18}
              className={
                cancelled
                  ? 'text-[var(--status-warn-fg)]'
                  : verifyMessage || gatewayError
                    ? 'text-[var(--status-danger-fg)]'
                    : 'text-ink'
              }
            />
            <p className="text-ink text-sm font-medium">
              {verifyMessage
                ? verifyMessage
                : cancelled
                  ? 'Your online payment was cancelled. You can complete payment below.'
                  : gatewayError
                    ? 'Payment failed to initialize. You can retry payment below.'
                    : 'Your order is awaiting online payment.'}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={retrying}
            onClick={handleRetryPayment}
          >
            {retrying ? (
              <>
                <Spinner size="sm" /> Redirecting to payment…
              </>
            ) : (
              <>
                <Icon name="card" size={16} /> Pay Now
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
