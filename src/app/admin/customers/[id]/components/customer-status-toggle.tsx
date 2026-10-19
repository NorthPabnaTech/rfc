'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { setCustomerActiveAction } from '@/actions/admin';
import { ConfirmDialog } from '@components/shared';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';

export function CustomerStatusToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {active ? 'Disable account' : 'Re-activate account'}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone={active ? 'danger' : 'info'}
        title={active ? 'Disable this customer?' : 'Re-activate this customer?'}
        description={
          active
            ? 'They will be signed out and unable to sign in. Their orders are kept.'
            : 'They will be able to sign in and place orders again.'
        }
        confirmLabel={active ? 'Disable' : 'Re-activate'}
        onConfirm={async () => {
          const res = await setCustomerActiveAction(id, !active);
          if (handleActionResult(res)) router.refresh();
        }}
      />
    </>
  );
}
