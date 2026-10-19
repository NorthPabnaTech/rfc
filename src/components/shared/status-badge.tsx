import { Badge, type BadgeProps } from '@components/ui/badge';
import { cn } from '@lib/utils';

type Status = 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'locked';

const DOT: Record<Status, string> = {
  ok: 'bg-[var(--status-ok-dot)]',
  warn: 'bg-[var(--status-warn-dot)]',
  danger: 'bg-[var(--status-danger-dot)]',
  info: 'bg-[var(--status-info-dot)]',
  neutral: 'bg-subtle',
  locked: 'bg-indigo-500',
};

const TONE: Record<Status, BadgeProps['tone']> = {
  ok: 'ok',
  warn: 'warn',
  danger: 'danger',
  info: 'info',
  neutral: 'neutral',
  locked: 'locked',
};

export function StatusBadge({ status, label }: { status: Status; label: string }) {
  return (
    <Badge tone={TONE[status]}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[status])} aria-hidden />
      {label}
    </Badge>
  );
}
