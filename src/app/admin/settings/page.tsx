import type { Metadata } from 'next';

import { getSettings } from '@/services/settings';
import { PageHeader } from '@components/shared';

import { SettingsForm } from './components/settings-form';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader
        title="Store settings"
        description="Contact details, delivery fees and homepage content."
      />
      <SettingsForm settings={settings} />
    </>
  );
}
