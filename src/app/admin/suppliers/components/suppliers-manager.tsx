'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWatch } from 'react-hook-form';

import { deleteSupplierAction, saveSupplierAction } from '@/actions/admin';
import type { SupplierDTO } from '@/types';
import { Form, FormInput, FormSelect, FormSwitch, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, StatusBadge } from '@components/shared';
import { Badge } from '@components/ui/badge';
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
import { useClientPagination } from '@hooks/use-client-pagination';
import { useModal } from '@hooks/use-modal';
import { handleActionResult } from '@lib/action-client';
import {
  SUPPLIER_PROVIDER_LABELS,
  SUPPLIER_PROVIDERS,
  SUPPLIER_TYPE_LABELS,
  SUPPLIER_TYPES,
} from '@lib/constants';
import { formatStoreDateTime } from '@lib/utils';
import { type SupplierInput, supplierSchema } from '@lib/validators/catalog';

export function SuppliersManager({ suppliers }: { suppliers: SupplierDTO[] }) {
  const router = useRouter();
  const modal = useModal<SupplierDTO>();
  const [deleting, setDeleting] = React.useState<SupplierDTO | null>(null);
  const paged = useClientPagination(suppliers);

  const columns: Column<SupplierDTO>[] = [
    {
      key: 'name',
      wrap: true,
      minWidth: 200,
      header: 'Supplier',
      cell: (s) => (
        <div>
          <p className="text-ink font-semibold">{s.name}</p>
          <a
            href={s.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent inline-flex items-center gap-1 text-[12px] hover:underline"
          >
            {s.websiteUrl.replace(/^https?:\/\//, '')} <Icon name="external" size={11} />
          </a>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Integration',
      cell: (s) =>
        s.type === 'api' ? (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="brand">API</Badge>
              <StatusBadge
                status={s.apiKeyConfigured ? 'ok' : 'danger'}
                label={s.apiKeyConfigured ? 'Connected' : 'Missing key'}
              />
            </div>
            <p className="text-subtle text-[11px]">
              {s.lastSyncAt
                ? `Synced ${formatStoreDateTime(s.lastSyncAt)}`
                : 'Not synced yet'}
            </p>
          </div>
        ) : (
          <Badge tone="neutral">{SUPPLIER_TYPE_LABELS.manual}</Badge>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => (
        <StatusBadge
          status={s.status === 'active' ? 'ok' : 'neutral'}
          label={s.status === 'active' ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      key: 'products',
      header: 'Products',
      align: 'right',
      cell: (s) => (
        <div className="text-right">
          <span className="font-medium">{s.productCount ?? 0}</span>
          {s.type === 'api' && (s.linkedProductCount ?? 0) > 0 && (
            <p className="text-subtle text-[11px]">{s.linkedProductCount} linked</p>
          )}
        </div>
      ),
    },
    {
      key: 'orders',
      header: 'Supplier Orders',
      align: 'right',
      cell: (s) =>
        s.type === 'api' ? (
          <div className="text-right text-xs">
            <span className="text-ink font-medium">{s.submittedOrderCount ?? 0} sent</span>
            {(s.pendingOrderCount ?? 0) > 0 && (
              <p className="text-amber-700">{s.pendingOrderCount} awaiting</p>
            )}
            {(s.failedOrderCount ?? 0) > 0 && (
              <p className="text-danger">{s.failedOrderCount} failed</p>
            )}
          </div>
        ) : (
          <span className="text-subtle">—</span>
        ),
    },
    {
      key: 'actions',
      align: 'right',
      width: 170,
      cell: (s) => (
        <div className="flex justify-end gap-1">
          {s.type === 'api' && (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/admin/suppliers/${s.id}`}>Browse & Sync</Link>
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Edit ${s.name}`}
            onClick={() => modal.openModal('update', s)}
          >
            <Icon name="pencil" size={15} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Delete ${s.name}`}
            onClick={() => setDeleting(s)}
          >
            <Icon name="trash" size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        {...paged}
        rowKey="id"
        title={`${suppliers.length} suppliers`}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/suppliers/orders">
                <Icon name="box" size={14} /> Supplier Orders
              </Link>
            </Button>
            <Button variant="primary" size="sm" onClick={() => modal.openModal('create')}>
              <Icon name="plus" size={14} /> Add supplier
            </Button>
          </div>
        }
        empty={{ title: 'No suppliers', description: 'Add the websites you source products from.' }}
      />

      <SupplierDialog
        key={modal.data?.id ?? modal.type ?? 'closed'}
        open={modal.isOpen()}
        supplier={modal.data}
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
        title={`Delete ${deleting?.name}?`}
        description="Suppliers with products can’t be deleted — mark them inactive instead."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteSupplierAction(deleting.id);
          if (handleActionResult(res)) router.refresh();
        }}
      />
    </>
  );
}

function SupplierDialog({
  open,
  supplier,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  supplier: SupplierDTO | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const form = Form.useForm<SupplierInput>({
    schema: supplierSchema,
    defaultValues: {
      name: supplier?.name ?? '',
      websiteUrl: supplier?.websiteUrl ?? 'https://',
      status: supplier?.status ?? 'active',
      type: supplier?.type ?? 'manual',
      provider: supplier?.provider ?? undefined,
      apiBaseUrl: supplier?.apiBaseUrl ?? 'https://api.businesskoro.com/api/v1/storefront',
      apiKeyEnvVar: supplier?.apiKeyEnvVar ?? 'BUSINESS_KORO_API_KEY',
      apiDomain: supplier?.apiDomain ?? '',
      syncEnabled: supplier?.syncEnabled ?? true,
      syncIntervalMinutes: supplier?.syncIntervalMinutes ?? 30,
      notes: supplier?.notes ?? '',
    },
  });
  const supplierType = useWatch({ control: form.control, name: 'type' });
  const { isSubmitting } = form.formState;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <Form
          form={form}
          className="gap-0"
          onFinish={async (values) => {
            const res = await saveSupplierAction(values, supplier?.id);
            if (handleActionResult(res, form)) onSaved();
          }}
        >
          <DialogHeader>
            <DialogTitle>{supplier ? 'Edit supplier' : 'New supplier'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid max-h-[70vh] gap-x-4 gap-y-4 overflow-y-auto">
            <FormInput name="name" label="Supplier name" required />
            <FormInput name="websiteUrl" label="Website URL" required />
            <div className="grid grid-cols-2 gap-3">
              <FormSelect
                name="type"
                label="Supplier type"
                items={SUPPLIER_TYPES.map((t) => ({
                  value: t,
                  label: SUPPLIER_TYPE_LABELS[t],
                }))}
              />
              <FormSelect
                name="status"
                label="Status"
                items={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>

            {supplierType === 'api' && (
              <div className="bg-well space-y-3 rounded-xl p-3.5">
                <p className="text-ink text-xs font-semibold">API Integration Configuration</p>
                <FormSelect
                  name="provider"
                  label="API Provider Adapter"
                  items={SUPPLIER_PROVIDERS.map((p) => ({
                    value: p,
                    label: SUPPLIER_PROVIDER_LABELS[p],
                  }))}
                />
                <FormInput
                  name="apiBaseUrl"
                  label="API Base URL"
                  placeholder="https://api.businesskoro.com/api/v1/storefront"
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    name="apiKeyEnvVar"
                    label="API Key Env Variable"
                    placeholder="BUSINESS_KORO_API_KEY"
                    hint="Server env var name only — never paste secret keys here."
                  />
                  <FormInput
                    name="apiDomain"
                    label="x-domain Header (optional)"
                    placeholder="rfcgadget.vercel.app"
                  />
                </div>
                <div className="grid grid-cols-2 items-center gap-3">
                  <FormSwitch
                    name="syncEnabled"
                    label="Auto stock sync"
                    hint="Sync via scheduled job"
                  />
                  <FormInput
                    name="syncIntervalMinutes"
                    label="Sync interval (min)"
                    type="number"
                  />
                </div>
              </div>
            )}

            <FormTextarea
              name="notes"
              label="Notes"
              rows={3}
              placeholder="Contact person, payment terms, delivery times…"
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
