'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { EmptyState } from '@components/shared';
import { Button } from '@components/ui/button';

/** In-dashboard "record not found" state (mock ids that do not exist). */
export function NotFoundState({ title, backHref }: { title: string; backHref: string }) {
  const { t } = useI18n();
  return (
    <EmptyState
      title={title}
      description={t('common.noResultsHint')}
      action={
        <Button variant="outline" asChild>
          <Link href={backHref}>{t('common.back')}</Link>
        </Button>
      }
    />
  );
}
