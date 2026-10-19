'use client';

import * as React from 'react';

import type { CategoryTreeDTO, TagDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { Checkbox } from '@components/ui/checkbox';
import { Sheet, SheetContent, SheetTitle } from '@components/ui/sheet';
import { useUrlFilters } from '@hooks/use-url-filters';
import { cn } from '@lib/utils';

type Props = { categories: CategoryTreeDTO[]; tags: TagDTO[] };

/** `sidebar`: sticky desktop panel. `sheet`: mobile "Filters" button + slide-over. */
export function ProductFilters({ variant, ...props }: Props & { variant: 'sidebar' | 'sheet' }) {
  const [open, setOpen] = React.useState(false);
  const { params } = useUrlFilters();
  const activeCount = ['category', 'tags', 'minPrice', 'maxPrice', 'inStock', 'onSale'].filter(
    (k) => params.get(k),
  ).length;

  if (variant === 'sidebar') {
    return (
      <aside className="sticky top-[150px]">
        <FilterPanel {...props} />
      </aside>
    );
  }

  return (
    <>
      <Button variant="secondary" size="lg" onClick={() => setOpen(true)}>
        <Icon name="filter" size={16} /> Filters {activeCount > 0 && `(${activeCount})`}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[88%] gap-0 overflow-y-auto p-0">
          <div className="border-line border-b px-5 py-4">
            <SheetTitle className="font-display text-lg font-medium">Filters</SheetTitle>
          </div>
          <div className="px-5 py-5">
            <FilterPanel {...props} onApplied={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function FilterPanel({ categories, tags, onApplied }: Props & { onApplied?: () => void }) {
  const { get, set, clear } = useUrlFilters();
  const activeCategory = get('category');
  const activeTags = get('tags').split(',').filter(Boolean);

  const apply = (updates: Parameters<typeof set>[0]) => {
    set(updates);
    onApplied?.();
  };

  return (
    <div className="space-y-8">
      <FilterGroup title="Category">
        <button
          type="button"
          onClick={() => apply({ category: null })}
          className={cn(
            'block w-full rounded-lg px-2.5 py-1.5 text-left text-sm',
            !activeCategory ? 'bg-noir text-white' : 'text-ink hover:bg-well',
          )}
        >
          All products
        </button>
        {categories.map((c) => {
          const open =
            activeCategory === c.slug || c.children.some((s) => s.slug === activeCategory);
          return (
            <div key={c.id}>
              <button
                type="button"
                onClick={() => apply({ category: c.slug })}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm',
                  activeCategory === c.slug ? 'bg-noir text-white' : 'text-ink hover:bg-well',
                )}
              >
                {c.name}
                {c.children.length > 0 && (
                  <Icon
                    name="chevDown"
                    size={13}
                    className={cn('opacity-50', open && 'rotate-180')}
                  />
                )}
              </button>
              {open && c.children.length > 0 && (
                <div className="border-line mt-1 ml-3 space-y-0.5 border-l pl-2">
                  {c.children.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => apply({ category: s.slug })}
                      className={cn(
                        'block w-full rounded-lg px-2.5 py-1.5 text-left text-[13px]',
                        activeCategory === s.slug
                          ? 'bg-brand-soft text-brand-ink font-semibold'
                          : 'text-muted hover:text-ink',
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </FilterGroup>

      <FilterGroup title="Price (৳)">
        <PriceRange
          key={`${get('minPrice')}|${get('maxPrice')}`}
          initialMin={get('minPrice')}
          initialMax={get('maxPrice')}
          onApply={(minPrice, maxPrice) =>
            apply({ minPrice: minPrice || null, maxPrice: maxPrice || null })
          }
        />
      </FilterGroup>

      <FilterGroup title="Availability">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox
            checked={get('inStock') === '1'}
            onCheckedChange={(v) => apply({ inStock: v ? '1' : null })}
          />
          In stock only
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox
            checked={get('onSale') === '1'}
            onCheckedChange={(v) => apply({ onSale: v ? '1' : null })}
          />
          On sale
        </label>
      </FilterGroup>

      {tags.length > 0 && (
        <FilterGroup title="Tags">
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const on = activeTags.includes(t.slug);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = on
                      ? activeTags.filter((x) => x !== t.slug)
                      : [...activeTags, t.slug];
                    apply({ tags: next.join(',') || null });
                  }}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                    on
                      ? 'bg-noir border-noir text-white'
                      : 'border-line-2/60 text-ink hover:border-ink',
                  )}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          clear(['q', 'sort']);
          onApplied?.();
        }}
        className="text-muted"
      >
        <Icon name="refresh" size={14} /> Clear all filters
      </Button>
    </div>
  );
}

/** Keyed by the URL values, so it resets whenever the applied range changes. */
function PriceRange({
  initialMin,
  initialMax,
  onApply,
}: {
  initialMin: string;
  initialMax: string;
  onApply: (min: string, max: string) => void;
}) {
  const [min, setMin] = React.useState(initialMin);
  const [max, setMax] = React.useState(initialMax);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(min, max);
      }}
    >
      <input
        inputMode="numeric"
        value={min}
        onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))}
        placeholder="Min"
        aria-label="Minimum price"
        className="input-flat h-10 w-full px-3 text-sm"
      />
      <span className="text-subtle">–</span>
      <input
        inputMode="numeric"
        value={max}
        onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))}
        placeholder="Max"
        aria-label="Maximum price"
        className="input-flat h-10 w-full px-3 text-sm"
      />
      <Button
        type="submit"
        variant="noir"
        size="icon"
        aria-label="Apply price filter"
        className="shrink-0"
      >
        <Icon name="chevRight" size={16} />
      </Button>
    </form>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-ink mb-3 text-[12px] font-bold tracking-[0.14em] uppercase">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
