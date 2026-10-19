'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { cancelOrderAction } from '@/actions/account';
import { ConfirmDialog } from '@components/shared';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Cancel order
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title="Cancel this order?"
        description="This can’t be undone. You can always place a new order later."
        confirmLabel="Yes, cancel order"
        cancelLabel="Keep order"
        loading={busy}
        autoClose={false}
        onConfirm={async () => {
          setBusy(true);
          const res = await cancelOrderAction({ orderId });
          setBusy(false);
          setOpen(false);
          if (handleActionResult(res)) router.refresh();
        }}
      />
    </>
  );
}
