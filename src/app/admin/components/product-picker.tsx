'use client';

import * as React from 'react';

import { productPickerAction } from '@/actions/admin';
import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import { Icon } from '@components/icon/icon';
import { Spinner } from '@components/shared';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { useDebouncedValue } from '@hooks/use-debounced-value';
import { STOCK_STATUS_LABELS, type StockStatus } from '@lib/constants';
import { cn } from '@lib/utils';

export type PickerProduct = {
  id: string;
  name: string;
  image?: string;
  price: number;
  supplierPrice: number;
  sku?: string;
  stockStatus: StockStatus;
  variations: { name: string; values: string[] }[];
};

export type PickedLine = {
  product: PickerProduct;
  variant: Record<string, string>;
  quantity: number;
};

/** Search products (including drafts) and add one with its options chosen. */
export function ProductPicker({
  onPick,
  singlesOnly = false,
  label = 'Add product',
}: {
  onPick: (line: PickedLine) => void;
  /**
   * No combos, and pick products without choosing options — used by the combo
   * builder, where the customer chooses the options on the combo itself.
   */
  singlesOnly?: boolean;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const debounced = useDebouncedValue(q, 300);
  const [found, setFound] = React.useState<{ query: string; items: PickerProduct[] }>({
    query: '\0',
    items: [],
  });
  const [chosen, setChosen] = React.useState<PickerProduct | null>(null);
  const [variant, setVariant] = React.useState<Record<string, string>>({});
  const results = found.items;
  const loading = open && found.query !== debounced;

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    productPickerAction(debounced, { singlesOnly }).then((res) => {
      if (!cancelled) setFound({ query: debounced, items: res.ok ? res.data : [] });
    });
    return () => {
      cancelled = true;
    };
  }, [debounced, open, singlesOnly]);

  const reset = () => {
    setChosen(null);
    setVariant({});
  };

  const options = chosen?.variations.filter((v) => v.values.length) ?? [];
  const ready = chosen && options.every((v) => variant[v.name]);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Icon name="plus" size={15} /> {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{chosen ? 'Choose options' : 'Add a product'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {!chosen ? (
              <>
                <div className="input-flat flex h-10 items-center gap-2 px-3">
                  <Icon name="search" size={16} className="text-subtle" />
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by name or SKU…"
                    className="h-full w-full bg-transparent text-sm outline-none"
                  />
                  {loading && <Spinner size="sm" />}
                </div>
                <ul className="divide-line max-h-[360px] divide-y overflow-y-auto">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        disabled={p.stockStatus === 'out_of_stock'}
                        onClick={() => {
                          const single = Object.fromEntries(
                            p.variations
                              .filter((v) => v.values.length === 1)
                              .map((v) => [v.name, v.values[0]!]),
                          );
                          if (!singlesOnly && p.variations.some((v) => v.values.length > 1)) {
                            setChosen(p);
                            setVariant(single);
                          } else {
                            onPick({ product: p, variant: singlesOnly ? {} : single, quantity: 1 });
                            setOpen(false);
                          }
                        }}
                        className="hover:bg-well flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left disabled:opacity-50"
                      >
                        <span className="bg-well relative size-11 shrink-0 overflow-hidden rounded-lg">
                          <ProductImage src={p.image} alt="" fill sizes="44px" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-ink line-clamp-1 text-[13px] font-semibold">
                            {p.name}
                          </span>
                          <span className="text-subtle text-[11.5px]">
                            {p.sku ? `${p.sku} · ` : ''}
                            {STOCK_STATUS_LABELS[p.stockStatus]}
                            {p.variations.length > 0 &&
                              ` · ${p.variations.map((v) => v.name).join(', ')}`}
                          </span>
                        </span>
                        <Taka amount={p.price} className="text-ink text-sm font-semibold" />
                      </button>
                    </li>
                  ))}
                  {!loading && results.length === 0 && (
                    <li className="text-muted py-8 text-center text-sm">No products found.</li>
                  )}
                </ul>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-ink font-semibold">{chosen.name}</p>
                {options.map((v) => (
                  <div key={v.name}>
                    <p className="text-muted mb-1.5 text-[12.5px]">{v.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {v.values.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setVariant((s) => ({ ...s, [v.name]: val }))}
                          className={cn(
                            'rounded-full border px-3 py-1 text-[13px]',
                            variant[v.name] === val
                              ? 'bg-noir border-noir text-white'
                              : 'border-line-2/70 hover:border-ink',
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={reset}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!ready}
                    onClick={() => {
                      onPick({ product: chosen, variant, quantity: 1 });
                      setOpen(false);
                      reset();
                    }}
                  >
                    Add to order
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
