'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';

import { deleteCampaignAction, saveCampaignAction, toggleCampaignAction } from '@/actions/campaigns';
import type { CampaignDTO, CampaignProductRef } from '@/types';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, EmptyState, PageHeader, StatCard, StatCardGrid } from '@components/shared';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { DatePicker } from '@components/ui/date-picker';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Dropdown, type DropdownEntry } from '@components/ui/dropdown';
import { Input } from '@components/ui/input';
import { Select } from '@components/ui/select';
import { Switch } from '@components/ui/switch';
import { Textarea } from '@components/ui/textarea';
import { TimePicker } from '@components/ui/time-picker';
import { handleActionResult } from '@lib/action-client';
import type { CampaignScope, CampaignType, DiscountType } from '@lib/constants';
import { toast } from '@lib/toast';
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
  showOnHome: boolean;
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
    showOnHome: true,
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
    showOnHome: c.showOnHome ?? true,
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
  return { label: 'Active', tone: 'ok' };
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
  const [viewing, setViewing] = React.useState<CampaignDTO | null>(null);
  const [toggling, setToggling] = React.useState<CampaignDTO | null>(null);
  const [filter, setFilter] = React.useState<'all' | 'active' | 'offers' | 'coupons'>('all');
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<CampaignDTO | null>(null);
  const [productQuery, setProductQuery] = React.useState('');

  const filteredCampaigns = React.useMemo(() => {
    if (filter === 'all') return campaigns;
    return campaigns.filter((c) => {
      if (getStatus(c).label !== 'Active') return false;
      if (filter === 'offers') return c.type === 'offer';
      if (filter === 'coupons') return c.type === 'coupon';
      return true;
    });
  }, [campaigns, filter]);

  const copyCoupon = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied coupon: ${code}`);
    } catch {
      toast.error('Could not copy coupon code');
    }
  };

  const stats = React.useMemo(() => {
    let activeCount = 0;
    let runningOffers = 0;
    let runningCoupons = 0;
    for (const c of campaigns) {
      if (getStatus(c).label === 'Active') {
        activeCount++;
        if (c.type === 'offer') runningOffers++;
        else runningCoupons++;
      }
    }
    return {
      total: campaigns.length,
      activeCount,
      runningOffers,
      runningCoupons,
    };
  }, [campaigns]);

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
          discountValue:
            f.discountType === 'free_delivery' || f.discountType === 'half_delivery'
              ? 0
              : Number(f.discountValue),
          minOrderAmount: Number(f.minOrderAmount || 0),
          scope: f.scope,
          productIds: f.scope === 'products' ? f.productIds : [],
          startsAt: new Date(f.startsAt).toISOString(),
          endsAt: new Date(f.endsAt).toISOString(),
          isActive: f.isActive,
          showOnHome: f.showOnHome,
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

  const columns: Column<CampaignDTO>[] = [
    {
      key: 'title',
      header: 'Campaign',
      cell: (c) => (
        <div className="min-w-0">
          <p className="text-ink max-w-[240px] truncate font-semibold">{c.title}</p>
          {c.type === 'coupon' && c.couponCode && (
            <button
              type="button"
              onClick={() => void copyCoupon(c.couponCode!)}
              className="text-muted hover:text-ink mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] transition-colors"
              title="Copy coupon code"
            >
              <span>Code: {c.couponCode}</span>
              <Icon name="copy" size={11} />
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (c) => (
        <Badge tone={c.type === 'coupon' ? 'neutral' : 'info'}>
          {c.type === 'coupon' ? 'Coupon' : 'Offer'}
        </Badge>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      cell: (c) => (
        <div>
          <span className="text-ink font-semibold">
            {c.discountType === 'free_delivery'
              ? 'Free Delivery'
              : c.discountType === 'half_delivery'
                ? '50% Off Delivery'
                : c.discountType === 'delivery_discount'
                  ? `৳${formatNumber(c.discountValue)} Off Delivery`
                  : c.discountType === 'percentage'
                    ? `${c.discountValue}% OFF`
                    : `৳${formatNumber(c.discountValue)} OFF`}
          </span>
          {c.minOrderAmount > 0 && (
            <p className="text-subtle text-[11px]">Min ৳{formatNumber(c.minOrderAmount)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'target',
      header: 'Target',
      cell: (c) => (
        <span className="text-muted text-xs">
          {c.scope === 'all'
            ? 'All products'
            : `${c.productIds.length} product${c.productIds.length === 1 ? '' : 's'}`}
        </span>
      ),
    },
    {
      key: 'window',
      header: 'Date Range',
      cell: (c) => (
        <span className="text-muted text-xs whitespace-nowrap">
          {formatStoreDate(c.startsAt)} → {formatStoreDate(c.endsAt)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (c) => {
        const status = getStatus(c);
        return <Badge tone={status.tone}>{status.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (c) => {
        const items: DropdownEntry[] = [
          { label: 'View details', icon: 'eye', onClick: () => setViewing(c) },
          ...(c.type === 'coupon' && c.couponCode
            ? [{ label: 'Copy coupon', icon: 'copy' as const, onClick: () => void copyCoupon(c.couponCode!) }]
            : []),
          { label: 'Edit', icon: 'pencil', onClick: () => openEdit(c) },
          {
            label: c.isActive ? 'Deactivate' : 'Activate',
            icon: c.isActive ? 'cancelCircle' : 'checkCircle',
            onClick: () => setToggling(c),
          },
          { type: 'separator' },
          {
            label: 'Delete',
            icon: 'trash',
            destructive: true,
            onClick: () => setDeleting(c),
          },
        ];

        return (
          <Dropdown align="end" items={items}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${c.title}`}
            >
              <Icon name="more" size={16} />
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Campaigns & Coupons"
        description="Run timed offers or coupon codes with percentage or fixed discounts across one, multiple, or all products."
        actions={
          <Button type="button" variant="primary" onClick={openNew}>
            <Icon name="plus" size={16} /> New campaign
          </Button>
        }
      />

      <div className="space-y-6">

      <StatCardGrid>
        <StatCard
          label="Total campaigns"
          value={formatNumber(stats.total)}
          icon="layers"
          tone="neutral"
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <StatCard
          label="Active campaigns"
          value={formatNumber(stats.activeCount)}
          icon="checkCircle"
          tone="ok"
          active={filter === 'active'}
          onClick={() => setFilter('active')}
        />
        <StatCard
          label="Running offers"
          value={formatNumber(stats.runningOffers)}
          icon="discount"
          tone="info"
          active={filter === 'offers'}
          onClick={() => setFilter('offers')}
        />
        <StatCard
          label="Running coupons"
          value={formatNumber(stats.runningCoupons)}
          icon="coupon"
          tone="warn"
          active={filter === 'coupons'}
          onClick={() => setFilter('coupons')}
        />
      </StatCardGrid>

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
        <DataTable
          columns={columns}
          source={filteredCampaigns}
          rowKey="id"
          empty={{
            title: 'No matching campaigns',
            description: 'Try selecting another summary card above.',
          }}
        />
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

                <div
                  className={cn(
                    'grid gap-3',
                    editing.form.discountType === 'free_delivery' ||
                      editing.form.discountType === 'half_delivery'
                      ? 'sm:grid-cols-2'
                      : 'sm:grid-cols-3',
                  )}
                >
                  <div className="space-y-1.5">
                    <label className="text-ink text-xs font-semibold">Discount type</label>
                    <Select
                      value={editing.form.discountType}
                      onValueChange={(v) =>
                        setEditing({
                          ...editing,
                          form: { ...editing.form, discountType: v as DiscountType },
                        })
                      }
                      items={[
                        { value: 'percentage', label: '% Percentage' },
                        { value: 'fixed', label: '৳ Fixed amount' },
                        { value: 'free_delivery', label: 'Free Delivery (100% off)' },
                        { value: 'half_delivery', label: 'Half Delivery (50% off)' },
                        { value: 'delivery_discount', label: 'Delivery Discount (৳ off)' },
                      ]}
                    />
                  </div>

                  {editing.form.discountType !== 'free_delivery' &&
                    editing.form.discountType !== 'half_delivery' && (
                    <div className="space-y-1.5">
                      <label className="text-ink text-xs font-semibold">
                        {editing.form.discountType === 'percentage'
                          ? 'Discount (%)'
                          : editing.form.discountType === 'delivery_discount'
                            ? 'Delivery discount (৳)'
                            : 'Amount (৳)'}{' '}
                        *
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
                  )}

                  <div className="space-y-1.5">
                    <label className="text-ink text-xs font-semibold">Min amount (৳)</label>
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
                      checked={editing.form.showOnHome}
                      onCheckedChange={(v) =>
                        setEditing({ ...editing, form: { ...editing.form, showOnHome: v } })
                      }
                    />
                    <span>Show banner on homepage</span>
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

      {/* View Details Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <DialogBody className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={getStatus(viewing).tone}>{getStatus(viewing).label}</Badge>
                <Badge tone="brand">
                  {viewing.discountType === 'free_delivery'
                    ? 'Free Delivery'
                    : viewing.discountType === 'half_delivery'
                      ? '50% Off Delivery'
                      : viewing.discountType === 'delivery_discount'
                        ? `৳${formatNumber(viewing.discountValue)} Off Delivery`
                        : viewing.discountType === 'percentage'
                          ? `${viewing.discountValue}% OFF`
                          : `৳${formatNumber(viewing.discountValue)} OFF`}
                </Badge>
                {viewing.type === 'coupon' && viewing.couponCode ? (
                  <button
                    type="button"
                    onClick={() => void copyCoupon(viewing.couponCode!)}
                    className="border-line bg-well text-ink hover:border-brand inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold transition"
                    title="Copy coupon code"
                  >
                    <span>Coupon: {viewing.couponCode}</span>
                    <Icon name="copy" size={12} />
                  </button>
                ) : (
                  <Badge tone="info">Auto offer</Badge>
                )}
              </div>

              {viewing.description && (
                <div className="bg-well rounded-xl p-3">
                  <p className="text-muted text-xs font-semibold uppercase">Description</p>
                  <p className="text-ink mt-1 whitespace-pre-line">{viewing.description}</p>
                </div>
              )}

              <dl className="divide-line divide-y text-xs">
                <div className="flex justify-between py-2">
                  <dt className="text-muted">Date window</dt>
                  <dd className="text-ink font-medium">
                    {formatStoreDate(viewing.startsAt)} → {formatStoreDate(viewing.endsAt)}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted">Minimum amount</dt>
                  <dd className="text-ink font-medium">
                    {viewing.minOrderAmount > 0
                      ? `৳${formatNumber(viewing.minOrderAmount)}`
                      : 'None'}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted">Homepage banner</dt>
                  <dd className="text-ink font-medium">
                    {viewing.showOnHome ? 'Shown' : 'Hidden'}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted">1st-visit modal</dt>
                  <dd className="text-ink font-medium">
                    {viewing.showModal ? 'Enabled' : 'Disabled'}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted">Target</dt>
                  <dd className="text-ink font-medium">
                    {viewing.scope === 'all'
                      ? 'All products'
                      : `${viewing.productIds.length} product(s)`}
                  </dd>
                </div>
              </dl>

              {viewing.scope === 'products' && viewing.products.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-muted text-xs font-semibold uppercase">Targeted products</p>
                  <ul className="border-line max-h-40 divide-y overflow-y-auto rounded-xl border text-xs">
                    {viewing.products.map((p) => (
                      <li key={p.id} className="flex items-center justify-between px-3 py-2">
                        <span className="text-ink truncate font-medium">{p.name}</span>
                        <span className="text-muted shrink-0">
                          ৳{formatNumber(p.salePrice ?? p.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </DialogBody>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setViewing(null)}>
              Close
            </Button>
            {viewing && (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  const target = viewing;
                  setViewing(null);
                  openEdit(target);
                }}
              >
                <Icon name="pencil" size={14} /> Edit campaign
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        tone={toggling?.isActive ? 'danger' : undefined}
        title={toggling?.isActive ? 'Deactivate campaign?' : 'Activate campaign?'}
        description={
          toggling?.isActive
            ? `"${toggling?.title}" will be paused and will no longer apply on the store.`
            : `"${toggling?.title}" will become active within its scheduled date window.`
        }
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={async () => {
          if (!toggling) return;
          const res = await toggleCampaignAction(toggling.id, !toggling.isActive);
          if (handleActionResult(res)) {
            setToggling(null);
            router.refresh();
          }
        }}
      />

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
    </>
  );
}
