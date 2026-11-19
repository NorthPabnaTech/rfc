'use client';

import * as React from 'react';

import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';

import { CourierHistoryModal } from './courier-history-modal';

export function CheckCourierHistoryButton({ phone }: { phone: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3 w-full"
        onClick={() => setOpen(true)}
      >
        <Icon name="shield" size={14} /> Check Courier History
      </Button>
      <CourierHistoryModal open={open} onOpenChange={setOpen} fixedPhone={phone} />
    </>
  );
}

export function DashboardCourierCheckerButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Icon name="shield" size={15} /> Courier History Checker
      </Button>
      <CourierHistoryModal open={open} onOpenChange={setOpen} />
    </>
  );
}
