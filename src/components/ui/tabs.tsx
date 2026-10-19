'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * Tabs — a prop-driven segmented control built on Radix Tabs.
 *
 * Radix owns all selection state (controlled or uncontrolled), roving focus
 * and keyboard navigation, so this is a thin, stateless wrapper: it just maps
 * `items` to styled triggers. The active tab animates its highlight via a CSS
 * transition. Tab panels are optional — omit `content` everywhere and it
 * renders as a pure view-toggle.
 *
 *   // view-toggle (no panels)
 *   <Tabs value={view} onValueChange={setView} items={[
 *     { value: 'list', label: 'List', icon: 'list' },
 *     { value: 'grid', label: 'Grid', icon: 'grid' },
 *   ]} />
 *
 *   // with panels
 *   <Tabs defaultValue="overview" items={[
 *     { value: 'overview', label: 'Overview', content: <Overview /> },
 *     { value: 'activity', label: 'Activity', content: <Activity /> },
 *   ]} />
 * ──────────────────────────────────────────────────────────────────────── */

export type TabItem<V extends string = string> = {
  value: V;
  label?: React.ReactNode;
  icon?: IconRegistryKey;
  disabled?: boolean;
  /** Optional panel rendered below the list when this tab is active. */
  content?: React.ReactNode;
};

export type TabsProps<V extends string = string> = {
  items: TabItem<V>[];
  /** Controlled active value. */
  value?: V;
  /** Initial value when uncontrolled. Defaults to the first item. */
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  /**
   * Visual style. `segmented` (default) is the pill bar; `line` is a SubNav-like
   * underline strip — a hairline under the whole list, the active tab carries a
   * brand bottom border.
   */
  variant?: 'segmented' | 'line';
  /** Control height/typography. Default 'sm'. */
  size?: 'sm' | 'md' | 'lg';
  /** Stretch each tab to equal width and fill the container. */
  fullWidth?: boolean;
  /** Classes for the root wrapper. */
  className?: string;
  /** Classes for the tab list (the segmented bar). */
  listClassName?: string;
  'aria-label'?: string;
};

const SIZES = {
  sm: { tab: 'h-7 px-2.5 text-[12px] gap-1.5', line: 'h-8 px-2.5 text-[12px] gap-1.5', icon: 13 },
  md: { tab: 'h-8 px-3 text-[13px] gap-2', line: 'h-9 px-3 text-[13px] gap-2', icon: 14 },
  lg: { tab: 'h-9 px-3 text-[14px] gap-2', line: 'h-10 px-3 text-[14px] gap-2', icon: 14 },
} as const;

export function Tabs<V extends string = string>({
  items,
  value,
  defaultValue,
  onValueChange,
  variant = 'segmented',
  size = 'sm',
  fullWidth = false,
  className,
  listClassName,
  'aria-label': ariaLabel,
}: TabsProps<V>) {
  const sz = SIZES[size];
  const line = variant === 'line';
  const hasPanels = items.some((it) => it.content != null);

  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      value={value}
      defaultValue={value === undefined ? (defaultValue ?? items[0]?.value) : undefined}
      onValueChange={onValueChange ? (v) => onValueChange(v as V) : undefined}
      className={cn('flex flex-col gap-3', className)}
    >
      <TabsPrimitive.List
        aria-label={ariaLabel}
        data-slot="tabs-list"
        className={cn(
          line
            ? // underline strip — scrolls on overflow, no full-width line
              'flex w-full [scrollbar-width:none] items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
            : 'hairline bg-panel inline-flex w-fit rounded-lg p-0.5',
          fullWidth && 'w-full',
          listClassName,
        )}
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            data-slot="tabs-trigger"
            className={cn(
              'focus-ring text-muted hover:text-ink inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40',
              line
                ? cn(
                    'shrink-0 border-b-2 border-transparent',
                    'data-[state=active]:border-brand data-[state=active]:text-brand font-semibold',
                    sz.line,
                  )
                : cn(
                    'data-[state=active]:bg-well data-[state=active]:text-ink rounded data-[state=active]:shadow-none',
                    sz.tab,
                  ),
              fullWidth && 'flex-1',
            )}
          >
            {item.icon && <Icon name={item.icon} size={sz.icon} />}
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {hasPanels &&
        items.map((item) =>
          item.content != null ? (
            <TabsPrimitive.Content
              key={item.value}
              value={item.value}
              data-slot="tabs-content"
              className="focus-ring outline-none"
            >
              {item.content}
            </TabsPrimitive.Content>
          ) : null,
        )}
    </TabsPrimitive.Root>
  );
}
