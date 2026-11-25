'use client';

import { useI18n } from '@/i18n/provider';
import { ThemeSettings } from '@components/platform/preference-pages';
import { PageHeader } from '@components/shared';

export default function AdminThemePage() {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.settings.themeTitle')}
        description={t('admin.settings.themeSubtitle')}
      />
      <ThemeSettings />
    </div>
  );
}
