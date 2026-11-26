'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { syncAllSuppliersAction } from '@/actions/admin';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';

export function SyncStockButton() {
  const router = useRouter();
  const [syncing, setSyncing] = React.useState(false);

  const handleSync = async () => {
    setSyncing(true);
    const res = await syncAllSuppliersAction();
    setSyncing(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const { updated, totalFetched, errors } = res.data;
    if (errors.length > 0) {
      toast.warning(`Synced ${updated} product(s), but some suppliers had errors: ${errors[0]}`);
    } else {
      toast.success(`Synced ${updated} linked product(s) from ${totalFetched} supplier item(s)`);
    }
    router.refresh();
  };

  return (
    <Button type="button" variant="secondary" onClick={handleSync} disabled={syncing}>
      <Icon name="refresh" size={15} className={syncing ? 'animate-spin' : undefined} />
      {syncing ? 'Syncing…' : 'Sync Supplier Stock'}
    </Button>
  );
}
