'use client';

import * as React from 'react';

import { IS_PROD, SITE } from '@config/site';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * Loading primitives — intentionally TWO separate loaders for two purposes:
 *
 *   LoadingScreen  → full-app / route loading. A "radar" mark (ripple rings +
 *                    spinning orbit + pulsing core), the app name and message.
 *   WithLoader     → a slice of UI loading (data fetch). A compact "equalizer"
 *                    loader on a surface, with a "Loading" label.
 *
 * They share nothing visual on purpose, so the two states read differently.
 * `Spinner` is a small inline arc for buttons / tight spots.
 * ──────────────────────────────────────────────────────────────────────── */

type Size = 'sm' | 'md' | 'lg';

/* ─── AnimatedDots — three bobbing dots, staggered ───────────────────────── */

function AnimatedDots({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('inline-flex items-end gap-[3px]', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="loader-dot inline-block h-[3px] w-[3px] rounded-full bg-current"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

/* ─── Spinner — tapered gradient arc (inline / buttons) ──────────────────── */

const SPINNER_PX: Record<Size, number> = { sm: 14, md: 18, lg: 28 };

export function Spinner({ size = 'lg', className }: { size?: Size | number; className?: string }) {
  const px = typeof size === 'number' ? size : SPINNER_PX[size];
  const gid = React.useId();
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
      className={cn('spinner-arc text-brand shrink-0', className)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.12" />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        stroke={`url(#${gid})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * App loader — "radar" mark + name + message. Used for full-route loading.
 * ═══════════════════════════════════════════════════════════════════════ */

function RadarMark() {
  return (
    <div className="relative grid h-[72px] w-[72px] place-items-center">
      {/* expanding ripple rings */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="loader-ripple absolute inset-0"
          style={{ animationDelay: `${i * 0.6}s` }}
        />
      ))}
      {/* spinning orbit */}
      <span aria-hidden="true" className="brand-orbit absolute h-12 w-12" />
    </div>
  );
}

export function LoadingScreen({
  label = 'Preparing your workspace',
  tagline = SITE.tagline,
  className,
}: {
  label?: string;
  tagline?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'bg-surface flex min-h-full w-full flex-col items-center overflow-y-auto px-6 py-10',
        className,
      )}
    >
      {/* centered loader + info */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <RadarMark />

        <h1 className="text-ink mt-6 text-[20px] font-semibold tracking-tight">{SITE.shortName}</h1>
        <p className="text-muted mt-1.5 max-w-xs text-[12.5px] leading-relaxed">{tagline}</p>

        {/* static status */}
        <p className="text-subtle mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium">
          {label}
          <AnimatedDots />
        </p>

        {/* indeterminate shimmer */}
        <span className="loader-track mt-4 block h-[3px] w-[180px]" aria-hidden="true" />

        {/* quick system facts */}
        <dl className="text-subtle mt-6 flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="bg-well rounded px-1.5 py-0.5 font-medium">v{SITE.version}</span>
          </div>
          <span className="bg-line h-3 w-px" aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <span className="loader-core inline-block h-1.5 w-1.5" />
            {IS_PROD ? 'Production' : 'Development'}
          </div>
          <span className="bg-line h-3 w-px" aria-hidden="true" />
          <span className="font-mono">{SITE.defaultLocale}</span>
        </dl>
      </div>
      <span className="sr-only">Loading {SITE.name}</span>
    </div>
  );
}

/* ─── WithLoader — wrap a data region; show the section loader while loading ─
 * Its one job: during a fetch, swap a slice of the page for the section loader
 * (on a surface so the area reads as "loading"), then reveal the content. No
 * overlay/variant — for full-route loading use <LoadingScreen>, for inline
 * spots use <Spinner>. */

export type WithLoaderProps = {
  loading: boolean;
  children?: React.ReactNode;
  label?: string;
  /** Draw the soft surface (bg + border) behind the loader. Default true. */
  surface?: boolean;
  /** Min height so the swap doesn't collapse / jump the layout. */
  minHeight?: number | string;
  className?: string;
};

export function WithLoader({
  loading,
  children,
  label = 'Loading',
  surface = true,
  minHeight = 200,
  className,
}: WithLoaderProps) {
  if (!loading && children) {
    return <>{children}</>;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={loading}
      style={{ minHeight }}
      className={cn(
        'relative grid w-full place-items-center overflow-hidden transition-all duration-300',
        surface && 'bg-panel/50 border-line/50 rounded-xl border backdrop-blur-md',
        className,
      )}
    >
      <div className="relative flex flex-col items-center gap-5 p-6 select-none">
        {/* Modern Spinner Design */}
        <div className="relative flex h-12 w-12 items-center justify-center">
          {/* Subtle outer accent pulse glow */}
          <div className="bg-accent/5 absolute inset-0 scale-125 animate-pulse rounded-full duration-1000" />
          {/* Smooth conic-gradient loader ring */}
          <div className="loader-ring absolute inset-1.5" />
        </div>

        {/* Text indicators */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-ink text-[11px] font-semibold tracking-widest uppercase opacity-80">
            {label}
          </span>
          <AnimatedDots className="text-subtle/80" />
        </div>
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
}
