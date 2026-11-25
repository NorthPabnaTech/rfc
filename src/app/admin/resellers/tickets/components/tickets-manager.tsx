'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { replySupportTicketAction, updateSupportTicketStatusAction } from '@/actions/resellers';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import {
  ConfirmDialog,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  EmptyState,
  StatusBadge,
  TableFrame,
} from '@components/shared';
import { Button } from '@components/ui/button';
import { Dropdown, type DropdownEntry } from '@components/ui/dropdown';
import { Select } from '@components/ui/select';
import { Textarea } from '@components/ui/textarea';
import { TICKET_STATUS_LABELS, TICKET_STATUS_TRANSITIONS, type TicketStatus } from '@lib/constants';
import { toast } from '@lib/toast';
import { formatStoreDateTime } from '@lib/utils';

export type AdminTicketRow = {
  id: string;
  ticketNumber: string;
  resellerId: string;
  shopName: string;
  subject: string;
  category: string;
  priority: string;
  status: TicketStatus;
  orderNumber?: string;
  messages: {
    senderRole: 'reseller' | 'admin';
    senderName: string;
    message: string;
    createdAt: string;
  }[];
  lastReplyAt: string;
};

function ticketStatusTone(status: TicketStatus): 'ok' | 'info' | 'warn' | 'neutral' {
  if (status === 'resolved') return 'ok';
  if (status === 'in_progress') return 'info';
  if (status === 'closed') return 'neutral';
  return 'warn';
}

function priorityTone(priority: string): string {
  const p = priority.toLowerCase();
  if (p === 'high') return 'bg-rose-500/15 text-rose-500';
  if (p === 'medium') return 'bg-amber-500/15 text-amber-500';
  return 'bg-well text-muted';
}

const STATUS_ACTION_ICONS: Record<TicketStatus, IconRegistryKey> = {
  open: 'inbox',
  in_progress: 'clock',
  resolved: 'checkCircle',
  closed: 'cancelCircle',
};

