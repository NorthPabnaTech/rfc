'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog } from '@components/shared';
import { Button } from '@components/ui/button';
import { toast } from '@lib/toast';

/** Phase 1 only: restore the generated mock data. */
export function DemoDataPanel() {
  const { t } = useI18n();
  const reset = usePlatformStore((s) => s.resetDemo);
  const [open, setOpen] = React.useState(false);
  return (
    <Panel title={t('admin.settings.demoData')} description={t('admin.settings.demoDataDesc')}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Icon name="refresh" size={16} />
        {t('admin.settings.resetDemo')}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="warning"
        icon="refresh"
        title={t('admin.settings.resetDemo')}
        description={t('admin.settings.resetConfirm')}
        confirmLabel={t('common.reset')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          reset();
          toast.success(t('admin.settings.resetDone'));
          setOpen(false);
        }}
      />
    </Panel>
  );
}
