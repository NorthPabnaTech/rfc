'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * Dropdown — one prop-driven component, two modes, built on Popover.
 *
 *   1. MENU MODE — pass `items`; each renders as a clickable row:
 *
 *      <Dropdown
 *        items={[
 *          { label: 'Edit', icon: 'pencil', onClick: onEdit },
 *          { label: 'Duplicate', icon: 'list', onClick: onCopy },
 *          { type: 'separator' },
 *          { label: 'Delete', icon: 'trash', destructive: true, onClick: onDelete },
 *        ]}
 *      >
 *        <Button variant="outline">Actions</Button>
 *      </Dropdown>
 *
 *   2. CONTENT MODE — pass `content` for anything custom (e.g. notifications).
 *      `content` may be a node, or a render function that receives `close`:
 *
 *      <Dropdown
 *        align="end"
 *        width={360}
 *        content={(close) => <Notifications onSeeAll={close} />}
 *      >
 *        <IconButton icon="bell" />
 *      </Dropdown>
 *
 * `children` is always the trigger (rendered `asChild`).
 * ──────────────────────────────────────────────────────────────────────── */

/** A single actionable menu row. */
export type DropdownItem = {
  label: React.ReactNode;
  /** Leading icon from the icon registry. */
  icon?: IconRegistryKey;
  onClick?: () => void;
  disabled?: boolean;
  /** Render in the danger color (e.g. "Delete"). */
  destructive?: boolean;
  /** Right-aligned hint, e.g. "⌘K". */
  shortcut?: React.ReactNode;
  /** Extra classes for this row (e.g. highlight the active option). */
  className?: string;
  /** Fully custom row — overrides the default label/icon layout. */
  render?: React.ReactNode;
};

type DropdownSeparator = { type: 'separator' };
type DropdownGroupLabel = { type: 'label'; label: React.ReactNode };

/** Anything you can put in the `items` array. */
export type DropdownEntry = DropdownItem | DropdownSeparator | DropdownGroupLabel;

export type DropdownProps = {
  /** The trigger element (rendered `asChild`). */
  children: React.ReactNode;

  /** Menu mode: render these rows. Ignored when `content` is provided. */
  items?: DropdownEntry[];
  /** Content mode: render anything. A function receives a `close` callback. */
  content?: React.ReactNode | ((close: () => void) => React.ReactNode);

  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;

  /** Panel width in px (or any CSS length). Defaults: menu auto, content 320px. */
  width?: number | string;
  /** Close the panel after an item's onClick fires. Default: true (menu mode). */
  closeOnSelect?: boolean;

  /** Disable the whole trigger. */
  disabled?: boolean;
  /** Extra classes for the panel. */
  className?: string;
};

function isSeparator(e: DropdownEntry): e is DropdownSeparator {
  return 'type' in e && e.type === 'separator';
}
function isGroupLabel(e: DropdownEntry): e is DropdownGroupLabel {
  return 'type' in e && e.type === 'label';
}

export function Dropdown({
  children,
  items,
  content,
  open: openProp,
  defaultOpen,
  onOpenChange,
  align = 'end',
  side = 'bottom',
  sideOffset = 6,
  width,
  closeOnSelect = true,
  disabled,
  className,
}: DropdownProps) {
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
  const open = isControlled ? openProp : internalOpen;

  const setOpen = (next: boolean) => {
    if (disabled && next) return;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const close = () => setOpen(false);

  const handleSelect = (item: DropdownItem) => {
    if (item.disabled) return;
    item.onClick?.();
    if (closeOnSelect) close();
  };

  const isMenu = !content && !!items?.length;

  const widthStyle =
    width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : undefined;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        {children}
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          side={side}
          sideOffset={sideOffset}
          role={isMenu ? 'menu' : undefined}
          style={widthStyle}
          className={cn(
            'bg-panel hairline text-ink z-50 overflow-hidden rounded-lg shadow-sm outline-none',
            'origin-(--radix-popover-content-transform-origin)',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            isMenu ? 'min-w-[11rem] p-1' : !width && 'w-80',
            className,
          )}
        >
          {content
            ? typeof content === 'function'
              ? content(close)
              : content
            : items?.map((entry, i) => {
                if (isSeparator(entry)) {
                  return (
                    <div key={`sep-${i}`} role="separator" className="bg-line -mx-1 my-1 h-px" />
                  );
                }
                if (isGroupLabel(entry)) {
                  return (
                    <div
                      key={`label-${i}`}
                      className="text-muted px-2.5 py-1.5 text-[11px] font-semibold tracking-wide uppercase"
                    >
                      {entry.label}
                    </div>
                  );
                }
                if (entry.render) {
                  return <React.Fragment key={`custom-${i}`}>{entry.render}</React.Fragment>;
                }
                return (
                  <button
                    key={`item-${i}`}
                    type="button"
                    role="menuitem"
                    disabled={entry.disabled}
                    onClick={() => handleSelect(entry)}
                    className={cn(
                      'relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] outline-hidden transition-colors select-none',
                      'hover:bg-well focus-visible:bg-well',
                      'disabled:pointer-events-none disabled:opacity-50',
                      entry.destructive
                        ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                        : 'text-ink',
                      entry.className,
                    )}
                  >
                    {entry.icon && (
                      <Icon
                        name={entry.icon}
                        size={15}
                        className={cn('shrink-0', !entry.destructive && 'text-muted')}
                      />
                    )}
                    <span className="flex-1 truncate">{entry.label}</span>
                    {entry.shortcut != null && (
                      <span className="text-subtle ml-auto text-[11px] tracking-wide">
                        {entry.shortcut}
                      </span>
                    )}
                  </button>
                );
              })}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
