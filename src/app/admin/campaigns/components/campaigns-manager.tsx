'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';

import { deleteCampaignAction, saveCampaignAction, toggleCampaignAction } from '@/actions/campaigns';
import type { CampaignDTO, CampaignProductRef } from '@/types';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, EmptyState } from '@components/shared';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { DatePicker } from '@components/ui/date-picker';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Input } from '@components/ui/input';
import { Switch } from '@components/ui/switch';
import { Textarea } from '@components/ui/textarea';
import { TimePicker } from '@components/ui/time-picker';
import { handleActionResult } from '@lib/action-client';
import type { CampaignScope, CampaignType, DiscountType } from '@lib/constants';
import { cn, formatNumber, formatStoreDate } from '@lib/utils';

type FormState = {
  title: string;
  description: string;
  type: CampaignType;
  couponCode: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderAmount: string;
  scope: CampaignScope;
  productIds: string[];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  showModal: boolean;
};

function toLocalInputValue(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDates(): { startsAt: string; endsAt: string } {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    startsAt: toLocalInputValue(now.toISOString()),
    endsAt: toLocalInputValue(end.toISOString()),
  };
}

function emptyForm(): FormState {
  const { startsAt, endsAt } = defaultDates();
  return {
    title: '',
    description: '',
    type: 'offer',
    couponCode: '',
    discountType: 'percentage',
    discountValue: '10',
    minOrderAmount: '0',
    scope: 'all',
    productIds: [],
    startsAt,
    endsAt,
    isActive: true,
    showModal: true,
  };
}

function fromCampaign(c: CampaignDTO): FormState {
  return {
    title: c.title,
    description: c.description ?? '',
    type: c.type,
    couponCode: c.couponCode ?? '',
    discountType: c.discountType,
    discountValue: String(c.discountValue),
    minOrderAmount: String(c.minOrderAmount ?? 0),
    scope: c.scope,
    productIds: c.productIds,
    startsAt: toLocalInputValue(c.startsAt),
    endsAt: toLocalInputValue(c.endsAt),
    isActive: c.isActive,
    showModal: c.showModal,
  };
}

function getStatus(c: CampaignDTO): { label: string; tone: 'ok' | 'info' | 'neutral' | 'danger' } {
  if (!c.isActive) return { label: 'Paused', tone: 'neutral' };
  const now = Date.now();
  const start = new Date(c.startsAt).getTime();
  const end = new Date(c.endsAt).getTime();
  if (now < start) return { label: 'Scheduled', tone: 'info' };
  if (now > end) return { label: 'Expired', tone: 'danger' };
  return { label: 'Live', tone: 'ok' };
}

