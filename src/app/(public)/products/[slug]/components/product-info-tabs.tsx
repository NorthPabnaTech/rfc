'use client';

import * as React from 'react';

import { cn } from '@lib/utils';

type Tab = { id: string; label: string; content: React.ReactNode };

function subscribeHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/**
 * Description / Specifications / Reviews / Q&A — underline tabs, all content
 * server-rendered. A URL hash (#reviews, #questions) opens that tab.
 */
export function ProductInfoTabs({ tabs }: { tabs: Tab[] }) {
  const hash = React.useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => '',
  );
  const [picked, setPicked] = React.useState<string | null>(null);
  const fromHash = tabs.some((t) => t.id === hash) ? hash : null;
  const active = picked ?? fromHash ?? tabs[0]?.id;

  return (
    <div>
      <div
        role="tablist"
        className="border-line scrollbar-hidden flex gap-8 overflow-x-auto border-b"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setPicked(t.id)}
            className={cn(
              '-mb-px shrink-0 border-b-2 pb-3.5 text-[15px] font-semibold transition-colors',
              active === t.id
                ? 'border-noir text-ink'
                : 'text-muted hover:text-ink border-transparent',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          id={`panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${t.id}`}
          hidden={active !== t.id}
          className="pt-8"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
