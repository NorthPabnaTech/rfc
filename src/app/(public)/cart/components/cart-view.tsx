'use client';

import Link from 'next/link';

import { LineOptions } from '@/features/cart/line-options';
import { QuantityStepper } from '@/features/cart/quantity-stepper';
import { useCartQuote } from '@/features/cart/use-cart-quote';
import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import { useCart } from '@/stores/cart-store';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { useHydrated } from '@hooks/use-hydrated';

export function CartView() {
  const hydrated = useHydrated();
  const { items, setQuantity, setVariant, remove } = useCart();
  const { quote, loading } = useCartQuote(items, undefined, hydrated);

  if (!hydrated) {
    return <div className="skeleton h-64 rounded-3xl" />;
  }

  if (items.length === 0) {
    return (
      <div className="bg-cream flex flex-col items-center rounded-3xl px-6 py-20 text-center">
        <span className="bg-panel text-accent grid size-16 place-items-center rounded-full">
          <Icon name="bag" size={28} />
        </span>
        <h2 className="font-display text-ink mt-5 text-2xl">Your cart is empty</h2>
        <p className="text-muted mt-2 text-sm">Looks like you haven’t added anything yet.</p>
        <Button variant="noir" size="xl" asChild className="mt-6">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const issues = quote?.lines.filter((l) => !l.available) ?? [];
  const subtotal = quote?.subtotal ?? items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <ul className="divide-line border-line divide-y border-y">
        {items.map((item, idx) => {
          const line = quote?.lines[idx];
          const unit = line?.available ? line.unitPrice : item.price;
          return (
            <li key={item.key} className="flex gap-4 py-6 sm:gap-6">
              <Link
                href={`/products/${item.slug}`}
                className="bg-cream relative size-24 shrink-0 overflow-hidden rounded-2xl sm:size-32"
              >
                <ProductImage src={item.image?.url} alt={item.name} fill sizes="128px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${item.slug}`}
                      className="text-ink hover:text-accent font-semibold"
                    >
                      {item.name}
                    </Link>
                    {Object.keys(item.variant).length > 0 && (
                      <p className="text-muted mt-1 text-sm">
                        {Object.entries(item.variant)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </p>
                    )}
                    <p className="text-muted mt-1 text-sm">
                      <Taka amount={unit} /> each
                    </p>
                    {line && (
                      <LineOptions
                        className="mt-3"
                        options={line.options}
                        value={item.variant}
                        onChange={(v) => setVariant(item.key, v)}
                      />
                    )}
                    {line && !line.available && (
                      <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--status-danger-fg)]">
                        <Icon name="alert" size={14} /> {line.issue}
                      </p>
                    )}
                  </div>
                  <Taka amount={unit * item.quantity} className="text-ink shrink-0 font-bold" />
                </div>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <QuantityStepper
                    size="sm"
                    value={item.quantity}
                    onChange={(q) => setQuantity(item.key, q)}
                  />
                  <button
                    type="button"
                    onClick={() => remove(item.key)}
                    className="text-muted hover:text-ink flex items-center gap-1.5 text-sm"
                  >
                    <Icon name="trash" size={15} /> Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="bg-cream h-fit space-y-4 rounded-3xl p-6 lg:sticky lg:top-[150px]">
        <h2 className="font-display text-ink text-xl font-medium">Order summary</h2>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <Taka amount={subtotal} className="text-ink font-semibold" />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Delivery</span>
          <span className="text-muted">Calculated at checkout</span>
        </div>
        {quote && quote.freeShippingThreshold > 0 && subtotal < quote.freeShippingThreshold && (
          <p className="bg-panel text-ink rounded-xl px-3 py-2 text-xs">
            Add <Taka amount={quote.freeShippingThreshold - subtotal} className="font-bold" /> more
            for free delivery
          </p>
        )}
        <div className="border-line flex justify-between border-t pt-4">
          <span className="text-ink font-semibold">Total</span>
          <Taka amount={subtotal} className="text-ink text-lg font-bold" />
        </div>
        <Button
          variant="noir"
          size="xl"
          asChild
          className="w-full"
          disabled={loading || issues.length > 0}
        >
          <Link href="/checkout" aria-disabled={issues.length > 0}>
            Proceed to checkout <Icon name="chevRight" size={16} />
          </Link>
        </Button>
        {issues.length > 0 && (
          <p className="text-xs text-[var(--status-danger-fg)]">
            Choose the missing options or remove unavailable items to continue.
          </p>
        )}
        <p className="text-muted flex items-center justify-center gap-1.5 text-xs">
          <Icon name="secure" size={14} /> Cash on Delivery · No advance payment
        </p>
      </aside>
    </div>
  );
}
