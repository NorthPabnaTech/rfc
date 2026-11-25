'use client';

import * as React from 'react';
import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { Supplier } from '@/types/platform';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { Form, FormInput, FormSelect, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import {
  ConfirmDialog,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  PageHeader,
} from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Dropdown } from '@components/ui/dropdown';
import { Select } from '@components/ui/select';
import { useListState } from '@hooks/use-list-state';
import { sellerBasePrice } from '@lib/business/pricing';
import { toast } from '@lib/toast';
import { supplierSchema } from '@lib/validators/reseller';

type Values = Omit<Supplier, 'id' | 'createdAt' | 'notes'> & { notes?: string };

export default function AdminSuppliersPage() {
  const { t, num, date } = useI18n();
  const { suppliers, products, upsertSupplier, deleteSupplier } = usePlatformStore();
  const [editing, setEditing] = React.useState<Supplier | 'new' | null>(null);
  const [viewing, setViewing] = React.useState<Supplier | null>(null);
  const [toDelete, setToDelete] = React.useState<Supplier | null>(null);

  const stats = (id: string) => {
    const list = products.filter((p) => p.supplierId === id);
    return {
      count: list.length,
      avg: list.length ? Math.round(list.reduce((a, p) => a + p.supplierCost, 0) / list.length) : 0,
    };
  };

  const list = useListState({
    rows: suppliers,
    search: (s) => [s.name, s.contactPerson, s.email, s.phone],
    filters: { status: (s, v) => s.status === v },
    initialFilters: { status: 'all' },
  });

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: t('common.name'),
      minWidth: 200,
      wrap: true,
      cell: (s) => (
        <span className="leading-tight">
          <span className="text-ink block text-[14px] font-semibold">{s.name}</span>
          <a
            href={s.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-accent text-[12.5px] hover:underline"
          >
            {s.sourceUrl.replace(/^https?:\/\//, '')}
          </a>
        </span>
      ),
    },
    {
      key: 'contact',
      header: t('admin.suppliers.contactPerson'),
      cell: (s) => <span className="text-[14px]">{s.contactPerson}</span>,
    },
    {
      key: 'phone',
      header: `${t('common.phone')} / ${t('common.email')}`,
      cell: (s) => (
        <span className="leading-tight">
          <span className="num block text-[14px]">{s.phone}</span>
          <span className="text-subtle block text-[12.5px]">{s.email}</span>
        </span>
      ),
    },
    {
      key: 'products',
      header: t('admin.suppliers.productsCount'),
      align: 'center',
      cell: (s) => <span className="num font-semibold">{num(stats(s.id).count)}</span>,
    },
    {
      key: 'avg',
      header: t('admin.suppliers.avgCost'),
      align: 'right',
      cell: (s) => <Money value={stats(s.id).avg} />,
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (s) => <StatusPill kind="supplier" value={s.status} />,
    },
    {
      key: 'actions',
      align: 'right',
      cell: (s) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Dropdown
            items={[
              { label: t('common.view'), icon: 'eye', onClick: () => setViewing(s) },
              { label: t('common.edit'), icon: 'pencil', onClick: () => setEditing(s) },
              { type: 'separator' },
              {
                label: t('common.delete'),
                icon: 'trash',
                destructive: true,
                onClick: () => setToDelete(s),
              },
            ]}
          >
            <Button variant="ghost" size="icon-sm" aria-label={t('common.actions')}>
              <Icon name="more" size={18} />
            </Button>
          </Dropdown>
        </span>
      ),
    },
  ];

  const viewProducts = viewing ? products.filter((p) => p.supplierId === viewing.id) : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.suppliers.title')}
        description={t('admin.suppliers.subtitle')}

        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={16} />
            {t('admin.suppliers.add')}
          </Button>
        }
      />
      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder={t('admin.suppliers.searchPlaceholder')}
      >
        <Select
          size="md"
          className="sm:w-44"
          value={list.filters.status}
          onValueChange={(v) => list.setFilter('status', v)}
          items={[
            { value: 'all', label: t('common.all') },
            { value: 'active', label: t('status.supplier.active') },
            { value: 'inactive', label: t('status.supplier.inactive') },
          ]}
          aria-label={t('common.status')}
        />
      </ListToolbar>
      <DataTable
        columns={columns}
        source={list.pageRows}
        rowKey="id"
        onRowClick={setViewing}
        page={list.page}
        limit={list.limit}
        total={list.total}
        onPaginate={list.setPage}
      />

      <SupplierDialog
        supplier={editing}
        onClose={() => setEditing(null)}
        onSave={(s) => {
          upsertSupplier(s);
          toast.success(t('common.saved'));
          setEditing(null);
        }}
      />

      <Drawer open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DrawerContent className="sm:max-w-md">
          <DrawerHeader title={viewing?.name ?? ''} description={t('admin.suppliers.viewTitle')} />
          {viewing && (
            <DrawerBody className="space-y-5">
              <StatusPill kind="supplier" value={viewing.status} />
              <dl className="divide-line divide-y text-[14px]">
                {[
                  [t('admin.suppliers.contactPerson'), viewing.contactPerson],
                  [t('common.phone'), viewing.phone],
                  [t('common.email'), viewing.email],
                  [
                    t('admin.suppliers.sourceUrl'),
                    <a
                      key="u"
                      href={viewing.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {viewing.sourceUrl}
                    </a>,
                  ],
                  [t('common.joined'), date(viewing.createdAt)],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-ink text-right font-medium break-all">{v}</dd>
                  </div>
                ))}
              </dl>
              {viewing.notes && (
                <div className="bg-well/60 rounded-xl p-3 text-[14px]">
                  <div className="text-muted mb-1 text-xs font-semibold">
                    {t('admin.suppliers.notes')}
                  </div>
                  {viewing.notes}
                </div>
              )}
              <div>
                <h3 className="type-card-title text-ink mb-2">
                  {t('admin.suppliers.productsList')}
                </h3>
                <ul className="divide-line divide-y">
                  {viewProducts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-[14px]"
                    >
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="text-ink hover:text-accent line-clamp-1 font-medium"
                      >
                        {p.name}
                      </Link>
                      <span className="text-right">
                        <Money value={p.supplierCost} className="text-muted block text-xs" />
                        <Money
                          value={sellerBasePrice(p)}
                          className="text-ink block font-semibold"
                        />
                      </span>
                    </li>
                  ))}
                  {viewProducts.length === 0 && (
                    <li className="text-muted py-4 text-center text-sm">{t('common.noResults')}</li>
                  )}
                </ul>
              </div>
            </DrawerBody>
          )}
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        tone="danger"
        destructive
        icon="trash"
        title={t('admin.suppliers.deleteTitle')}
        description={toDelete?.name}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (!toDelete) return;
          const res = deleteSupplier(toDelete.id);
          if (res.ok) toast.success(t('common.deleted'));
          else toast.error(t('admin.suppliers.inUse'));
          setToDelete(null);
        }}
      />
    </div>
  );
}

