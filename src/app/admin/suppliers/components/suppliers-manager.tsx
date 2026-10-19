'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { deleteSupplierAction, saveSupplierAction } from '@/actions/admin';
import type { SupplierDTO } from '@/types';
import { Form, FormInput, FormSelect, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, StatusBadge } from '@components/shared';
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
      key: 'status',
      header: 'Status',
      cell: (s) => (
        <StatusBadge
          status={s.status === 'active' ? 'ok' : 'neutral'}
          label={s.status === 'active' ? 'Active' : 'Inactive'}
        />
      ),
    },
    { key: 'products', header: 'Products', align: 'right', cell: (s) => s.productCount ?? 0 },
    {
      key: 'notes',
      wrap: true,
      minWidth: 220,
      header: 'Notes',
      cell: (s) => (
        <span className="text-muted line-clamp-2 max-w-sm text-[12.5px]">{s.notes ?? '—'}</span>
      ),
    },
    {
      key: 'actions',
      align: 'right',
      width: 96,
      cell: (s) => (
        <div className="flex justify-end gap-1">
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
          <Button variant="primary" size="sm" onClick={() => modal.openModal('create')}>
            <Icon name="plus" size={14} /> Add supplier
          </Button>
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
      notes: supplier?.notes ?? '',
    },
  });
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
          <DialogBody className="grid gap-x-4 gap-y-5">
            <FormInput name="name" label="Supplier name" required />
            <FormInput name="websiteUrl" label="Website URL" required />
            <FormSelect
              name="status"
              label="Status"
              items={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
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
