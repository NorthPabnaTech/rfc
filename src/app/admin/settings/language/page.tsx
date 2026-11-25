'use client';

import { useI18n } from '@/i18n/provider';
import { LanguageSettings } from '@components/platform/preference-pages';
import { PageHeader } from '@components/shared';

export default function AdminLanguagePage() {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.settings.languageTitle')}
        description={t('admin.settings.languageSubtitle')}
      />
      <LanguageSettings />
    </div>
  );
}
