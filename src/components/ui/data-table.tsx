'use client';

import * as React from 'react';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { EmptyState } from '@components/shared';
import { cn } from '@lib/utils';

import { Checkbox } from './checkbox';
import { Select } from './select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

/* ─────────────────────────────────────────────────────────────────────────
 * DataTable — a generic, fully controlled, bordered data grid.
 * The parent owns the data, pagination and selection state; this renders.
 *
 *   <DataTable
 *     columns={columns}
 *     source={rows}
 *     rowKey="id"
 *     selectable
 *     selectedKeys={selected}
 *     onSelectionChange={setSelected}
 *     page={page} limit={limit} total={total}
 *     onPaginate={setPage}
 *   />
 * ──────────────────────────────────────────────────────────────────────── */

export type ColumnAlign = 'left' | 'center' | 'right';

export type Column<T> = {
  /** Stable identifier for the column (also the React key for cells). */
  key: string;
  /** Header content. Omit for an action/blank column. */
  header?: React.ReactNode;
  /** Cell renderer — receives the row and its index within the page. */
  cell: (row: T, index: number) => React.ReactNode;
  /** Fixed/percentage width, e.g. '120px' or '32%'. */
  width?: string | number;
  /**
   * Let long text wrap onto several lines (names, addresses, notes). Cells
   * are single-line by default so dates, prices and badges never break.
   */
  wrap?: boolean;
  /** Minimum column width — keeps wrapping columns readable. */
  minWidth?: string | number;
  /** Horizontal alignment for header + cells. Default 'left'. */
  align?: ColumnAlign;
  /** Extra classes for every body cell in this column. */
  className?: string;
  /** Extra classes for this column's header cell. */
  headerClassName?: string;
};

export type DataTableClassNames = {
  /** Outer card wrapper. */
  root?: string;
  table?: string;
  header?: string;
  headerRow?: string;
  headerCell?: string;
  body?: string;
  row?: string;
  cell?: string;
  footer?: string;
};

export type DataTableEmpty = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export type DataTableProps<T> = {
  /** Column definitions. */
  columns: Column<T>[];
  /** The rows to render for the current page. */
  source: T[];
  /** Stable row key. Defaults to the row index. */
  rowKey?: keyof T | ((row: T, index: number) => React.Key);
  /** Row click handler (also makes rows keyboard-focusable). */
  onRowClick?: (row: T, index: number) => void;

  /* ── header band (optional, sits above the column header) ── */
  /** Title shown in the card header band. */
  title?: React.ReactNode;
  /** Secondary text under the title. */
  description?: React.ReactNode;
  /** Right-aligned actions in the header band (search, filters, buttons…). */
  toolbar?: React.ReactNode;

  /* ── row selection (controlled or uncontrolled) ── */
  /** Show a leading checkbox column. */
  selectable?: boolean;
  /** Controlled selected row keys. Omit to let the table manage its own. */
  selectedKeys?: React.Key[];
  /** Initial selection when uncontrolled. */
  defaultSelectedKeys?: React.Key[];
  /** Called with the next selected row keys whenever selection changes. */
  onSelectionChange?: (keys: React.Key[]) => void;

  /* ── pagination (controlled, server-friendly) ── */
  /** Current 1-based page. Omit to hide pagination. */
  page?: number;
  /** Rows per page — used to compute page count and the "x–y of n" label. */
  limit?: number;
  /** Total row count across all pages. */
  total?: number;
  /** Called with the next 1-based page when the user paginates. */
  onPaginate?: (page: number) => void;
  /** Show a page-size selector with these options. Requires onLimitChange. */
  pageSizeOptions?: number[];
  onLimitChange?: (limit: number) => void;

  /* ── states ── */
  isLoading?: boolean;
  /** Number of skeleton rows to show while loading. Default = limit ?? 8. */
  skeletonRows?: number;
  /** Shown when there are no rows and not loading. */
  empty?: DataTableEmpty;

  classNames?: DataTableClassNames;
};

const ALIGN_CLASS: Record<ColumnAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function resolveRowKey<T>(rowKey: DataTableProps<T>['rowKey'], row: T, index: number): React.Key {
  if (typeof rowKey === 'function') return rowKey(row, index);
  if (rowKey != null) return row[rowKey] as unknown as React.Key;
  return index;
}

