'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import type { SettingsDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import {
  buildGeneralWhatsAppMessage,
  buildProductWhatsAppMessage,
  buildWhatsAppUrl,
} from '@lib/whatsapp';

export type ActiveChatProduct = {
  name: string;
  slug: string;
};

type ProductChatContextValue = {
  product: ActiveChatProduct | null;
  setProduct: (p: ActiveChatProduct | null) => void;
};

const ProductChatContext = React.createContext<ProductChatContextValue>({
  product: null,
  setProduct: () => {},
});

export function ProductChatProvider({ children }: { children: React.ReactNode }) {
  const [product, setProduct] = React.useState<ActiveChatProduct | null>(null);
  const value = React.useMemo(() => ({ product, setProduct }), [product]);
  return <ProductChatContext.Provider value={value}>{children}</ProductChatContext.Provider>;
}

/**
 * Registers the currently viewed public product with the floating WhatsApp
 * widget so its prefilled message automatically includes the product name and URL.
 */
export function useRegisterProductChat(product: ActiveChatProduct | null) {
  const { setProduct } = React.useContext(ProductChatContext);
  const name = product?.name;
  const slug = product?.slug;

  React.useEffect(() => {
    if (!name || !slug) {
      setProduct(null);
      return;
    }
    setProduct({ name, slug });
    return () => setProduct(null);
  }, [name, slug, setProduct]);
}

const emptySubscribe = () => () => {};
function useOrigin(): string {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => '',
  );
}

export function WhatsAppWidget({ settings }: { settings: SettingsDTO }) {
  const pathname = usePathname();
  const origin = useOrigin();
  const { product } = React.useContext(ProductChatContext);

  if (!settings.whatsappEnabled) return null;

  const phone = settings.social.whatsapp?.trim() || settings.supportPhone;
  const isProductPage = Boolean(product && pathname?.startsWith('/products/'));

  const message =
    isProductPage && product && settings.whatsappProductEnabled
      ? buildProductWhatsAppMessage(
          product.name,
          origin ? `${origin}/products/${product.slug}` : `/products/${product.slug}`,
        )
      : buildGeneralWhatsAppMessage(settings.whatsappDefaultMessage);

  const href = buildWhatsAppUrl(phone, message);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        isProductPage && product
          ? `Chat on WhatsApp about ${product.name}`
          : 'Chat with us on WhatsApp'
      }
      title={
        isProductPage && product
          ? `Chat on WhatsApp about ${product.name}`
          : 'Chat with us on WhatsApp'
      }
      className="focus-ring group fixed right-5 bottom-6 z-40 grid size-14 place-items-center rounded-full sm:right-7 sm:bottom-7"
    >
      {/* Continuous waterfall / ripple rings */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-[#25D366]/55 [animation-duration:2s]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1.5 animate-ping rounded-full bg-[#25D366]/30 [animation-delay:0.65s] [animation-duration:2s]"
      />
      <span className="relative grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl transition duration-300 group-hover:scale-110 group-hover:brightness-95">
        <Icon name="whatsapp" size={30} className="shrink-0" />
      </span>
    </a>
  );
}
