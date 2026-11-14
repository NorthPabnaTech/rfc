'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';

import {
  authorizeRealtimeAction,
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/actions/notifications';
import type { NotificationDTO, NotificationFeedDTO } from '@/types';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { Dropdown } from '@components/ui/dropdown';
import {
  NOTIFICATION_EVENT,
  NOTIFICATION_LIST_LIMIT,
  NOTIFICATION_POLL_MS,
  NOTIFICATION_SOUND,
  type NotificationType,
} from '@lib/constants';
import { userChannel } from '@lib/realtime/channels';
import { toast } from '@lib/toast';
import { cn, formatRelative } from '@lib/utils';

import { usePushNotifications } from './use-push-notifications';

type Props = {
  userId: string;
  initial: NotificationFeedDTO;
  /** Pusher key + cluster; `null` falls back to polling. */
  realtime: { key: string; cluster: string } | null;
  /** VAPID public key for system notifications; `null` hides the option. */
  pushKey: string | null;
  /** `light` = icon for dark (noir) headers; `dark` = for light headers. */
  tone?: 'light' | 'dark';
  className?: string;
};

const TYPE_ICON: Record<NotificationType, IconRegistryKey> = {
  order_placed: 'bag',
  order_cancelled: 'cancelCircle',
  order_status: 'shipping',
  new_review: 'star',
  new_question: 'question',
  question_answered: 'question',
};

function showDesktopNotification(n: NotificationDTO, onOpen: (link: string) => void) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const notif = new Notification(n.title, {
      body: n.body,
      icon: '/icon.png',
      tag: n.id,
    });
    notif.onclick = () => {
      window.focus();
      onOpen(n.link);
      notif.close();
    };
  } catch {
    // Mobile browsers require ServiceWorkerRegistration.showNotification
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.ready
        .then((reg) =>
          reg.showNotification(n.title, {
            body: n.body,
            icon: '/icon.png',
            badge: '/icon.png',
            tag: n.id,
            data: { link: n.link },
          }),
        )
        .catch(() => {});
    }
  }
}

/**
 * Plays the notification sound. Browsers only allow audio after the visitor
 * has interacted with the page, so the clip is unlocked (played muted) on the
 * first click / key press; before that a blocked play() is silently ignored
 * and the system notification's own sound covers it.
 */
function useNotificationSound() {
  const audio = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    const unlock = () => {
      audio.current ??= new Audio(NOTIFICATION_SOUND);
      const a = audio.current;
      a.muted = true;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
        })
        .catch(() => {})
        .finally(() => {
          a.muted = false;
        });
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return React.useCallback(() => {
    audio.current ??= new Audio(NOTIFICATION_SOUND);
    audio.current.muted = false;
    audio.current.currentTime = 0;
    void audio.current.play().catch(() => {});
  }, []);
}

/**
 * Notification bell: badge = unseen count. Opening the panel marks all as
 * seen; clicking a notification marks it read and opens its link. New
 * notifications arrive live over Pusher (or by polling without it) and chime.
 */
export function NotificationBell({
  userId,
  initial,
  realtime,
  pushKey,
  tone = 'dark',
  className,
}: Props) {
  const router = useRouter();
  const push = usePushNotifications(pushKey);
  const [enabling, setEnabling] = React.useState(false);
  const [promptDismissed, setPromptDismissed] = React.useState(false);
  const [items, setItems] = React.useState<NotificationDTO[]>(initial.items);
  const [unseen, setUnseen] = React.useState(initial.unseen);
  const [open, setOpen] = React.useState(false);
  const playSound = useNotificationSound();
  // Ids already shown, so a refresh only chimes for genuinely new ones.
  const knownIds = React.useRef(new Set(initial.items.map((n) => n.id)));

  const refresh = React.useCallback(async () => {
    const res = await getNotificationsAction();
    if (!res.ok) return;
    const fresh = res.data.items.filter((n) => !knownIds.current.has(n.id) && !n.read);
    res.data.items.forEach((n) => knownIds.current.add(n.id));
    if (fresh.length > 0) {
      playSound();
      fresh.forEach((n) => {
        showDesktopNotification(n, (link) => router.push(link));
        toast.info(n.title, { description: n.body });
      });
    }
    setItems(res.data.items);
    setUnseen(res.data.unseen);
  }, [playSound, router]);

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
        knownIds.current.add(n.id);
        playSound();
        showDesktopNotification(n, (link) => router.push(link));
        setItems((prev) =>
          [n, ...prev.filter((p) => p.id !== n.id)].slice(0, NOTIFICATION_LIST_LIMIT),
        );
        setUnseen((c) => c + 1);
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
  }, [realtime, userId, router, playSound]);

  // Without realtime, poll even when in another browser tab; catch up when tab regains focus.
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = realtime ? null : window.setInterval(() => void refresh(), NOTIFICATION_POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timer) window.clearInterval(timer);
    };
  }, [realtime, refresh]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
  };

  const onSelect = (n: NotificationDTO) => {
    setOpen(false);
    if (!n.read) {
      setUnseen((c) => Math.max(0, c - 1));
      setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true, seen: true } : p)));
      void markNotificationReadAction(n.id);
    }
    router.push(n.link);
  };

  const onReadAll = () => {
    setUnseen(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true, seen: true })));
    void markAllNotificationsReadAction();
  };

  const dismissPrompt = () => {
    setPromptDismissed(true);
  };

  const onEnablePush = async () => {
    setEnabling(true);
    try {
      await push.enable();
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          toast.success('Push notifications enabled');
        } else if (Notification.permission === 'denied') {
          toast.info(
            'Notifications are blocked by your browser. Tap the lock/settings icon in the address bar → Permissions → Notifications → Allow.',
          );
        }
      }
    } catch {
      toast.error("Couldn't turn on notifications. Please try again.");
    } finally {
      setEnabling(false);
    }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <>
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
          {(push.state === 'default' || push.state === 'denied') && (
            <div className="border-line bg-well flex items-center gap-3 border-b px-4 py-3">
              <Icon name="bell" size={18} className="text-muted shrink-0" />
              <p className="type-helper text-muted min-w-0 flex-1">
                {push.state === 'denied'
                  ? 'System notifications are blocked. Allow them in browser settings, then tap Turn on.'
                  : 'Get system notifications, even when this site is closed.'}
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={enabling}
                onClick={onEnablePush}
              >
                {enabling ? 'Turning on…' : 'Turn on'}
              </Button>
            </div>
          )}
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
    {pushKey && (push.state === 'default' || push.state === 'denied') && !promptDismissed && (
      <div
        role="dialog"
        aria-label="Enable push notifications"
        className="border-line bg-panel shadow-modal fixed right-4 bottom-20 left-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border p-3.5 sm:bottom-5 sm:left-auto"
      >
        <span className="bg-brand/15 text-brand grid size-10 shrink-0 place-items-center rounded-xl">
          <Icon name="bell" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-ink text-xs font-semibold">
            {push.state === 'denied'
              ? 'System notifications are blocked'
              : 'Turn on system notifications'}
          </p>
          <p className="text-muted text-[11px] leading-snug">
            {push.state === 'denied'
              ? 'Allow notifications in browser site settings, then tap Turn on.'
              : 'Get order updates & replies on your phone even when the browser is closed.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button type="button" variant="ghost" size="sm" onClick={dismissPrompt}>
            Later
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={enabling}
            onClick={onEnablePush}
          >
            {enabling ? 'Turning on…' : 'Turn on'}
          </Button>
        </div>
      </div>
    )}
    </>
  );
}