export function DataTable<T>({
  columns,
  source,
  rowKey,
  onRowClick,
  title,
  description,
  toolbar,
  selectable = false,
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  page,
  limit,
  total,
  onPaginate,
  pageSizeOptions,
  onLimitChange,
  isLoading = false,
  skeletonRows,
  empty,
  classNames,
}: DataTableProps<T>) {
  const showPagination = page != null && onPaginate != null;
  const isEmpty = !isLoading && source.length === 0;
  const hasHeaderBand = title != null || description != null || toolbar != null;
  const totalCols = columns.length + (selectable ? 1 : 0);

  /* ── selection state (controlled / uncontrolled) ── */
  const isSelectionControlled = selectedKeys !== undefined;
  const [internalSelected, setInternalSelected] = React.useState<React.Key[]>(
    defaultSelectedKeys ?? [],
  );
  const selected = isSelectionControlled ? selectedKeys : internalSelected;
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  const pageKeys = React.useMemo(
    () => source.map((row, i) => resolveRowKey(rowKey, row, i)),
    [source, rowKey],
  );

  const selectedOnPage = pageKeys.filter((k) => selectedSet.has(k)).length;
  const allSelected = pageKeys.length > 0 && selectedOnPage === pageKeys.length;
  const headerChecked: boolean | 'indeterminate' = allSelected
    ? true
    : selectedOnPage > 0
      ? 'indeterminate'
      : false;

  const emitSelection = (keys: React.Key[]) => {
    if (!isSelectionControlled) setInternalSelected(keys);
    onSelectionChange?.(keys);
  };

  const toggleAll = () => {
    if (allSelected) {
      const pageSet = new Set(pageKeys);
      emitSelection(selected.filter((k) => !pageSet.has(k)));
    } else {
      const merged = new Set(selected);
      pageKeys.forEach((k) => merged.add(k));
      emitSelection([...merged]);
    }
  };

  const toggleRow = (key: React.Key) => {
    if (selectedSet.has(key)) emitSelection(selected.filter((k) => k !== key));
    else emitSelection([...selected, key]);
  };

  const showFooter = showPagination || (selectable && selected.length > 0);

  // First/last cells align with the card padding. Rows use horizontal dividers
  // only (no vertical column dividers) for a cleaner, modern look.
  const tableClass = cn(
    '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4',
    classNames?.table,
  );

  return (
    <div
      className={cn('border-line rounded-xl2 bg-panel overflow-hidden border', classNames?.root)}
    >
      {hasHeaderBand && (
        <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            {title != null && (
              <div className="text-ink truncate text-[14px] font-semibold">{title}</div>
            )}
            {description != null && (
              <div className="text-subtle mt-0.5 truncate text-[12px]">{description}</div>
            )}
          </div>
          {toolbar != null && <div className="flex shrink-0 items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <Table className={tableClass}>
        <TableHeader
          className={cn(
            classNames?.header,
            !hasHeaderBand && '[&_th:first-child]:rounded-tl-xl2 [&_th:last-child]:rounded-tr-xl2',
          )}
        >
          <TableRow className={cn('', classNames?.headerRow)}>
            {selectable && (
              <TableHead className="relative w-[44px]">
                <Checkbox
                  checked={headerChecked}
                  onCheckedChange={toggleAll}
                  disabled={isLoading || pageKeys.length === 0}
                  aria-label="Select all rows on this page"
                />
                <div className={cn('bg-line absolute top-1/2 right-0 h-4 w-px -translate-y-1/2')} />
              </TableHead>
            )}
            {columns.map((col, index) => (
              <TableHead
                key={col.key}
                style={{
                  ...(col.width != null ? { width: col.width } : {}),
                  ...(col.minWidth != null ? { minWidth: col.minWidth } : {}),
                }}
                className={cn(
                  // Typography comes from <TableHead> so every table in the
                  // system shares one header style.
                  'relative',
                  ALIGN_CLASS[col.align ?? 'left'],
                  classNames?.headerCell,
                  col.headerClassName,
                )}
              >
                {col.header}
                <div
                  className={cn(
                    'bg-line absolute top-1/2 right-0 h-4 w-px -translate-y-1/2',
                    index === columns.length - 1 && 'hidden',
                  )}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className={classNames?.body}>
          {isLoading ? (
            <SkeletonRows
              columns={columns}
              selectable={selectable}
              rows={skeletonRows ?? limit ?? 8}
              rowClassName={classNames?.row}
              cellClassName={classNames?.cell}
            />
          ) : isEmpty ? (
            <TableRow className="hover:!bg-transparent">
              <TableCell colSpan={totalCols} className="border-r-0 p-0">
                {empty ? (
                  <EmptyState
                    compact
                    title={empty.title}
                    description={empty.description}
                    action={empty.action}
                  />
                ) : (
                  <div className="text-muted py-12 text-center text-[12.5px]">No results.</div>
                )}
              </TableCell>
            </TableRow>
          ) : (
            source.map((row, index) => {
              const key = resolveRowKey(rowKey, row, index);
              const clickable = onRowClick != null;
              const isSelected = selectedSet.has(key);
              return (
                <TableRow
                  key={key}
                  data-state={isSelected ? 'selected' : undefined}
                  onClick={clickable ? () => onRowClick(row, index) : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? 'button' : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row, index);
                          }
                        }
                      : undefined
                  }
                  className={cn(clickable && 'cursor-pointer', classNames?.row)}
                >
                  {selectable && (
                    <TableCell className="w-[44px]" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(key)}
                        aria-label="Select row"
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        ALIGN_CLASS[col.align ?? 'left'],
                        col.wrap && '[overflow-wrap:anywhere] whitespace-normal',
                        classNames?.cell,
                        col.className,
                      )}
                    >
                      {col.cell(row, index)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {showFooter && (
        <FooterBar
          className={classNames?.footer}
          selectedCount={selectable ? selected.length : 0}
          onClearSelection={selectable ? () => emitSelection([]) : undefined}
          pagination={
            showPagination
              ? {
                  page,
                  limit: limit ?? source.length,
                  total: total ?? source.length,
                  onPaginate,
                  pageSizeOptions,
                  onLimitChange,
                  disabled: isLoading,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */

function SkeletonRows<T>({
  columns,
  selectable,
  rows,
  rowClassName,
  cellClassName,
}: {
  columns: Column<T>[];
  selectable?: boolean;
  rows: number;
  rowClassName?: string;
  cellClassName?: string;
}) {
  return (
    <>
      {Array.from({ length: Math.max(1, rows) }).map((_, r) => (
        <TableRow key={r} className={cn('hover:bg-transparent', rowClassName)}>
          {selectable && (
            <TableCell className="w-[44px]">
              <div className="bg-well size-4 animate-pulse rounded-[4px]" />
            </TableCell>
          )}
          {columns.map((col) => (
            <TableCell key={col.key} className={cellClassName}>
              <div
                className="bg-well h-3.5 animate-pulse rounded"
                style={{ width: `${40 + ((r + col.key.length) % 5) * 12}%` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/* ─── Footer: selection summary + page-size + page nav ─────────────────────── */

export type PaginationConfig = {
  page: number;
  limit: number;
  total: number;
  onPaginate: (page: number) => void;
  pageSizeOptions?: number[];
  onLimitChange?: (limit: number) => void;
  disabled?: boolean;
};

export function FooterBar({
  selectedCount,
  onClearSelection,
  pagination,
  className,
}: {
  selectedCount: number;
  onClearSelection?: () => void;
  pagination?: PaginationConfig;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-line rounded-b-xl2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border border-t bg-white px-4 py-2.5',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-[12px]">
        {selectedCount > 0 ? (
          <>
            <span className="text-ink font-medium">{selectedCount} selected</span>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-accent hover:text-accent-hover cursor-pointer font-medium"
              >
                Clear
              </button>
            )}
          </>
        ) : pagination ? (
          <RangeLabel {...pagination} />
        ) : null}
      </div>

      {pagination && <PageControls {...pagination} />}
    </div>
  );
}

function RangeLabel({ page, limit, total }: PaginationConfig) {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const current = Math.min(Math.max(1, page), pageCount);
  const from = total === 0 ? 0 : (current - 1) * limit + 1;
  const to = Math.min(current * limit, total);
  return (
    <span className="text-subtle">
      Showing <span className="text-ink font-medium">{from}</span>–
      <span className="text-ink font-medium">{to}</span> of{' '}
      <span className="text-ink font-medium">{total}</span>
    </span>
  );
}

function PageControls({
  page,
  limit,
  total,
  onPaginate,
  pageSizeOptions,
  onLimitChange,
  disabled,
}: PaginationConfig) {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const current = Math.min(Math.max(1, page), pageCount);

  const go = (next: number) => {
    if (disabled) return;
    const target = Math.min(Math.max(1, next), pageCount);
    if (target !== current) onPaginate(target);
  };

  const atStart = disabled || current <= 1;
  const atEnd = disabled || current >= pageCount;

  return (
    <div className="flex items-center gap-4">
      {pageSizeOptions && onLimitChange && (
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-subtle text-[12px]">Rows per page</span>
          <Select
            value={String(limit)}
            onValueChange={(v) => onLimitChange(Number(v))}
            disabled={disabled}
            aria-label="Rows per page"
            align="end"
            size="sm"
            className="w-[68px] px-2"
            items={pageSizeOptions.map((opt) => ({ label: String(opt), value: String(opt) }))}
          />
        </div>
      )}

      <span className="text-subtle text-[12px]">
        Page <span className="text-ink font-medium">{current}</span> of{' '}
        <span className="text-ink font-medium">{pageCount}</span>
      </span>

      <div className="flex items-center gap-1">
        <PageButton icon="chevDouble" label="First page" onClick={() => go(1)} disabled={atStart} />
        <PageButton
          icon="chevLeft"
          label="Previous page"
          onClick={() => go(current - 1)}
          disabled={atStart}
        />
        <PageButton
          icon="chevRight"
          label="Next page"
          onClick={() => go(current + 1)}
          disabled={atEnd}
        />
        <PageButton
          icon="chevDouble"
          label="Last page"
          onClick={() => go(pageCount)}
          disabled={atEnd}
          flip
        />
      </div>
    </div>
  );
}

function PageButton({
  icon,
  label,
  onClick,
  disabled,
  flip,
}: {
  icon: IconRegistryKey;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  flip?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="hairline text-ink hover:bg-well grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-white transition-colors disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon name={icon} size={14} className={cn(flip && 'rotate-180')} />
    </button>
  );
}
