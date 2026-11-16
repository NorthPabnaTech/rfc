'use client';

import * as React from 'react';

import { useHydrated } from '@hooks/use-hydrated';
import { cn } from '@lib/utils';

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

function computeTimeLeft(targetMs: number, nowMs: number): TimeLeft {
  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, expired: false };
}

export function CountdownTimer({
  endsAt,
  tone = 'dark',
  className,
}: {
  endsAt: string;
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const hydrated = useHydrated();
  const targetMs = React.useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!hydrated) return null;
  const left = computeTimeLeft(targetMs, nowMs);
  if (left.expired) return null;

  const units = [
    { label: 'Days', value: left.days },
    { label: 'Hrs', value: left.hours },
    { label: 'Min', value: left.minutes },
    { label: 'Sec', value: left.seconds },
  ];

  return (
    <div className={cn('inline-flex items-center gap-1.5 sm:gap-2', className)}>
      {units.map((u) => (
        <div
          key={u.label}
          className={cn(
            'flex min-w-[44px] flex-col items-center rounded-xl px-2 py-1.5 text-center tabular-nums sm:min-w-[52px]',
            tone === 'dark'
              ? 'border border-white/15 bg-white/10 text-white backdrop-blur-xs'
              : 'border-line bg-cream text-ink border',
          )}
        >
          <span className="text-sm leading-none font-bold sm:text-base">
            {String(u.value).padStart(2, '0')}
          </span>
          <span
            className={cn(
              'mt-0.5 text-[9px] font-medium uppercase tracking-wider',
              tone === 'dark' ? 'text-white/70' : 'text-muted',
            )}
          >
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}