export function CampaignsManager({
  campaigns,
  products,
}: {
  campaigns: CampaignDTO[];
  products: CampaignProductRef[];
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<{ id?: string; form: FormState } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<CampaignDTO | null>(null);
  const [productQuery, setProductQuery] = React.useState('');

  const filteredProducts = React.useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productQuery]);

  const openNew = () => {
    setProductQuery('');
    setEditing({ form: emptyForm() });
  };

  const openEdit = (c: CampaignDTO) => {
    setProductQuery('');
    setEditing({ id: c.id, form: fromCampaign(c) });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const f = editing.form;
      const res = await saveCampaignAction(
        {
          title: f.title,
          description: f.description,
          type: f.type,
          couponCode: f.type === 'coupon' ? f.couponCode : '',
          discountType: f.discountType,
          discountValue: Number(f.discountValue),
          minOrderAmount: Number(f.minOrderAmount || 0),
          scope: f.scope,
          productIds: f.scope === 'products' ? f.productIds : [],
          startsAt: new Date(f.startsAt).toISOString(),
          endsAt: new Date(f.endsAt).toISOString(),
          isActive: f.isActive,
          showModal: f.showModal,
        },
        editing.id,
      );
      if (handleActionResult(res)) {
        setEditing(null);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (id: string) => {
    if (!editing) return;
    const exists = editing.form.productIds.includes(id);
    setEditing({
      ...editing,
      form: {
        ...editing.form,
        productIds: exists
          ? editing.form.productIds.filter((p) => p !== id)
          : [...editing.form.productIds, id],
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={openNew}>
          <Icon name="plus" size={16} /> New campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No campaigns yet"
            description="Create an offer or coupon campaign to run timed discounts on your store."
            action={
              <Button type="button" variant="primary" onClick={openNew}>
                <Icon name="plus" size={16} /> Create first campaign
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => {
            const status = getStatus(c);
            const discountText =
              c.discountType === 'percentage'
                ? `${c.discountValue}% OFF`
                : `৳${formatNumber(c.discountValue)} OFF`;

            return (
              <div key={c.id} className="panel p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-ink text-base font-semibold">{c.title}</h3>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <Badge tone="brand">{discountText}</Badge>
                      {c.type === 'coupon' && c.couponCode ? (
                        <Badge tone="neutral">Coupon: {c.couponCode}</Badge>
                      ) : (
                        <Badge tone="info">Auto offer</Badge>
                      )}
                      {c.showModal && <Badge tone="neutral">1st-visit modal</Badge>}
                    </div>
                    {c.description && <p className="text-muted text-sm">{c.description}</p>}
                    <div className="text-subtle flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span>
                        Window: {formatStoreDate(c.startsAt)} → {formatStoreDate(c.endsAt)}
                      </span>
                      <span>
                        Target:{' '}
                        {c.scope === 'all'
                          ? 'All products'
                          : `${c.productIds.length} product${c.productIds.length === 1 ? '' : 's'}`}
                      </span>
                      {c.minOrderAmount > 0 && (
                        <span>Min order: ৳{formatNumber(c.minOrderAmount)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={c.isActive}
                      aria-label={`Toggle ${c.title}`}
                      onCheckedChange={async (checked) => {
                        const res = await toggleCampaignAction(c.id, checked);
                        if (handleActionResult(res)) router.refresh();
                      }}
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(c)}>
                      <Icon name="pencil" size={14} /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${c.title}`}
                      onClick={() => setDeleting(c)}
                    >
                      <Icon name="trash" size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && !saving && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit campaign' : 'New campaign'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleSave}>
              <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-ink text-xs font-semibold">Campaign title *</label>
                  <Input
                    required
                    value={editing.form.title}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, title: e.target.value } })
                    }
                    placeholder="e.g. Eid Mega Flash Sale"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-ink text-xs font-semibold">Description (optional)</label>
                  <Textarea
                    rows={2}
                    value={editing.form.description}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, description: e.target.value },
                      })
                    }
                    placeholder="Short promo message shown on the offer banner and popup modal"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-ink text-xs font-semibold">Campaign type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['offer', 'coupon'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            setEditing({ ...editing, form: { ...editing.form, type: t } })
                          }
                          className={cn(
                            'rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition',
                            editing.form.type === t
                              ? 'border-brand bg-brand-soft text-brand-ink'
                              : 'border-line bg-white text-muted hover:text-ink',
                          )}
                        >
                          {t === 'offer' ? 'Auto Offer' : 'Coupon Code'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {editing.form.type === 'coupon' && (
                    <div className="space-y-1.5">
                      <label className="text-ink text-xs font-semibold">Coupon code *</label>
                      <Input
                        required
                        value={editing.form.couponCode}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            form: {
                              ...editing.form,
                              couponCode: e.target.value.toUpperCase().replace(/\s+/g, ''),
                            },
                          })
                        }
                        placeholder="e.g. EID20"
                        className="uppercase"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-ink text-xs font-semibold">Discount type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['percentage', 'fixed'] as const).map((dt) => (
                        <button
                          key={dt}
                          type="button"
                          onClick={() =>
                            setEditing({ ...editing, form: { ...editing.form, discountType: dt } })
                          }
                          className={cn(
                            'rounded-xl border px-2.5 py-2 text-xs font-semibold transition',
                            editing.form.discountType === dt
                              ? 'border-brand bg-brand-soft text-brand-ink'
                              : 'border-line bg-white text-muted hover:text-ink',
                          )}
                        >
                          {dt === 'percentage' ? '% Percent' : '৳ Fixed'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-ink text-xs font-semibold">
                      {editing.form.discountType === 'percentage' ? 'Discount (%)' : 'Amount (৳)'} *
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={editing.form.discountType === 'percentage' ? 100 : undefined}
                      required
                      value={editing.form.discountValue}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          form: { ...editing.form, discountValue: e.target.value },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-ink text-xs font-semibold">Min order (৳)</label>
                    <Input
                      type="number"
                      min={0}
                      value={editing.form.minOrderAmount}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          form: { ...editing.form, minOrderAmount: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-ink text-xs font-semibold">Starts at *</label>
                    <div className="grid grid-cols-[minmax(0,1fr)_124px] gap-2">
                      <DatePicker
                        size="md"
                        value={editing.form.startsAt.split('T')[0] ?? ''}
                        labelFormat="MMM D, YYYY"
                        onChange={(date) => {
                          if (!date) return;
                          const time = editing.form.startsAt.split('T')[1] ?? '00:00';
                          setEditing({
                            ...editing,
                            form: { ...editing.form, startsAt: `${date}T${time}` },
                          });
                        }}
                      />
                      <TimePicker
                        size="md"
                        value={editing.form.startsAt.split('T')[1] ?? '00:00'}
                        labelFormat="h:mm A"
                        onChange={(time) => {
                          const date =
                            editing.form.startsAt.split('T')[0] ??
                            toLocalInputValue().split('T')[0];
                          setEditing({
                            ...editing,
                            form: { ...editing.form, startsAt: `${date}T${time}` },
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-ink text-xs font-semibold">Ends at *</label>
                    <div className="grid grid-cols-[minmax(0,1fr)_124px] gap-2">
                      <DatePicker
                        size="md"
                        value={editing.form.endsAt.split('T')[0] ?? ''}
                        labelFormat="MMM D, YYYY"
                        onChange={(date) => {
                          if (!date) return;
                          const time = editing.form.endsAt.split('T')[1] ?? '23:59';
                          setEditing({
                            ...editing,
                            form: { ...editing.form, endsAt: `${date}T${time}` },
                          });
                        }}
                      />
                      <TimePicker
                        size="md"
                        value={editing.form.endsAt.split('T')[1] ?? '23:59'}
                        labelFormat="h:mm A"
                        onChange={(time) => {
                          const date =
                            editing.form.endsAt.split('T')[0] ??
                            toLocalInputValue().split('T')[0];
                          setEditing({
                            ...editing,
                            form: { ...editing.form, endsAt: `${date}T${time}` },
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-ink text-xs font-semibold">Target products</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ['all', 'All products'],
                        ['products', 'Single / multiple products'],
                      ] as const
                    ).map(([sc, label]) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() =>
                          setEditing({ ...editing, form: { ...editing.form, scope: sc } })
                        }
                        className={cn(
                          'rounded-xl border px-3 py-2 text-xs font-semibold transition',
                          editing.form.scope === sc
                            ? 'border-brand bg-brand-soft text-brand-ink'
                            : 'border-line bg-white text-muted hover:text-ink',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {editing.form.scope === 'products' && (
                    <div className="border-line space-y-2 rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          value={productQuery}
                          onChange={(e) => setProductQuery(e.target.value)}
                          placeholder="Search products…"
                          className="h-8 text-xs"
                        />
                        <span className="text-muted shrink-0 text-xs">
                          {editing.form.productIds.length} selected
                        </span>
                      </div>
                      <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                        {filteredProducts.map((p) => {
                          const checked = editing.form.productIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={cn(
                                'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition',
                                checked ? 'bg-brand-soft text-brand-ink font-medium' : 'hover:bg-well',
                              )}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleProduct(p.id)}
                                  className="accent-brand"
                                />
                                <span className="truncate">{p.name}</span>
                              </span>
                              <span className="text-muted shrink-0">
                                ৳{formatNumber(p.salePrice ?? p.price)}
                              </span>
                            </label>
                          );
                        })}
                        {filteredProducts.length === 0 && (
                          <p className="text-muted py-3 text-center text-xs">No products found.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-line flex flex-wrap items-center justify-between gap-4 border-t pt-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                    <Switch
                      checked={editing.form.isActive}
                      onCheckedChange={(v) =>
                        setEditing({ ...editing, form: { ...editing.form, isActive: v } })
                      }
                    />
                    <span>Campaign active</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                    <Switch
                      checked={editing.form.showModal}
                      onCheckedChange={(v) =>
                        setEditing({ ...editing, form: { ...editing.form, showModal: v } })
                      }
                    />
                    <span>Show popup modal on 1st visit</span>
                  </label>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving…' : editing.id ? 'Update campaign' : 'Create campaign'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title="Delete campaign?"
        description={`"${deleting?.title}" will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteCampaignAction(deleting.id);
          if (handleActionResult(res)) {
            setDeleting(null);
            router.refresh();
          }
        }}
      />
    </div>
  );
}
