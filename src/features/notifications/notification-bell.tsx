'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import {
  authorizeRealtimeAction,
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationsSeenAction,
} from '@/actions/notifications';
import type { NotificationDTO, NotificationFeedDTO } from '@/types';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { Dropdown } from '@components/ui/dropdown';
import {
  NOTIFICATION_EVENT,
  NOTIFICATION_LIST_LIMIT,
  NOTIFICATION_POLL_MS,
  type NotificationType,
} from '@lib/constants';
import { userChannel } from '@lib/realtime/channels';
import { toast } from '@lib/toast';
import { cn, formatRelative } from '@lib/utils';

type Props = {
  userId: string;
  initial: NotificationFeedDTO;
  /** Pusher key + cluster; `null` falls back to polling. */
  realtime: { key: string; cluster: string } | null;
  /** `light` = icon for dark (noir) headers; `dark` = for light headers. */
  tone?: 'light' | 'dark';
  className?: string;
};

const TYPE_ICON: Record<NotificationType, IconRegistryKey> = {
  order_placed: 'bag',
  order_cancelled: 'cancelCircle',
  order_status: 'shipping',
};

/**
 * Notification bell: badge = unseen count. Opening the panel marks all as
 * seen; clicking a notification marks it read and opens its link. New
 * notifications arrive live over Pusher (or by polling without it).
 */
export function NotificationBell({ userId, initial, realtime, tone = 'dark', className }: Props) {
  const router = useRouter();
  const [items, setItems] = React.useState<NotificationDTO[]>(initial.items);
  const [unseen, setUnseen] = React.useState(initial.unseen);
  const [open, setOpen] = React.useState(false);
  const openRef = React.useRef(open);
  React.useEffect(() => {
    openRef.current = open;
  }, [open]);

  const refresh = React.useCallback(async () => {
    const res = await getNotificationsAction();
    if (!res.ok) return;
    setItems(res.data.items);
    setUnseen(openRef.current ? 0 : res.data.unseen);
  }, []);

  // Live push over Pusher.
  React.useEffect(() => {
    if (!realtime) return;
    let cancelled = false;
    let cleanup = () => {};
    void import('pusher-js').then(({ default: Pusher }) => {
      if (cancelled) return;
      const pusher = new Pusher(realtime.key, {
        cluster: realtime.cluster,
        channelAuthorization: {
          customHandler: ({ socketId, channelName }, callback) => {
            authorizeRealtimeAction({ socketId, channelName }).then(
              (res) => (res.ok ? callback(null, res.data) : callback(new Error(res.error), null)),
              (err: Error) => callback(err, null),
            );
          },
        },
      });
      const channel = pusher.subscribe(userChannel(userId));
      channel.bind(NOTIFICATION_EVENT, (n: NotificationDTO) => {
        setItems((prev) =>
          [n, ...prev.filter((p) => p.id !== n.id)].slice(0, NOTIFICATION_LIST_LIMIT),
        );
        if (openRef.current) void markNotificationsSeenAction();
        else setUnseen((c) => c + 1);
        toast.info(n.title, { description: n.body });
        router.refresh();
      });
      cleanup = () => {
        channel.unbind_all();
        pusher.unsubscribe(userChannel(userId));
        pusher.disconnect();
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [realtime, userId, router]);

  // Without realtime, poll; either way, catch up when the tab regains focus.
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = realtime ? null : window.setInterval(onVisible, NOTIFICATION_POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timer) window.clearInterval(timer);
    };
  }, [realtime, refresh]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && unseen > 0) {
      setUnseen(0);
      setItems((prev) => prev.map((n) => ({ ...n, seen: true })));
      void markNotificationsSeenAction();
    }
  };

  const onSelect = (n: NotificationDTO) => {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true, seen: true } : p)));
      void markNotificationReadAction(n.id);
    }
    router.push(n.link);
  };

  const onReadAll = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true, seen: true })));
    void markAllNotificationsReadAction();
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <Dropdown
      align="end"
      width="min(380px, calc(100vw - 2rem))"
      open={open}
      onOpenChange={onOpenChange}
      content={
        <div className="flex max-h-[min(480px,70dvh)] flex-col">
          <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3">
            <p className="type-card-title text-ink">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={onReadAll}
                className="type-helper text-accent hover:text-accent-hover focus-ring rounded font-semibold"
              >
                Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="text-muted flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Icon name="inbox" size={28} className="text-subtle" />
              <p className="type-body">No notifications yet</p>
            </div>
          ) : (
            <ul className="overflow-y-auto py-1">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(n)}
                    className={cn(
                      'hover:bg-well flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                      !n.read && 'bg-brand-soft/60',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-full',
                        n.read ? 'bg-well text-muted' : 'bg-brand text-brand-contrast',
                      )}
                    >
                      <Icon name={TYPE_ICON[n.type]} size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'type-label block',
                          n.read ? 'text-muted font-medium' : 'text-ink',
                        )}
                      >
                        {n.title}
                      </span>
                      <span className="type-helper text-muted mt-0.5 block">{n.body}</span>
                      <span className="type-caption text-subtle mt-1 block">
                        {formatRelative(n.createdAt)}
                      </span>
                    </span>
                    {!n.read && (
                      <span
                        aria-label="Unread"
                        className="bg-brand mt-1.5 size-2 shrink-0 rounded-full"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      }
    >
      <button
        type="button"
        aria-label={unseen > 0 ? `Notifications (${unseen} new)` : 'Notifications'}
        className={cn(
          'focus-ring relative grid size-10 shrink-0 place-items-center rounded-xl transition-colors',
          tone === 'light'
            ? 'text-white/90 hover:bg-white/8 hover:text-white'
            : 'text-ink hover:bg-well',
          className,
        )}
      >
        <Icon name="bell" size={22} />
        {unseen > 0 && (
          <span className="absolute top-0.5 right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--status-danger-dot)] px-1 text-[10px] leading-none font-bold text-white">
            {unseen > 99 ? '99+' : unseen}
          </span>
        )}
      </button>
    </Dropdown>
  );
}
