'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useI18n } from '@/i18n/provider';
import { Icon } from '@components/icon/icon';
import { Callout } from '@components/shared';
import { Button } from '@components/ui/button';
import { toast } from '@lib/toast';
import { cn } from '@lib/utils';

export default function VerifyEmailPage() {
  return (
    <React.Suspense>
      <Verify />
    </React.Suspense>
  );
}

function Verify() {
  const { t, num } = useI18n();
  const email = useSearchParams().get('email') || 'you@example.com';
  const [digits, setDigits] = React.useState<string[]>(Array(6).fill(''));
  const [seconds, setSeconds] = React.useState(45);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState(false);
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  React.useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [seconds]);

  const setAt = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length > 1) {
      // Pasted code
      const next = clean.slice(0, 6).split('');
      setDigits([...next, ...Array(6 - next.length).fill('')]);
      refs.current[Math.min(5, next.length)]?.focus();
      return;
    }
    setDigits((d) => d.map((x, j) => (j === i ? clean : x)));
    setError(false);
    if (clean && i < 5) refs.current[i + 1]?.focus();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (digits.join('').length !== 6) {
      setError(true);
      return;
    }
    setDone(true);
  };

  return (
    <div>
      <span className="bg-brand-soft text-brand-ink grid size-12 place-items-center rounded-2xl">
        <Icon name="mail" size={22} />
      </span>
      <h1 className="type-page-title text-ink mt-5">{t('auth.verifyTitle')}</h1>
      <p className="type-body text-muted mt-1.5">{t('auth.verifySubtitle', { email })}</p>
      {done ? (
        <div className="mt-7 space-y-4">
          <Callout tone="success" description={t('auth.verified')} />
          <Button variant="primary" asChild className="w-full">
            <Link href="/login">{t('auth.signIn')}</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-7">
          <label className="type-label text-ink">{t('auth.verifyCode')}</label>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus();
                }}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={6}
                aria-label={`${t('auth.verifyCode')} ${i + 1}`}
                className={cn(
                  'num border-line bg-panel text-ink focus:border-accent focus:ring-accent h-14 w-full rounded-xl border text-center text-xl font-bold outline-none focus:ring-1',
                  error && 'border-red-500',
                )}
              />
            ))}
          </div>
          {error && (
            <p className="type-helper mt-2 text-[var(--status-danger-fg)]">
              {t('common.required')}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" className="mt-5 w-full">
            {t('auth.verify')}
          </Button>
          <div className="mt-4 text-center text-sm">
            {seconds > 0 ? (
              <span className="text-muted num">{t('auth.resendIn', { s: num(seconds) })}</span>
            ) : (
              <button
                type="button"
                className="text-accent font-semibold hover:underline"
                onClick={() => {
                  setSeconds(45);
                  toast.info(t('auth.demoNotice'));
                }}
              >
                {t('auth.resend')}
              </button>
            )}
          </div>
        </form>
      )}
      <Callout tone="neutral" compact className="mt-5" description={t('auth.demoNotice')} />
    </div>
  );
}