function SupplierDialog({
  supplier,
  onClose,
  onSave,
}: {
  supplier: Supplier | 'new' | null;
  onClose: () => void;
  onSave: (s: Supplier) => void;
}) {
  const { t } = useI18n();
  const schema = React.useMemo(() => supplierSchema(t), [t]);
  const existing = supplier && supplier !== 'new' ? supplier : null;
  return (
    <Dialog open={!!supplier} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <Form<Values>
          key={existing?.id ?? 'new'}
          schema={schema}
          initialValues={
            existing ?? {
              name: '',
              contactPerson: '',
              phone: '',
              email: '',
              sourceUrl: 'https://',
              status: 'active',
              notes: '',
            }
          }
          onFinish={(v) =>
            onSave({
              ...v,
              notes: v.notes ?? '',
              id: existing?.id ?? `sup-${Date.now().toString(36)}`,
              createdAt: existing?.createdAt ?? new Date().toISOString(),
            })
          }
        >
          <DialogHeader>
            <DialogTitle>
              {existing ? t('admin.suppliers.edit') : t('admin.suppliers.add')}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <FormInput name="name" label={t('common.name')} required />
            <FormInput name="contactPerson" label={t('admin.suppliers.contactPerson')} required />
            <FormInput name="phone" label={t('common.phone')} required />
            <FormInput name="email" type="email" label={t('common.email')} required />
            <FormInput
              name="sourceUrl"
              label={t('admin.suppliers.sourceUrl')}
              required
              className="sm:col-span-2"
            />
            <FormSelect
              name="status"
              label={t('common.status')}
              items={[
                { value: 'active', label: t('status.supplier.active') },
                { value: 'inactive', label: t('status.supplier.inactive') },
              ]}
            />
            <FormTextarea
              name="notes"
              label={t('admin.suppliers.notes')}
              rows={3}
              className="sm:col-span-2"
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
