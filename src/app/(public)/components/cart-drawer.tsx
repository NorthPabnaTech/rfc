'use client';

import Link from 'next/link';

import { LineOptions } from '@/features/cart/line-options';
import { QuantityStepper } from '@/features/cart/quantity-stepper';
import { useCartQuote } from '@/features/cart/use-cart-quote';
import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import { selectCount, selectSubtotal, useCart } from '@/stores/cart-store';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@components/ui/sheet';
import { useHydrated } from '@hooks/use-hydrated';

/** Slide-over mini cart; opens automatically when something is added. */
export function CartDrawer() {
  const hydrated = useHydrated();
  const { items, isOpen, setOpen, setQuantity, setVariant, remove } = useCart();
  const count = useCart(selectCount);
  const subtotal = useCart(selectSubtotal);
  const lines = hydrated ? items : [];
  // Only needed to offer options for lines added without them.
  const { quote } = useCartQuote(items, undefined, hydrated && isOpen);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <div className="border-line flex items-center gap-2 border-b px-5 py-4">
          <Icon name="bag" size={18} className="text-accent" />
          <SheetTitle className="font-display text-lg font-medium">
            Your cart {hydrated && count > 0 && <span className="text-muted">({count})</span>}
          </SheetTitle>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="bg-brand-soft text-accent grid size-16 place-items-center rounded-full">
              <Icon name="bag" size={28} />
            </span>
            <div>
              <p className="font-display text-ink text-lg">Your cart is empty</p>
              <p className="text-muted mt-1 text-sm">Discover something you’ll love.</p>
            </div>
            <Button variant="noir" size="lg" asChild onClick={() => setOpen(false)}>
              <Link href="/products">Start shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="divide-line flex-1 divide-y overflow-y-auto px-5">
              {lines.map((item, idx) => (
                <li key={item.key} className="flex gap-3.5 py-4">
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={() => setOpen(false)}
                    className="bg-cream relative size-20 shrink-0 overflow-hidden rounded-xl"
                  >
                    <ProductImage src={item.image?.url} alt={item.name} fill sizes="80px" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/products/${item.slug}`}
                      onClick={() => setOpen(false)}
                      className="text-ink hover:text-accent line-clamp-2 text-[13.5px] font-semibold"
                    >
                      {item.name}
                    </Link>
                    {Object.keys(item.variant).length > 0 && (
                      <p className="text-muted mt-0.5 text-xs">
                        {Object.entries(item.variant)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </p>
                    )}
                    {quote?.lines[idx] && (
                      <LineOptions
                        className="mt-2"
                        options={quote.lines[idx].options}
                        value={item.variant}
                        onChange={(v) => setVariant(item.key, v)}
                      />
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        onChange={(q) => setQuantity(item.key, q)}
                      />
                      <Taka
                        amount={item.price * item.quantity}
                        className="text-ink text-sm font-bold"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.key)}
                    aria-label={`Remove ${item.name}`}
                    className="text-subtle hover:text-ink self-start"
                  >
                    <Icon name="x" size={15} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-line bg-surface space-y-3 border-t px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <Taka amount={subtotal} className="text-ink text-base font-bold" />
              </div>
              <p className="text-subtle text-xs">
                Delivery fee calculated at checkout · Cash on Delivery
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="secondary" size="xl" asChild onClick={() => setOpen(false)}>
                  <Link href="/cart">View cart</Link>
                </Button>
                <Button variant="primary" size="xl" asChild onClick={() => setOpen(false)}>
                  <Link href="/checkout">Checkout</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
