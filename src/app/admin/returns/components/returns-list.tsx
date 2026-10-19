'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { updateReturnAction } from '@/actions/admin';
import { ReturnStatusBadge } from '@/features/orders/order-ui';
import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import type { Paginated, ReturnDTO } from '@/types';
import { Form, FormCurrency, FormSelect, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { FormSection } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { handleActionResult } from '@lib/action-client';
import { RETURN_STATUS_LABELS, RETURN_TRANSITIONS, type ReturnStatus } from '@lib/constants';
import { formatStoreDateTime } from '@lib/utils';

import { useUrlPagination } from '../../components/list-toolbar';

export function ReturnsList({ data }: { data: Paginated<ReturnDTO> }) {
  const { onPaginate } = useUrlPagination();
  const [active, setActive] = React.useState<ReturnDTO | null>(null);

  const columns: Column<ReturnDTO>[] = [
    {
      key: 'order',
      header: 'Order',
      cell: (r) => (
        <div>
          <Link
            href={`/admin/orders/${r.orderId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-ink hover:text-accent font-semibold"
          >
            {r.orderNumber}
          </Link>
          <p className="text-subtle text-[11.5px]">{formatStoreDateTime(r.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      wrap: true,
      minWidth: 150,
      header: 'Customer',
      cell: (r) => (
        <div>
          <p className="text-ink">{r.customerName}</p>
          <p className="text-subtle text-[11.5px]">{r.customerPhone}</p>
        </div>
      ),
    },
    {
      key: 'reason',
      wrap: true,
      minWidth: 200,
      header: 'Reason',
      cell: (r) => (
        <div className="max-w-xs">
          <p className="text-ink">{r.reason}</p>
          {r.description && (
            <p className="text-subtle line-clamp-2 text-[11.5px]">{r.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'photos',
      header: 'Photos',
      align: 'center',
      cell: (r) =>
        r.images.length ? (
          <span className="text-accent font-semibold">{r.images.length}</span>
        ) : (
          '—'
        ),
    },
    {
      key: 'value',
      header: 'Order total',
      align: 'right',
      cell: (r) => (r.orderTotal != null ? <Taka amount={r.orderTotal} /> : '—'),
    },
    { key: 'status', header: 'Status', cell: (r) => <ReturnStatusBadge status={r.status} /> },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        source={data.items}
        rowKey="id"
        onRowClick={setActive}
        page={data.page}
        limit={data.pageSize}
        total={data.total}
        onPaginate={onPaginate}
        empty={{
          title: 'No return requests',
          description: 'Return requests from customers will appear here.',
        }}
      />
      {active && <ReturnDialog key={active.id} ret={active} onClose={() => setActive(null)} />}
    </>
  );
}

type Values = { status: ReturnStatus; adminNote: string; refundAmount: number | '' };

function ReturnDialog({ ret, onClose }: { ret: ReturnDTO; onClose: () => void }) {
  const router = useRouter();
  const options = [ret.status, ...RETURN_TRANSITIONS[ret.status]];
  const form = Form.useForm<Values>({
    defaultValues: {
      status: ret.status,
      adminNote: ret.adminNote ?? '',
      refundAmount: ret.refundAmount ?? '',
    },
  });
  const { isSubmitting } = form.formState;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <Form
          form={form}
          className="gap-0"
          onFinish={async (values) => {
            const res = await updateReturnAction({ returnId: ret.id, ...values });
            if (handleActionResult(res, form)) {
              onClose();
              router.refresh();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Return for {ret.orderNumber}</DialogTitle>
            <DialogDescription>Requested {formatStoreDateTime(ret.createdAt)}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-6">
            {/* Who and what */}
            <dl className="border-line grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border p-4">
              <InfoItem label="Customer" value={ret.customerName ?? '—'} />
              <InfoItem label="Phone" value={ret.customerPhone ?? '—'} />
              <InfoItem
                label="Order total"
                value={ret.orderTotal != null ? <Taka amount={ret.orderTotal} /> : '—'}
              />
              <InfoItem label="Current status" value={<ReturnStatusBadge status={ret.status} />} />
            </dl>

            <FormSection title="Customer’s request" icon="refresh">
              <div className="bg-surface space-y-2 rounded-xl p-4">
                <p className="type-card-title text-ink">{ret.reason}</p>
                {ret.description ? (
                  <p className="type-body text-base-700 break-words whitespace-pre-line">
                    {ret.description}
                  </p>
                ) : (
                  <p className="type-helper text-muted">No description provided.</p>
                )}
                {ret.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ret.images.map((img) => (
                      <a
                        key={img.url}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-well relative size-20 overflow-hidden rounded-lg"
                      >
                        <ProductImage src={img.url} alt="Return photo" fill sizes="80px" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </FormSection>

            <FormSection title="Your decision" icon="checkCircle" contentClassName="sm:grid-cols-2">
              <FormSelect
                name="status"
                label="Status"
                items={options.map((s) => ({ value: s, label: RETURN_STATUS_LABELS[s] }))}
                hint={
                  ret.status === 'pending' ? 'Approving marks the order as Returned.' : undefined
                }
              />
              <FormCurrency
                name="refundAmount"
                label="Refund amount"
                placeholder={ret.orderTotal != null ? String(ret.orderTotal) : ''}
                hint="Leave empty if no refund is due."
              />
              <FormTextarea
                name="adminNote"
                label="Note to customer"
                rows={3}
                placeholder="Shown on the customer’s order page"
                className="sm:col-span-2"
              />
            </FormSection>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" asChild className="sm:mr-auto">
              <Link href={`/admin/orders/${ret.orderId}`}>
                <Icon name="external" size={14} /> Open order
              </Link>
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
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

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="type-caption text-muted">{label}</dt>
      <dd className="type-label text-ink mt-1 break-words">{value}</dd>
    </div>
  );
}