export function TicketsManager({ items }: { items: AdminTicketRow[] }) {
  const router = useRouter();
  const [activeTicketId, setActiveTicketId] = React.useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = React.useState<{
    ticket: AdminTicketRow;
    status: TicketStatus;
  } | null>(null);
  const [replyText, setReplyText] = React.useState<Record<string, string>>({});
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const activeTicket = React.useMemo(
    () => items.find((t) => t.id === activeTicketId) ?? null,
    [items, activeTicketId],
  );

  async function onReply(ticketId: string) {
    const msg = replyText[ticketId]?.trim();
    if (!msg) return toast.error('Enter a reply message.');
    setBusyId(ticketId);
    const res = await replySupportTicketAction(ticketId, msg);
    setBusyId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success('Reply sent');
    setReplyText((prev) => ({ ...prev, [ticketId]: '' }));
    router.refresh();
  }

  async function onConfirmStatusChange() {
    if (!pendingStatusChange) return;
    const { ticket, status } = pendingStatusChange;
    setBusyId(ticket.id);
    const res = await updateSupportTicketStatusAction(ticket.id, status);
    setBusyId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success('Ticket status updated');
    setPendingStatusChange(null);
    router.refresh();
  }

  function buildDropdownItems(t: AdminTicketRow): DropdownEntry[] {
    const allowedTransitions = TICKET_STATUS_TRANSITIONS[t.status] ?? [];
    const statusItems: DropdownEntry[] = allowedTransitions.map((s) => ({
      label: s === 'closed' ? 'Close Ticket' : `Mark ${TICKET_STATUS_LABELS[s]}`,
      icon: STATUS_ACTION_ICONS[s],
      destructive: s === 'closed',
      disabled: busyId === t.id,
      onClick: () => setPendingStatusChange({ ticket: t, status: s }),
    }));

    const baseItems: DropdownEntry[] = [
      {
        label: 'View & Reply',
        icon: 'eye',
        onClick: () => setActiveTicketId(t.id),
      },
      {
        label: 'View Reseller',
        icon: 'store',
        onClick: () => router.push(`/admin/resellers/${t.resellerId}`),
      },
    ];

    if (statusItems.length === 0) return baseItems;

    return [
      ...baseItems,
      { type: 'separator' },
      { type: 'label', label: 'Change Status' },
      ...statusItems,
    ];
  }

  return (
    <>
      <TableFrame>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-line bg-well/60 text-muted border-b text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Ticket</th>
                <th className="px-4 py-3 font-semibold">Reseller</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      compact
                      title="No support tickets found"
                      description="Tickets opened by resellers will show up here."
                    />
                  </td>
                </tr>
              )}
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-well/40 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setActiveTicketId(t.id)}
                      className="text-left hover:underline"
                    >
                      <div className="text-ink font-semibold">{t.subject}</div>
                      <div className="text-muted mt-0.5 flex items-center gap-2 text-xs">
                        <span className="font-mono">{t.ticketNumber}</span>
                        {t.orderNumber ? <span>· Order {t.orderNumber}</span> : null}
                        <span>
                          · {t.messages.length} {t.messages.length === 1 ? 'message' : 'messages'}
                        </span>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/resellers/${t.resellerId}`}
                      className="text-ink font-medium hover:underline"
                    >
                      {t.shopName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">{t.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${priorityTone(t.priority)}`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={ticketStatusTone(t.status)}
                      label={TICKET_STATUS_LABELS[t.status]}
                    />
                  </td>
                  <td className="text-muted px-4 py-3 text-xs whitespace-nowrap">
                    {formatStoreDateTime(t.lastReplyAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Dropdown align="end" items={buildDropdownItems(t)}>
                      <Button variant="ghost" size="icon-sm" aria-label="Actions">
                        <Icon name="more" size={16} />
                      </Button>
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableFrame>

      <Drawer open={!!activeTicket} onOpenChange={(open) => !open && setActiveTicketId(null)}>
        <DrawerContent>
          {activeTicket && (
            <div className="flex h-full flex-col">
              <DrawerHeader
                title={
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{activeTicket.subject}</span>
                    <StatusBadge
                      status={ticketStatusTone(activeTicket.status)}
                      label={TICKET_STATUS_LABELS[activeTicket.status]}
                    />
                  </div>
                }
                description={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono">{activeTicket.ticketNumber}</span>
                    <span>·</span>
                    <Link
                      href={`/admin/resellers/${activeTicket.resellerId}`}
                      className="text-ink underline"
                    >
                      {activeTicket.shopName}
                    </Link>
                    <span>·</span>
                    <span className="capitalize">{activeTicket.category}</span>
                    {activeTicket.orderNumber ? (
                      <>
                        <span>·</span>
                        <span>Order {activeTicket.orderNumber}</span>
                      </>
                    ) : null}
                    <span>·</span>
                    <span className="uppercase">{activeTicket.priority}</span>
                  </span>
                }
              />

              <DrawerBody className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted text-xs font-medium uppercase">Status</span>
                  <Select
                    size="sm"
                    className="w-44"
                    align="end"
                    aria-label="Ticket status"
                    disabled={
                      busyId === activeTicket.id ||
                      (TICKET_STATUS_TRANSITIONS[activeTicket.status]?.length ?? 0) === 0
                    }
                    value={activeTicket.status}
                    items={[
                      activeTicket.status,
                      ...(TICKET_STATUS_TRANSITIONS[activeTicket.status] ?? []),
                    ].map((s) => ({
                      value: s,
                      label: TICKET_STATUS_LABELS[s],
                      icon: STATUS_ACTION_ICONS[s],
                    }))}
                    onValueChange={(next) => {
                      const nextStatus = next as TicketStatus;
                      if (nextStatus !== activeTicket.status) {
                        setPendingStatusChange({ ticket: activeTicket, status: nextStatus });
                      }
                    }}
                  />
                </div>

                <div className="bg-well/50 space-y-2.5 rounded-xl p-3">
                  {activeTicket.messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg px-3 py-2 text-xs ${
                        m.senderRole === 'admin' ? 'bg-brand/10 ml-6' : 'bg-surface mr-6'
                      }`}
                    >
                      <div className="flex justify-between gap-2 font-semibold">
                        <span>
                          {m.senderName} ({m.senderRole})
                        </span>
                        <span className="text-muted shrink-0 font-normal">
                          {formatStoreDateTime(m.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{m.message}</p>
                    </div>
                  ))}
                </div>
              </DrawerBody>

              {activeTicket.status !== 'closed' && activeTicket.status !== 'resolved' ? (
                <DrawerFooter className="flex-col items-stretch gap-2.5">
                  <Textarea
                    rows={3}
                    placeholder="Write a reply to the reseller…"
                    value={replyText[activeTicket.id] ?? ''}
                    onChange={(e) =>
                      setReplyText((prev) => ({ ...prev, [activeTicket.id]: e.target.value }))
                    }
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setActiveTicketId(null)}>
                      Close
                    </Button>
                    <Button
                      variant="primary"
                      disabled={busyId === activeTicket.id}
                      onClick={() => onReply(activeTicket.id)}
                    >
                      Send Reply
                    </Button>
                  </div>
                </DrawerFooter>
              ) : (
                <DrawerFooter className="justify-between">
                  <span className="text-muted text-xs">
                    This ticket is {TICKET_STATUS_LABELS[activeTicket.status].toLowerCase()}.
                    Replies are disabled.
                  </span>
                  <Button variant="outline" onClick={() => setActiveTicketId(null)}>
                    Close
                  </Button>
                </DrawerFooter>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={!!pendingStatusChange}
        onOpenChange={(open) => !open && setPendingStatusChange(null)}
        tone={
          pendingStatusChange?.status === 'closed'
            ? 'danger'
            : pendingStatusChange?.status === 'resolved'
              ? 'success'
              : pendingStatusChange?.status === 'open'
                ? 'warning'
                : 'info'
        }
        icon={pendingStatusChange ? STATUS_ACTION_ICONS[pendingStatusChange.status] : undefined}
        title={
          pendingStatusChange
            ? pendingStatusChange.status === 'closed'
              ? `Close ticket ${pendingStatusChange.ticket.ticketNumber}?`
              : `Mark ${pendingStatusChange.ticket.ticketNumber} as ${TICKET_STATUS_LABELS[pendingStatusChange.status]}?`
            : undefined
        }
        description={
          pendingStatusChange
            ? pendingStatusChange.status === 'closed'
              ? `“${pendingStatusChange.ticket.subject}” from ${pendingStatusChange.ticket.shopName} will be closed and replies will be disabled.`
              : `Change status of “${pendingStatusChange.ticket.subject}” from ${TICKET_STATUS_LABELS[pendingStatusChange.ticket.status]} to ${TICKET_STATUS_LABELS[pendingStatusChange.status]}.`
            : undefined
        }
        confirmLabel={
          pendingStatusChange
            ? pendingStatusChange.status === 'closed'
              ? 'Close Ticket'
              : `Mark ${TICKET_STATUS_LABELS[pendingStatusChange.status]}`
            : 'Confirm'
        }
        loading={!!pendingStatusChange && busyId === pendingStatusChange.ticket.id}
        autoClose={false}
        onConfirm={onConfirmStatusChange}
      />
    </>
  );
}
