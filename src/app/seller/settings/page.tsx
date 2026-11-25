'use client';

import { useI18n } from '@/i18n/provider';
import { DemoDataPanel } from '@components/platform/demo-data-panel';
import { LanguageSettings, ThemeSettings } from '@components/platform/preference-pages';
import { PageHeader } from '@components/shared';

export default function SellerSettingsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <PageHeader
        title={t('common.settings')}
        description={`${t('common.language')} · ${t('common.theme')}`}
      />
      <LanguageSettings />
      <ThemeSettings />
      <DemoDataPanel />
    </div>
  );
}
