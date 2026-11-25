'use client';

import * as React from 'react';
import { z } from 'zod';

import { useI18n } from '@/i18n/provider';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { Icon } from '@components/icon/icon';
import { StatusPill } from '@components/platform/status-pill';
import { TelegramCard } from '@components/platform/telegram-card';
import { PageHeader } from '@components/shared';
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
import { Form, FormInput, FormSelect, FormTextarea } from '@components/form';
import { Select } from '@components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@components/ui/sheet';
import { Textarea } from '@components/ui/textarea';
import { useListState } from '@hooks/use-list-state';
import { ApiError } from '@lib/api/client';
import { resellerApi, type SupportTicket } from '@lib/api/reseller';
import { toast } from '@lib/toast';
import { cn } from '@lib/utils';

import { useSellerTickets } from '../components/use-seller-data';

type TicketFormValues = {
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  orderNumber: string;
  message: string;
};

export default function SellerSupportPage() {
  const { t, relative, dateTime } = useI18n();
  const [statusFilter, setStatusFilter] = React.useState('all');
  const { tickets, loading, reload } = useSellerTickets(
    statusFilter === 'all' ? undefined : statusFilter,
  );
  const [createOpen, setCreateOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Thread drawer state
  const [activeTicketId, setActiveTicketId] = React.useState<string | null>(null);
  const [thread, setThread] = React.useState<SupportTicket | null>(null);
  const [threadLoading, setThreadLoading] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [replying, setReplying] = React.useState(false);

  const list = useListState({
    rows: tickets,
    search: (x) => [x.ticketNumber, x.id, x.subject, x.category, x.orderNumber ?? undefined, x.message],
    pageSize: 10,
  });

  const schema = React.useMemo(
    () =>
      z.object({
        subject: z.string().trim().min(3, t('common.required')),
        category: z.string().trim().optional().default(''),
        priority: z.enum(['low', 'medium', 'high']).default('medium'),
        orderNumber: z.string().trim().optional().default(''),
        message: z.string().trim().min(5, t('common.required')),
      }),
    [t],
  );

  const form = Form.useForm<TicketFormValues>({
    schema,
    defaultValues: {
      subject: '',
      category: '',
      priority: 'medium',
      orderNumber: '',
      message: '',
    },
  });

  const openThread = async (id: string) => {
    setActiveTicketId(id);
    setThreadLoading(true);
    try {
      const data = await resellerApi.getTicket(id);
      setThread(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('common.somethingWrong'));
      setActiveTicketId(null);
    } finally {
      setThreadLoading(false);
    }
  };

  const handleCreate = async (v: TicketFormValues) => {
    setSubmitting(true);
    try {
      await resellerApi.createTicket({
        subject: v.subject.trim(),
        category: v.category.trim() || undefined,
        priority: v.priority,
        orderNumber: v.orderNumber.trim() || undefined,
        message: v.message.trim(),
      });
      toast.success(t('seller.support.submitted'));
      form.reset();
      setCreateOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  };

  const isTicketClosed = ['resolved', 'closed'].includes((thread?.status ?? '').toLowerCase());

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !replyText.trim() || replying || isTicketClosed) return;
    setReplying(true);
    try {
      const updated = await resellerApi.replyTicket(activeTicketId, replyText.trim());
      setThread(updated);
      setReplyText('');
      await reload();
      toast.success('Reply sent');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('common.somethingWrong'));
    } finally {
      setReplying(false);
    }
  };

  const threadMessages = thread?.messages ?? thread?.replies ?? [];

  const columns: Column<SupportTicket>[] = [
    {
      key: 'ticketNumber',
      header: t('common.id'),
      cell: (x) => <span className="text-muted font-mono text-xs">{x.ticketNumber || x.id}</span>,
    },
    {
      key: 'subject',
      header: t('seller.support.subject'),
      wrap: true,
      minWidth: 240,
      cell: (x) => (
        <div className="min-w-0">
          <p className="text-ink text-[13px] font-semibold">{x.subject}</p>
          {x.message && <p className="text-muted mt-0.5 line-clamp-1 text-xs">{x.message}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: t('common.category'),
      cell: (x) => <span className="text-muted text-xs">{x.category || '—'}</span>,
    },
    {
      key: 'orderNumber',
      header: 'Order',
      cell: (x) =>
        x.orderNumber ? (
          <span className="text-muted font-mono text-xs">{x.orderNumber}</span>
        ) : (
          <span className="text-subtle text-xs">—</span>
        ),
    },
    {
      key: 'priority',
      header: t('seller.support.priority'),
      cell: (x) => <StatusPill kind="priority" value={x.priority} />,
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (x) => <StatusPill kind="ticket" value={x.status} />,
    },
    {
      key: 'createdAt',
      header: t('common.date'),
      cell: (x) => <span className="text-muted text-xs">{relative(x.createdAt)}</span>,
    },
    {
      key: 'actions',
      align: 'right',
      cell: (x) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            openThread(x.id);
          }}
        >
          <Icon name="eye" size={14} />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.support.title')}
        description={t('seller.support.subtitle')}
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={16} />
            {t('seller.support.newTicket')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TelegramCard kind="support" variant="hero" />
        <TelegramCard kind="group" />
      </div>

      <DataTable
        title={t('seller.support.myTickets')}
        columns={columns}
        source={list.pageRows}
        rowKey="id"
        onRowClick={(x) => openThread(x.id)}
        isLoading={loading}
        page={list.page}
        limit={list.limit}
        total={list.total}
        onPaginate={list.setPage}
        onLimitChange={list.setLimit}
        toolbar={
          <ListToolbar
            query={list.query}
            onQuery={list.setQuery}
            placeholder={t('common.searchPlaceholder')}
          >
            <Select
              size="sm"
              className="w-36"
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                list.setPage(1);
              }}
              items={[
                { value: 'all', label: t('common.all') },
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
              ]}
              aria-label={t('common.status')}
            />
          </ListToolbar>
        }
        empty={{
          title: t('seller.support.noTickets'),
          action: (
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={14} />
              {t('seller.support.newTicket')}
            </Button>
          ),
        }}
      />

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) form.reset();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('seller.support.newTicket')}</DialogTitle>
            <DialogDescription>{t('seller.support.hours')}</DialogDescription>
          </DialogHeader>
          <Form<TicketFormValues> form={form} onFinish={handleCreate}>
            <DialogBody className="space-y-4">
              <FormInput
                name="subject"
                label={t('seller.support.subject')}
                placeholder="Brief summary of your issue"
                required
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  name="category"
                  label={`${t('common.category')} (${t('common.optional')})`}
                  placeholder="Delivery, Wallet, Product..."
                />
                <FormSelect
                  name="priority"
                  label={t('seller.support.priority')}
                  items={[
                    { value: 'low', label: t('status.priority.low') },
                    { value: 'medium', label: t('status.priority.normal') },
                    { value: 'high', label: t('status.priority.high') },
                  ]}
                />
              </div>
              <FormInput
                name="orderNumber"
                label={`Order Number (${t('common.optional')})`}
                placeholder="RFC-100026"
              />
              <FormTextarea
                name="message"
                label={t('seller.support.message')}
                placeholder="Describe your issue in detail..."
                rows={4}
                required
              />
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={submitting}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                <Icon name="mail" size={16} />
                {submitting ? t('common.loading') : t('seller.support.submit')}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <Sheet
        open={!!activeTicketId}
        onOpenChange={(o) => {
          if (!o) {
            setActiveTicketId(null);
            setThread(null);
            setReplyText('');
          }
        }}
      >
        <SheetContent side="right" className="flex w-full max-w-lg flex-col p-0">
          <SheetHeader className="border-line border-b px-6 py-4">
            <SheetTitle className="text-base">{thread?.subject || 'Ticket Thread'}</SheetTitle>
            {thread && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <StatusPill kind="ticket" value={thread.status} />
                {thread.orderNumber && (
                  <span className="font-mono text-muted">{thread.orderNumber}</span>
                )}
                <span className="text-subtle">{dateTime(thread.createdAt)}</span>
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5">
            {threadLoading ? (
              <div className="space-y-3">
                <div className="skeleton h-16 rounded-xl" />
                <div className="skeleton h-16 rounded-xl" />
              </div>
            ) : (
              <div className="border-line bg-well/40 space-y-3 rounded-xl border p-3.5">
                {thread?.message && threadMessages.length === 0 && (
                  <div className="border-line/80 bg-panel mr-6 rounded-xl border px-4 py-3 text-sm sm:mr-10">
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="text-ink font-semibold">You (reseller)</span>
                      <span className="text-subtle shrink-0">{dateTime(thread.createdAt)}</span>
                    </div>
                    <p className="text-ink/90 whitespace-pre-wrap leading-relaxed">
                      {thread.message}
                    </p>
                  </div>
                )}
                {threadMessages.map((m, i) => {
                  const role = m.senderRole || m.sender || 'reseller';
                  const isAdmin = role === 'admin';
                  const senderLabel = m.senderName
                    ? `${m.senderName} (${role})`
                    : isAdmin
                      ? 'Admin (admin)'
                      : 'You (reseller)';
                  return (
                    <div
                      key={m.id || i}
                      className={cn(
                        'rounded-xl border px-4 py-3 text-sm',
                        isAdmin
                          ? 'bg-brand-soft/70 border-brand/20 ml-6 sm:ml-10'
                          : 'border-line/80 bg-panel mr-6 sm:mr-10',
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <span className="text-ink font-semibold">{senderLabel}</span>
                        <span className="text-subtle shrink-0">{dateTime(m.createdAt)}</span>
                      </div>
                      <p className="text-ink/90 whitespace-pre-wrap leading-relaxed">
                        {m.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {isTicketClosed ? (
            <div className="border-line bg-well/50 border-t px-6 py-4">
              <div className="text-muted flex items-center justify-center gap-2 text-xs font-medium">
                <Icon name="lock" size={14} />
                <span>
                  {thread?.status?.toLowerCase() === 'resolved'
                    ? 'This ticket is resolved. Replies are disabled.'
                    : 'This ticket is closed. Replies are disabled.'}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReply} className="border-line space-y-2 border-t p-4">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                rows={3}
              />
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={replying || !replyText.trim()}
              >
                {replying ? t('common.loading') : 'Send Reply'}
              </Button>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
