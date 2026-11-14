'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';

import {
  deleteExpenseAction,
  deleteExpenseCategoryAction,
  saveExpenseAction,
  saveExpenseCategoryAction,
} from '@/actions/admin';
import { Taka } from '@/features/products/price';
import { ImageUploader } from '@/features/uploads/image-uploader';
import type { BusinessDTO, ExpenseCategoryDTO, ExpenseDTO, Paginated } from '@/types';
import {
  Form,
  FormCurrency,
  FormInput,
  FormItem,
  FormSelect,
  FormSwitch,
  FormTextarea,
} from '@components/form';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, EmptyState, StatusBadge } from '@components/shared';
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
import { Dropdown } from '@components/ui/dropdown';
import { handleActionResult } from '@lib/action-client';
import {
  DEFAULT_BUSINESS_SLUG,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_PAYMENT_METHODS,
} from '@lib/constants';
import { dayjs, formatStoreDate } from '@lib/utils';
import {
  type ExpenseCategoryInput,
  expenseCategorySchema,
  type ExpenseInput,
  expenseSchema,
} from '@lib/validators/management';

import { useUrlPagination } from '../../components/list-toolbar';

export function ExpensesManager({
  data,
  categories,
  businesses,
}: {
  data: Paginated<ExpenseDTO> & { totalAmount: number };
  categories: ExpenseCategoryDTO[];
  businesses: BusinessDTO[];
}) {
  const router = useRouter();
  const { onPaginate } = useUrlPagination();
  const [editing, setEditing] = React.useState<ExpenseDTO | 'new' | null>(null);
  const [deleting, setDeleting] = React.useState<ExpenseDTO | null>(null);
  const [catModal, setCatModal] = React.useState(false);

  const bizMap = React.useMemo(
    () => new Map(businesses.map((b) => [b.slug, b.name])),
    [businesses],
  );

  const columns: Column<ExpenseDTO>[] = [
    {
      key: 'title',
      wrap: true,
      minWidth: 220,
      header: 'Expense',
      cell: (e) => (
        <div>
          <p className="text-ink font-semibold">{e.title}</p>
          {e.description && (
            <p className="text-subtle line-clamp-1 text-[11.5px]">{e.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (e) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-ink text-[13px]">{e.categoryName}</span>
          {e.isCostOfGoods && <StatusBadge status="warn" label="COGS" />}
        </div>
      ),
    },
    {
      key: 'business',
      header: 'Business',
      cell: (e) => (
        <StatusBadge
          status={e.business === DEFAULT_BUSINESS_SLUG ? 'info' : 'neutral'}
          label={bizMap.get(e.business) ?? e.business}
        />
      ),
    },
    {
      key: 'method',
      header: 'Payment',
      cell: (e) => (
        <span className="text-muted text-[12.5px]">
          {EXPENSE_PAYMENT_METHOD_LABELS[e.paymentMethod]}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      cell: (e) => <span className="text-muted">{formatStoreDate(e.expenseDate)}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (e) => <Taka amount={e.amount} className="text-ink font-semibold" />,
    },
    {
      key: 'actions',
      align: 'right',
      width: 56,
      cell: (e) => (
        <Dropdown
          items={[
            ...(e.attachment?.url
              ? [
                  {
                    label: 'View receipt',
                    icon: 'external' as const,
                    onClick: () => window.open(e.attachment!.url, '_blank'),
                  },
                ]
              : []),
            { label: 'Edit', icon: 'pencil', onClick: () => setEditing(e) },
            { type: 'separator' as const },
            { label: 'Delete', icon: 'trash', destructive: true, onClick: () => setDeleting(e) },
          ]}
        >
          <Button variant="ghost" size="icon-sm" aria-label="Actions">
            <Icon name="more" size={16} />
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="bg-panel hairline rounded-xl2 flex items-center gap-3 px-4 py-2.5">
          <span className="text-subtle text-[12px]">Total matching expenses:</span>
          <Taka amount={data.totalAmount} className="text-ink text-base font-semibold" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setCatModal(true)}>
            <Icon name="folder" size={15} /> Manage categories
          </Button>
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={15} /> Add expense
          </Button>
        </div>
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          title="No expenses found"
          description="Record business expenses such as ads, hosting, packaging, courier, or stock purchases."
          action={
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Icon name="plus" size={15} /> Add expense
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          source={data.items}
          rowKey="id"
          page={data.page}
          limit={data.pageSize}
          total={data.total}
          onPaginate={onPaginate}
        />
      )}

      {editing && (
        <ExpenseDialog
          expense={editing === 'new' ? undefined : editing}
          categories={categories}
          businesses={businesses}
          onClose={() => setEditing(null)}
        />
      )}

      {catModal && (
        <ExpenseCategoriesDialog
          categories={categories}
          onClose={() => setCatModal(false)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title={`Delete "${deleting?.title}"?`}
        description="This expense will be permanently removed from your financial reports."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteExpenseAction(deleting.id);
          if (handleActionResult(res)) router.refresh();
        }}
      />
    </>
  );
}

function ExpenseDialog({
  expense,
  categories,
  businesses,
  onClose,
}: {
  expense?: ExpenseDTO;
  categories: ExpenseCategoryDTO[];
  businesses: BusinessDTO[];
  onClose: () => void;
}) {
  const router = useRouter();
  const form = Form.useForm<ExpenseInput>({
    schema: expenseSchema,
    defaultValues: expense
      ? {
          title: expense.title,
          categoryId: expense.categoryId,
          amount: expense.amount,
          expenseDate: dayjs(expense.expenseDate).tz('Asia/Dhaka').format('YYYY-MM-DD'),
          paymentMethod: expense.paymentMethod,
          description: expense.description ?? '',
          attachment: expense.attachment ?? null,
          business: expense.business,
        }
      : {
          title: '',
          categoryId: categories[0]?.id ?? '',
          amount: 0,
          expenseDate: dayjs().tz('Asia/Dhaka').format('YYYY-MM-DD'),
          paymentMethod: 'cash',
          description: '',
          attachment: null,
          business: DEFAULT_BUSINESS_SLUG,
        },
  });
  const { isSubmitting } = form.formState;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <Form
          form={form}
          onFinish={async (values) => {
            const res = await saveExpenseAction(values, expense?.id);
            if (handleActionResult(res, form)) {
              onClose();
              router.refresh();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{expense ? 'Edit expense' : 'Record expense'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <FormInput
              name="title"
              label="Expense title"
              placeholder="e.g. Facebook boost campaign"
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect
                name="categoryId"
                label="Category"
                required
                items={categories.map((c) => ({
                  value: c.id,
                  label: c.isCostOfGoods ? `${c.name} (COGS)` : c.name,
                }))}
              />
              <FormSelect
                name="business"
                label="Business / Store"
                required
                items={businesses.map((b) => ({ value: b.slug, label: b.name }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormCurrency name="amount" label="Amount (৳)" required />
              <FormItem name="expenseDate" label="Expense date" required>
                {(field) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              </FormItem>
              <FormSelect
                name="paymentMethod"
                label="Payment method"
                items={EXPENSE_PAYMENT_METHODS.map((m) => ({
                  value: m,
                  label: EXPENSE_PAYMENT_METHOD_LABELS[m],
                }))}
              />
            </div>
            <FormTextarea
              name="description"
              label="Description / Notes"
              rows={2}
              placeholder="Optional details..."
            />
            <FormItem name="attachment" label="Receipt / Attachment (optional)">
              {(field) => (
                <ImageUploader
                  purpose="expenses"
                  max={1}
                  value={field.value ? [field.value] : []}
                  onChange={(imgs) => field.onChange(imgs[0] ?? null)}
                />
              )}
            </FormItem>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : expense ? 'Save changes' : 'Record expense'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseCategoriesDialog({
  categories,
  onClose,
}: {
  categories: ExpenseCategoryDTO[];
  onClose: () => void;
}) {
  const router = useRouter();
  const form = Form.useForm<ExpenseCategoryInput>({
    schema: expenseCategorySchema,
    defaultValues: { name: '', isCostOfGoods: false },
  });
  const { isSubmitting } = form.formState;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Expense categories</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <Form
            form={form}
            className="space-y-3"
            onFinish={async (values) => {
              const res = await saveExpenseCategoryAction(values);
              if (handleActionResult(res, form)) {
                form.reset({ name: '', isCostOfGoods: false });
                router.refresh();
              }
            }}
          >
            <FormInput name="name" label="New category name" placeholder="e.g. Office Rent" required />
            <FormSwitch
              name="isCostOfGoods"
              label="Inventory / Supplier Purchase Cost"
              hint="Excluded from operating expenses to avoid double-counting COGS."
            />
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              <Icon name="plus" size={14} /> {isSubmitting ? 'Adding…' : 'Add category'}
            </Button>
          </Form>

          <ul className="divide-line border-line divide-y border-t pt-2">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <span className="text-ink font-medium">{c.name}</span>
                  {c.isCostOfGoods && (
                    <span className="text-subtle ml-1.5 text-[11px]">(COGS)</span>
                  )}
                </div>
                {!c.isSystem && (c.expenseCount ?? 0) === 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete category"
                    onClick={async () => {
                      const res = await deleteExpenseCategoryAction(c.id);
                      if (handleActionResult(res)) router.refresh();
                    }}
                  >
                    <Icon name="trash" size={14} className="text-rose-500" />
                  </Button>
                ) : (
                  <span className="text-subtle text-[11px]">
                    {c.isSystem ? 'Default' : `${c.expenseCount} used`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
