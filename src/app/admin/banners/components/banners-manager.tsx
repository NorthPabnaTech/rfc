'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { deleteBannerAction, saveBannerAction, setBannerActiveAction } from '@/actions/admin';
import { ProductImage } from '@/features/products/product-image';
import { ImageUploader } from '@/features/uploads/image-uploader';
import type { BannerDTO, ImageDTO } from '@/types';
import { Form, FormInput, FormItem, FormSelect, FormSwitch, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, EmptyState, StatusBadge } from '@components/shared';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Switch } from '@components/ui/switch';
import { useModal } from '@hooks/use-modal';
import { handleActionResult } from '@lib/action-client';
import {
  BANNER_POSITION_HINTS,
  BANNER_POSITION_LABELS,
  BANNER_POSITIONS,
  type BannerPosition,
} from '@lib/constants';
import { formatStoreDate } from '@lib/utils';
import { type BannerInput, bannerSchema } from '@lib/validators/banner';

function scheduleState(b: BannerDTO): 'scheduled' | 'expired' | null {
  const now = Date.now();
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return 'scheduled';
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return 'expired';
  return null;
}

export function BannersManager({ banners }: { banners: BannerDTO[] }) {
  const router = useRouter();
  const modal = useModal<{ banner?: BannerDTO; position?: BannerPosition }>();
  const [deleting, setDeleting] = React.useState<BannerDTO | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => modal.openModal('create', {})}>
          <Icon name="plus" size={15} /> New banner
        </Button>
      </div>

      <div className="space-y-6">
        {BANNER_POSITIONS.map((position) => {
          const list = banners.filter((b) => b.position === position);
          return (
            <section key={position} className="bg-panel hairline rounded-xl2 p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-ink text-[15px] font-semibold">
                    {BANNER_POSITION_LABELS[position]}
                  </h2>
                  <p className="text-subtle mt-0.5 text-[12.5px]">
                    {BANNER_POSITION_HINTS[position]}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => modal.openModal('create', { position })}
                >
                  <Icon name="plus" size={13} /> Add
                </Button>
              </div>
              {list.length === 0 ? (
                <EmptyState
                  compact
                  title="No banners here yet"
                  description="The store shows a default design until you add one."
                />
              ) : (
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((b) => {
                    const sched = scheduleState(b);
                    return (
                      <li
                        key={b.id}
                        className="border-line overflow-hidden rounded-xl border bg-white"
                      >
                        <div className="bg-well relative aspect-[5/2]">
                          <ProductImage src={b.image.url} alt="" fill sizes="400px" />
                          {!b.isActive && <span className="absolute inset-0 bg-white/60" />}
                        </div>
                        <div className="p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-ink truncate text-[13.5px] font-semibold">
                                {b.title}
                              </p>
                              <p className="text-subtle truncate text-[12px]">
                                {b.link ?? 'No link'} · order {b.sortOrder}
                              </p>
                            </div>
                            <Switch
                              checked={b.isActive}
                              aria-label={b.isActive ? 'Disable banner' : 'Enable banner'}
                              onCheckedChange={async (v) => {
                                const res = await setBannerActiveAction(b.id, v);
                                if (handleActionResult(res)) router.refresh();
                              }}
                            />
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <StatusBadge
                              status={!b.isActive ? 'neutral' : sched ? 'warn' : 'ok'}
                              label={
                                !b.isActive
                                  ? 'Disabled'
                                  : sched === 'scheduled'
                                    ? 'Scheduled'
                                    : sched === 'expired'
                                      ? 'Ended'
                                      : 'Live'
                              }
                            />
                            {(b.startsAt || b.endsAt) && (
                              <span className="text-subtle text-[11.5px]">
                                {b.startsAt ? formatStoreDate(b.startsAt, 'DD MMM') : '…'} –{' '}
                                {b.endsAt ? formatStoreDate(b.endsAt, 'DD MMM') : '…'}
                              </span>
                            )}
                            <span className="ml-auto flex gap-1">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Edit ${b.title}`}
                                onClick={() => modal.openModal('update', { banner: b })}
                              >
                                <Icon name="pencil" size={15} />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Delete ${b.title}`}
                                onClick={() => setDeleting(b)}
                              >
                                <Icon name="trash" size={15} />
                              </Button>
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <BannerDialog
        key={`${modal.type}-${modal.data?.banner?.id ?? modal.data?.position ?? 'new'}`}
        open={modal.isOpen()}
        banner={modal.data?.banner}
        position={modal.data?.position}
        onOpenChange={(o) => !o && modal.closeModal()}
        onSaved={() => {
          modal.closeModal();
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title={`Delete “${deleting?.title}”?`}
        description="Consider disabling it instead if you want to reuse it later."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteBannerAction(deleting.id);
          if (handleActionResult(res)) router.refresh();
        }}
      />
    </>
  );
}

const dateValue = (iso?: string) => (iso ? iso.slice(0, 10) : '');

function BannerDialog({
  open,
  banner,
  position,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  banner?: BannerDTO;
  position?: BannerPosition;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const form = Form.useForm<BannerInput>({
    schema: bannerSchema,
    defaultValues: {
      title: banner?.title ?? '',
      description: banner?.description ?? '',
      eyebrow: banner?.eyebrow ?? '',
      image: banner?.image ?? null,
      ctaLabel: banner?.ctaLabel ?? '',
      link: banner?.link ?? '',
      position: banner?.position ?? position ?? 'hero',
      isActive: banner?.isActive ?? true,
      sortOrder: banner?.sortOrder ?? 0,
      startsAt: dateValue(banner?.startsAt),
      endsAt: dateValue(banner?.endsAt),
    },
  });
  const { isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <Form
          form={form}
          className="gap-0"
          onFinish={async (values) => {
            const res = await saveBannerAction(values, banner?.id);
            if (handleActionResult(res, form)) onSaved();
          }}
        >
          <DialogHeader>
            <DialogTitle>{banner ? 'Edit banner' : 'New banner'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <FormSelect
              name="position"
              label="Display position"
              required
              className="sm:col-span-2"
              items={BANNER_POSITIONS.map((p) => ({ value: p, label: BANNER_POSITION_LABELS[p] }))}
            />
            <FormItem name="image" label="Banner image" required className="sm:col-span-2">
              {(field) => (
                <ImageUploader
                  purpose="banners"
                  max={1}
                  allowUrl
                  value={field.value ? [field.value as ImageDTO] : []}
                  onChange={(imgs) => field.onChange(imgs[0] ?? null)}
                />
              )}
            </FormItem>
            <FormInput name="title" label="Title" required placeholder="Eid Mega Sale" />
            <FormInput name="eyebrow" label="Badge text" placeholder="Up to 40% off" />
            <FormTextarea
              name="description"
              label="Description"
              rows={2}
              className="sm:col-span-2"
              placeholder="Short supporting line"
            />
            <FormInput name="ctaLabel" label="Button text" placeholder="Shop now" />
            <FormInput
              name="link"
              label="Button link"
              placeholder="/products?onSale=1"
              hint="A store path or a full https:// link"
            />
            <FormInput name="startsAt" label="Start date (optional)" type="date" />
            <FormInput name="endsAt" label="End date (optional)" type="date" />
            <FormInput
              name="sortOrder"
              label="Display order"
              type="number"
              hint="Lower shows first"
            />
            <div className="flex items-end pb-2">
              <FormSwitch name="isActive" label="Enabled" className="w-full" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save banner'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
