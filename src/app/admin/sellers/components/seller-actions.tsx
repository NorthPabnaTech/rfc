'use client';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { Seller, SellerStatus } from '@/types/platform';
import type { IconRegistryKey } from '@components/icon/icon';
import { ConfirmDialog } from '@components/shared';
import { toast } from '@lib/toast';

export type SellerAction = {
  status: SellerStatus;
  label: string;
  icon: IconRegistryKey;
  destructive?: boolean;
};

/** The status changes an admin can apply to a seller in its current state. */
export function useSellerActions() {
  const { t } = useI18n();
  return (s: Seller): SellerAction[] => {
    const all: SellerAction[] = [];
    if (s.status === 'pending')
      all.push({ status: 'active', label: t('admin.sellers.approve'), icon: 'userCheck' });
    else if (s.status !== 'active')
      all.push({ status: 'active', label: t('admin.sellers.activate'), icon: 'userCheck' });
    if (s.status === 'active')
      all.push({ status: 'inactive', label: t('admin.sellers.deactivate'), icon: 'userBlock' });
    if (s.status !== 'suspended')
      all.push({
        status: 'suspended',
        label: t('admin.sellers.suspend'),
        icon: 'alert',
        destructive: true,
      });
    return all;
  };
}

/** Confirmation dialog for a pending seller status change. */
export function SellerStatusConfirm({
  pending,
  onClose,
}: {
  pending: { seller: Seller; action: SellerAction } | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const setStatus = usePlatformStore((s) => s.setSellerStatus);
  return (
    <ConfirmDialog
      open={!!pending}
      onOpenChange={(o) => !o && onClose()}
      tone={pending?.action.destructive ? 'danger' : 'info'}
      destructive={pending?.action.destructive}
      icon={pending?.action.icon}
      title={pending ? t('admin.sellers.confirmTitle', { action: pending.action.label }) : ''}
      description={
        pending
          ? t('admin.sellers.confirmDesc', {
              name: pending.seller.name,
              status: t(`status.seller.${pending.action.status}`),
            })
          : ''
      }
      confirmLabel={pending?.action.label ?? t('common.confirm')}
      cancelLabel={t('common.cancel')}
      onConfirm={() => {
        if (!pending) return;
        setStatus(pending.seller.id, pending.action.status);
        toast.success(t('admin.sellers.statusChanged'));
        onClose();
      }}
    />
  );
}
