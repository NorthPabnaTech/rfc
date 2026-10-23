'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';

import { QuantityStepper } from '@/features/cart/quantity-stepper';
import { WishlistButton } from '@/features/wishlist/wishlist-button';
import { useCart } from '@/stores/cart-store';
import type { ProductDetailDTO } from '@/types';
import { IconText } from '@components/common/icon-text';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { STOCK_STATUS_LABELS } from '@lib/constants';
import { toast } from '@lib/toast';
import { cn } from '@lib/utils';

export function PurchasePanel({
  product,
  supportPhone,
}: {
  product: ProductDetailDTO;
  supportPhone: string;
}) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const setOpen = useCart((s) => s.setOpen);
  const [selected, setSelected] = React.useState<Record<string, string>>(() =>
    // Pre-select options that have a single value.
    Object.fromEntries(
      product.variations.filter((v) => v.values.length === 1).map((v) => [v.name, v.values[0]!]),
    ),
  );
  const [qty, setQty] = React.useState(1);
  const [showErrors, setShowErrors] = React.useState(false);

  const missing = product.variations.filter((v) => !selected[v.name]);
  const soldOut = product.stockStatus === 'out_of_stock';

  const addToCart = (goToCheckout: boolean) => {
    if (missing.length) {
      setShowErrors(true);
      toast.warning(`Please choose ${missing.map((m) => m.name.toLowerCase()).join(' and ')}`);
      return;
    }
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0],
      price: product.effectivePrice,
      variant: selected,
      quantity: qty,
    });
    if (goToCheckout) {
      setOpen(false);
      router.push('/checkout');
    }
  };

  return (
    <div className="space-y-6">
      {product.variations.map((v) => {
        const err = showErrors && !selected[v.name];
        return (
          <fieldset key={v.name}>
            <legend className="text-ink mb-2.5 text-sm font-semibold">
              {v.name}
              {selected[v.name] && (
                <span className="text-muted font-normal">: {selected[v.name]}</span>
              )}
              {err && (
                <span className="ml-2 text-xs font-medium text-[var(--status-danger-fg)]">
                  Required
                </span>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {v.values.map((val) => {
                const on = selected[v.name] === val;
                return (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelected((s) => ({ ...s, [v.name]: val }))}
                    className={cn(
                      'min-w-12 rounded-full border px-4 py-2.5 text-sm font-medium transition',
                      on
                        ? 'bg-noir border-noir text-white'
                        : cn(
                            'text-ink hover:border-ink bg-white',
                            err ? 'border-[var(--status-danger-fg)]' : 'border-line-2/70',
                          ),
                    )}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={qty} onChange={setQty} />
        <Button
          variant="noir"
          size="xl"
          className="flex-1"
          disabled={soldOut}
          onClick={() => addToCart(false)}
        >
          <Icon name="bag" size={18} /> {soldOut ? 'Sold out' : 'Add to cart'}
        </Button>
        <WishlistButton productId={product.id} name={product.name} variant="outline" />
      </div>
      {!soldOut && (
        <Button variant="primary" size="xl" className="w-full" onClick={() => addToCart(true)}>
          Order now — Cash on Delivery
        </Button>
      )}

      <div className="bg-cream grid gap-3 rounded-2xl p-4 text-sm sm:grid-cols-2">
        <IconText icon="shipping" iconClassName="text-accent" className="text-ink">
          Delivery across Bangladesh
        </IconText>
        <IconText icon="money" iconClassName="text-accent" className="text-ink">
          Pay cash on delivery
        </IconText>
        <IconText icon="badgeCheck" iconClassName="text-accent" className="text-ink">
          Quality checked
        </IconText>
        <a href={`tel:${supportPhone}`} className="text-ink hover:underline">
          <IconText icon="phone" iconClassName="text-accent">
            Call to order: {supportPhone}
          </IconText>
        </a>
      </div>

      <p className="text-muted text-xs">
        Availability:{' '}
        <span
          className={cn(
            'font-semibold',
            soldOut ? 'text-[var(--status-danger-fg)]' : 'text-[var(--status-ok-fg)]',
          )}
        >
          {STOCK_STATUS_LABELS[product.stockStatus]}
        </span>
        {product.sku && <> · SKU: {product.sku}</>}
      </p>
    </div>
  );
}
