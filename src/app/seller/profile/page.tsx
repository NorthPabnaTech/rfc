'use client';

import * as React from 'react';
import { z } from 'zod';

import { useI18n } from '@/i18n/provider';
import { useResellerAuth } from '@/stores/reseller-auth';
import { Panel } from '@components/dashboard/panel';
import { Form, FormInput } from '@components/form';
import { Icon } from '@components/icon/icon';
import { StatusPill } from '@components/platform/status-pill';
import { UserAvatar } from '@components/platform/user-avatar';
import { PageHeader } from '@components/shared';
import { AvatarCropDialog } from '@components/shared/avatar-crop-dialog';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { ApiError, authHeaders } from '@lib/api/client';
import { resellerApi } from '@lib/api/reseller';
import { toast } from '@lib/toast';
import { BD_PHONE } from '@lib/validators/reseller';

type ProfileValues = {
  name: string;
  shopName: string;
  phone: string;
  address: string;
  bkash: string;
  nagad: string;
};

export default function SellerProfilePage() {
  const { t, date } = useI18n();
  const reseller = useResellerAuth((s) => s.reseller);
  const setReseller = useResellerAuth((s) => s.setReseller);
  const [saving, setSaving] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<ProfileValues | null>(null);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const schema = React.useMemo(() => {
    const optionalBdPhone = z
      .string()
      .trim()
      .optional()
      .default('')
      .refine((v) => v === '' || BD_PHONE.test(v), t('common.invalidPhone'));

    return z.object({
      name: z.string().trim().min(2, t('common.required')),
      shopName: z.string().trim().min(2, t('common.required')),
      phone: optionalBdPhone,
      address: z.string().trim().optional().default(''),
      bkash: optionalBdPhone,
      nagad: optionalBdPhone,
    });
  }, [t]);

  if (!reseller) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setCropSrc(URL.createObjectURL(file));
  };

  const handleCroppedUpload = async (file: File) => {
    try {
      if (reseller.avatarUrl) {
        await fetch('/api/seller/avatar/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ url: reseller.avatarUrl }),
        });
      }
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/seller/avatar/upload', {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const uploadJson = (await uploadRes.json()) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };
      if (!uploadRes.ok || !uploadJson.ok || !uploadJson.url) {
        throw new Error(uploadJson.error || 'Failed to upload image');
      }
      const updated = await resellerApi.updateMe({ avatarUrl: uploadJson.url });
      setReseller({ ...updated, avatarUrl: updated.avatarUrl || uploadJson.url });
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWrong'));
      throw err;
    }
  };

  const saveProfile = async (v: ProfileValues) => {
    setSaving(true);
    try {
      const updated = await resellerApi.updateMe({
        name: v.name.trim(),
        shopName: v.shopName.trim(),
        phone: v.phone.trim() || undefined,
        address: v.address.trim() || undefined,
        payoutDetails: {
          bkash: v.bkash.trim(),
          nagad: v.nagad.trim(),
        },
      });
      setReseller({
        ...updated,
        phone: updated.phone ?? (v.phone.trim() || null),
      });
      setPendingValues(null);
      toast.success(t('common.saved'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('common.somethingWrong'));
    } finally {
      setSaving(false);
    }
  };

  const prevBkash = (reseller.payoutDetails?.bkash ?? '').trim();
  const prevNagad = (reseller.payoutDetails?.nagad ?? '').trim();

  const onFinish = async (v: ProfileValues) => {
    const bkashChanged = v.bkash.trim() !== prevBkash;
    const nagadChanged = v.nagad.trim() !== prevNagad;
    if (bkashChanged || nagadChanged) {
      setPendingValues(v);
      return;
    }
    await saveProfile(v);
  };

  const payoutChanges = (() => {
    if (!pendingValues) return [];
    const changes: { label: string; prev: string; next: string }[] = [];
    const nextBkash = pendingValues.bkash.trim();
    const nextNagad = pendingValues.nagad.trim();
    if (nextBkash !== prevBkash) {
      changes.push({ label: t('payment.bkash'), prev: prevBkash, next: nextBkash });
    }
    if (nextNagad !== prevNagad) {
      changes.push({ label: t('payment.nagad'), prev: prevNagad, next: nextNagad });
    }
    return changes;
  })();

  return (
    <div className="space-y-5">
      <PageHeader title={t('seller.profile.title')} description={t('seller.profile.subtitle')} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Panel className="lg:self-start">
          <div className="flex flex-col items-center pt-6 text-center">
            <div className="relative">
              <UserAvatar name={reseller.name} src={reseller.avatarUrl} size={84} />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Change profile photo"
                className="bg-brand border-panel hover:bg-brand-hover focus-ring absolute right-0 bottom-0 grid size-7 place-items-center rounded-full border-2 text-white shadow-sm transition-colors"
              >
                <Icon name="upload" size={13} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-accent hover:text-accent-hover mt-2.5 text-xs font-semibold"
            >
              Change photo
            </button>
            <h2 className="type-section-title text-ink mt-3">{reseller.name}</h2>
            <p className="text-muted text-sm">{reseller.shopName}</p>
            <StatusPill
              kind="seller"
              value={reseller.isActive ? 'active' : 'inactive'}
              className="mt-3"
            />
            {reseller.createdAt && (
              <p className="text-subtle mt-3 text-xs">
                {t('seller.profile.memberSince', { date: date(reseller.createdAt) })}
              </p>
            )}
          </div>
          <dl className="divide-line mt-6 divide-y border-t text-[13px]">
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">{t('common.email')}</dt>
              <dd className="text-ink truncate font-medium">{reseller.email}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">{t('common.phone')}</dt>
              <dd className="num text-ink font-medium">{reseller.phone || '—'}</dd>
            </div>
          </dl>
        </Panel>
        <Form<ProfileValues>
          schema={schema}
          initialValues={{
            name: reseller.name,
            shopName: reseller.shopName,
            phone: reseller.phone ?? '',
            address: reseller.address ?? '',
            bkash: reseller.payoutDetails?.bkash ?? '',
            nagad: reseller.payoutDetails?.nagad ?? '',
          }}
          onFinish={onFinish}
          className="space-y-5"
        >
          <Panel title={t('seller.profile.personal')}>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              <FormInput
                name="name"
                label={t('common.name')}
                placeholder="Your full name"
                required
              />
              <FormInput
                name="shopName"
                label={t('auth.shopName')}
                placeholder="Your shop or page name"
                required
              />
              <FormInput
                name="phone"
                label={t('common.phone')}
                placeholder="017XXXXXXXX"
                inputMode="tel"
              />
              <FormInput
                name="address"
                label={t('common.address')}
                placeholder="Dhanmondi, Dhaka"
              />
            </div>
          </Panel>
          <Panel title={t('seller.profile.payout')}>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              <FormInput
                name="bkash"
                label={t('payment.bkash')}
                placeholder="017XXXXXXXX"
                inputMode="tel"
              />
              <FormInput
                name="nagad"
                label={t('payment.nagad')}
                placeholder="018XXXXXXXX"
                inputMode="tel"
              />
            </div>
          </Panel>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={saving}>
              <Icon name="check" size={16} />
              {saving ? t('common.loading') : t('common.saveChanges')}
            </Button>
          </div>
        </Form>
      </div>

      <Dialog
        open={!!pendingValues}
        onOpenChange={(o) => {
          if (!o && !saving) setPendingValues(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payout Account Change</DialogTitle>
            <DialogDescription>
              Please review your payout number changes before saving.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {payoutChanges.map((item) => (
              <div
                key={item.label}
                className="border-line bg-well/50 rounded-xl border p-3.5 text-sm"
              >
                <p className="text-ink font-semibold">{item.label}</p>
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <div>
                    <span className="text-subtle block text-[11px]">Previous</span>
                    <span className="text-muted font-mono text-xs">
                      {item.prev || 'Not set'}
                    </span>
                  </div>
                  <Icon name="chevRight" size={14} className="text-subtle" />
                  <div>
                    <span className="text-subtle block text-[11px]">New</span>
                    <span className="text-ink font-mono text-xs font-semibold">
                      {item.next || 'Removed'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingValues(null)}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => pendingValues && saveProfile(pendingValues)}
              disabled={saving}
            >
              <Icon name="check" size={16} />
              {saving ? t('common.loading') : 'Confirm & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AvatarCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        onOpenChange={(o) => !o && setCropSrc(null)}
        onConfirm={handleCroppedUpload}
      />
    </div>
  );
}
