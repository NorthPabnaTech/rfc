import type { Metadata } from 'next';

import { getSettings } from '@/services/settings';
import { getStorageUsage } from '@/services/storage';
import { PageHeader } from '@components/shared';
import { requireAdminPage } from '@lib/auth/current-user';

import { SettingsForm } from './components/settings-form';
import { StorageUsageCard } from './components/storage-usage-card';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  await requireAdminPage();
  const [settings, storageUsage] = await Promise.all([getSettings(), getStorageUsage()]);
  return (
    <>
      <PageHeader
        title="Store settings"
        description="Contact details, delivery fees and homepage content."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <SettingsForm settings={settings} />
        <StorageUsageCard usage={storageUsage} />
      </div>
    </>
  );
}
