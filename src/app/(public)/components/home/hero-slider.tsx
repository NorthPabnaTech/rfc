'use client';

import * as React from 'react';

import { BannerCard, type BannerContent } from '@/features/promotions/banner-card';
import { Icon } from '@components/icon/icon';
import { cn } from '@lib/utils';

const INTERVAL_MS = 6000;

/**
 * Auto-rotating hero carousel: arrows, dots, swipe; pauses on hover/focus and
 * respects reduced-motion (no auto-advance).
 */
export function HeroSlider({ slides }: { slides: (BannerContent & { id: string })[] }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const touchX = React.useRef<number | null>(null);
  const count = slides.length;
  const go = React.useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  React.useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => go(index + 1), INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [index, paused, count, go]);

  return (
    <div
      className="relative h-full overflow-hidden rounded-2xl"
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        if (start != null && end != null && Math.abs(end - start) > 40)
          go(index + (end < start ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div
        className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="h-full w-full shrink-0"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            inert={i !== index}
          >
            <BannerCard
              {...s}
              size="xl"
              priority={i === 0}
              sizes="(min-width: 1024px) 66vw, 100vw"
              className="h-full rounded-none"
            />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          {(['prev', 'next'] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => go(index + (dir === 'next' ? 1 : -1))}
              aria-label={dir === 'next' ? 'Next banner' : 'Previous banner'}
              className={cn(
                'text-ink absolute top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-md transition hover:bg-white sm:grid',
                dir === 'prev' ? 'left-3' : 'right-3',
              )}
            >
              <Icon name={dir === 'next' ? 'chevRight' : 'chevLeft'} size={18} />
            </button>
          ))}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show banner ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === index ? 'bg-brand-400 w-6' : 'w-2 bg-white/60 hover:bg-white',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
