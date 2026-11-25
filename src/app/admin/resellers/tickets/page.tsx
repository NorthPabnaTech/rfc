import type { Metadata } from 'next';

import { getAdminTicketCounts, listAdminSupportTickets } from '@/services/resellers';
import { PageHeader } from '@components/shared';
import { requireAdminPage } from '@lib/auth/current-user';
import { TICKET_STATUS_LABELS, TICKET_STATUSES, type TicketStatus } from '@lib/constants';
import { param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../../components/list-toolbar';
import { TicketStatusCards } from './components/ticket-status-cards';
import { TicketsManager } from './components/tickets-manager';

export const metadata: Metadata = { title: 'Reseller Support Tickets' };

export default async function AdminResellerTicketsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const rawStatus = param(sp, 'status') as TicketStatus | undefined;
  const status = rawStatus && TICKET_STATUSES.includes(rawStatus) ? rawStatus : undefined;

  const [docs, counts] = await Promise.all([
    listAdminSupportTickets(status),
    getAdminTicketCounts(),
  ]);
  const items = docs.map((t) => {
    const r = t.reseller as unknown as { _id?: unknown; shopName?: string } | null;
    return {
      id: String(t._id),
      ticketNumber: t.ticketNumber,
      resellerId: r?._id ? String(r._id) : String(t.reseller),
      shopName: r?.shopName ?? 'Reseller',
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      orderNumber: t.orderNumber,
      messages: t.messages.map((m) => ({
        senderRole: m.senderRole,
        senderName: m.senderName,
        message: m.message,
        createdAt: m.createdAt.toISOString(),
      })),
      lastReplyAt: t.lastReplyAt.toISOString(),
    };
  });

  return (
    <>
      <PageHeader
        title="Reseller Support Tickets"
        description="View and reply to support tickets submitted from the reseller portal."
      />
      <TicketStatusCards counts={counts} />
      <ListToolbar
        filters={[
          {
            name: 'status',
            label: 'Status',
            options: TICKET_STATUSES.map((s) => ({ value: s, label: TICKET_STATUS_LABELS[s] })),
          },
        ]}
      />
      <TicketsManager items={items} />
    </>
  );
}
