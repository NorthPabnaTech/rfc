'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { Expense, ExpenseCategory } from '@/types/platform';
import { BarList } from '@components/charts/charts';
import { SERIES_COLORS } from '@components/charts/charts';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { Panel } from '@components/dashboard/panel';
import {
  Form,
  FormCurrency,
  FormDatePicker,
  FormInput,
  FormSelect,
  FormTextarea,
} from '@components/form';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { ConfirmDialog, PageHeader } from '@components/shared';
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
import { Select } from '@components/ui/select';
import { useListState } from '@hooks/use-list-state';
import { toast } from '@lib/toast';
import { expenseSchema } from '@lib/validators/reseller';

const CATS: ExpenseCategory[] = [
  'courier',
  'packaging',
  'marketing',
  'salary',
  'software',
  'office',
  'other',
];
type Values = {
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  note?: string;
};

export default function ExpensesPage() {
  const { t, date, money } = useI18n();
  const { expenses, addExpense, deleteExpense } = usePlatformStore();
  const [open, setOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Expense | null>(null);
  const schema = React.useMemo(() => expenseSchema(t), [t]);
  const list = useListState({
    rows: expenses,
    search: (e) => [e.title, e.note],
    filters: { category: (e, v) => e.category === v },
    initialFilters: { category: 'all' },
  });
  const total = list.filtered.reduce((a, e) => a + e.amount, 0);
  const byCat = CATS.map((c, i) => ({
    key: c,
    label: t(`expenseCat.${c}`),
    value: expenses.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0),
    color: SERIES_COLORS[i % SERIES_COLORS.length]!,
  }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const columns: Column<Expense>[] = [
    {
      key: 'date',
      header: t('common.date'),
      cell: (e) => <span className="num text-muted text-[14px]">{date(e.date)}</span>,
    },
    {
      key: 'title',
      header: t('admin.finance.expenseTitle'),
      wrap: true,
      minWidth: 220,
      cell: (e) => <span className="text-ink text-[14px] font-medium">{e.title}</span>,
    },
    {
      key: 'cat',
      header: t('common.category'),
      cell: (e) => (
        <span className="bg-well text-muted rounded-full px-2.5 py-1 text-[12.5px] font-semibold">
          {t(`expenseCat.${e.category}`)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: t('common.amount'),
      align: 'right',
      cell: (e) => <Money value={e.amount} className="text-ink font-semibold" />,
    },
    {
      key: 'actions',
      align: 'right',
      cell: (e) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setToDelete(e)}
          aria-label={t('common.delete')}
        >
          <Icon name="trash" size={16} className="text-muted" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.finance.expensesTitle')}
        description={t('admin.finance.expensesSubtitle')}

        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Icon name="plus" size={16} />
            {t('admin.finance.addExpense')}
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <ListToolbar
            query={list.query}
            onQuery={list.setQuery}
            placeholder={t('common.searchPlaceholder')}
            end={
              <span className="text-muted text-sm">
                {t('common.total')}: <Money value={total} className="text-ink font-bold" />
              </span>
            }
          >
            <Select
              size="md"
              className="sm:w-44"
              value={list.filters.category}
              onValueChange={(v) => list.setFilter('category', v)}
              items={[
                { value: 'all', label: t('common.all') },
                ...CATS.map((c) => ({ value: c, label: t(`expenseCat.${c}`) })),
              ]}
              aria-label={t('common.category')}
            />
          </ListToolbar>
          <DataTable
            columns={columns}
            source={list.pageRows}
            rowKey="id"
            page={list.page}
            limit={list.limit}
            total={list.total}
            onPaginate={list.setPage}
            empty={{ title: t('common.noResults') }}
          />
        </div>
        <Panel title={t('admin.finance.byCategory')} className="lg:self-start">
          <BarList rows={byCat} format={(v) => money(v)} />
        </Panel>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <Form<Values>
            schema={schema}
            initialValues={{
              title: '',
              category: 'marketing',
              amount: 0,
              date: new Date().toISOString().slice(0, 10),
              note: '',
            }}
            onFinish={(v) => {
              addExpense({
                title: v.title,
                category: v.category,
                amount: Number(v.amount),
                date: new Date(v.date).toISOString(),
                note: v.note,
              });
              toast.success(t('admin.finance.expenseAdded'));
              setOpen(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('admin.finance.addExpense')}</DialogTitle>
            </DialogHeader>
            <DialogBody className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              <FormInput
                name="title"
                label={t('admin.finance.expenseTitle')}
                required
                className="sm:col-span-2"
              />
              <FormSelect
                name="category"
                label={t('common.category')}
                items={CATS.map((c) => ({ value: c, label: t(`expenseCat.${c}`) }))}
              />
              <FormCurrency name="amount" label={t('common.amount')} required />
              <FormDatePicker
                name="date"
                label={t('common.date')}
                required
                className="sm:col-span-2"
              />
              <FormTextarea
                name="note"
                label={t('common.note')}
                rows={2}
                className="sm:col-span-2"
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        tone="danger"
        destructive
        icon="trash"
        title={t('common.delete')}
        description={toDelete?.title}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (toDelete) deleteExpense(toDelete.id);
          toast.success(t('common.deleted'));
          setToDelete(null);
        }}
      />
    </div>
  );
}
