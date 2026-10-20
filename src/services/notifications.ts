import 'server-only';

import { connectDB, type Notification, NotificationModel, type Order, UserModel } from '@/database';
import type { NotificationDTO, NotificationFeedDTO } from '@/types';
import {
  NOTIFICATION_EVENT,
  NOTIFICATION_LIST_LIMIT,
  type NotificationType,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from '@lib/constants';
import { publishToUsers } from '@lib/realtime/server';
import { formatBDT, logger } from '@lib/utils';

type NewNotification = {
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  orderId?: string;
};

function toNotification(n: Notification): NotificationDTO {
  return {
    id: String(n._id),
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    seen: Boolean(n.seenAt),
    read: Boolean(n.readAt),
    createdAt: new Date(n.createdAt).toISOString(),
  };
}

/**
 * Stores one notification per recipient and pushes each live. Never throws —
 * a notification problem must not fail the order that triggered it.
 */
async function notify(userIds: string[], n: NewNotification): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await connectDB();
    const docs = await NotificationModel.insertMany(
      userIds.map((user) => ({
        user,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        order: n.orderId ?? null,
      })),
    );
    // Each recipient gets their own document (own id + seen/read state).
    await Promise.all(
      docs.map((d) =>
        publishToUsers([String(d.user)], NOTIFICATION_EVENT, toNotification(d.toObject())),
      ),
    );
  } catch (error) {
    logger.error('Failed to send notification:', error);
  }
}

async function adminIds(): Promise<string[]> {
  await connectDB();
  const admins = await UserModel.find({ role: 'admin', isActive: true }, { _id: 1 }).lean();
  return admins.map((a) => String(a._id));
}

/* ─── Order events ───────────────────────────────────────────────────────── */

/** An order document, or just the fields the messages need (ids as strings). */
type OrderRef = {
  _id: Order['_id'] | string;
  orderNumber: string;
  customer: { name: string };
  total: number;
  user?: Order['user'] | string | null;
};

export async function notifyAdminsOrderPlaced(order: OrderRef): Promise<void> {
  await notify(await adminIds(), {
    type: 'order_placed',
    title: `New order #${order.orderNumber}`,
    body: `${order.customer.name} placed an order of ${formatBDT(order.total)}.`,
    link: `/admin/orders/${order._id}`,
    orderId: String(order._id),
  });
}

export async function notifyAdminsOrderCancelled(order: OrderRef): Promise<void> {
  await notify(await adminIds(), {
    type: 'order_cancelled',
    title: `Order #${order.orderNumber} cancelled`,
    body: `${order.customer.name} cancelled their order.`,
    link: `/admin/orders/${order._id}`,
    orderId: String(order._id),
  });
}

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Your order has been confirmed and will be prepared soon.',
  processing: 'Your order is being packed.',
  shipped: 'Your order is on its way.',
  delivered: 'Your order has been delivered. Enjoy!',
  completed: 'Your order is complete. Thank you for shopping with us!',
  cancelled: 'Your order has been cancelled.',
  returned: 'Your order has been marked as returned.',
};

/** Tells the customer who owns the order (guest orders have no account). */
export async function notifyCustomerOrderStatus(
  order: OrderRef,
  status: OrderStatus,
): Promise<void> {
  if (!order.user) return;
  await notify([String(order.user)], {
    type: 'order_status',
    title: `Order #${order.orderNumber}: ${ORDER_STATUS_LABELS[status]}`,
    body: STATUS_MESSAGES[status] ?? `Your order is now ${ORDER_STATUS_LABELS[status]}.`,
    link: `/account/orders/${order._id}`,
    orderId: String(order._id),
  });
}

/* ─── The bell ───────────────────────────────────────────────────────────── */

export async function getNotificationFeed(userId: string): Promise<NotificationFeedDTO> {
  await connectDB();
  const [items, unseen] = await Promise.all([
    NotificationModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(NOTIFICATION_LIST_LIMIT)
      .lean(),
    NotificationModel.countDocuments({ user: userId, seenAt: null }),
  ]);
  return { items: items.map(toNotification), unseen };
}

/** Opening the bell marks everything as seen (clears the badge). */
export async function markNotificationsSeen(userId: string): Promise<void> {
  await connectDB();
  await NotificationModel.updateMany(
    { user: userId, seenAt: null },
    { $set: { seenAt: new Date() } },
  );
}

/** Clicking a notification marks it read (and seen). */
export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await connectDB();
  const now = new Date();
  // A pipeline update keeps the first read/seen time instead of overwriting it.
  await NotificationModel.updateOne(
    { _id: id, user: userId },
    [{ $set: { readAt: { $ifNull: ['$readAt', now] }, seenAt: { $ifNull: ['$seenAt', now] } } }],
    { updatePipeline: true },
  );
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await connectDB();
  const now = new Date();
  await NotificationModel.updateMany(
    { user: userId, readAt: null },
    [{ $set: { readAt: now, seenAt: { $ifNull: ['$seenAt', now] } } }],
    { updatePipeline: true },
  );
}
