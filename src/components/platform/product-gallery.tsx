'use client';

import * as React from 'react';

import { cn } from '@lib/utils';

import { ProductImage } from './product-image';

/** Main image + selectable thumbnails. */
export function ProductGallery({
  images,
  alt,
  icon,
}: {
  images: string[];
  alt: string;
  icon?: string;
}) {
  const [active, setActive] = React.useState(0);
  const list = images.length ? images : ['art:0'];
  const current = list[Math.min(active, list.length - 1)];
  return (
    <div>
      <ProductImage
        src={current}
        alt={alt}
        icon={icon}
        className="aspect-square w-full"
        iconSize={84}
        rounded="rounded-2xl"
      />
      {list.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2.5">
          {list.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${alt} ${i + 1}`}
              className={cn(
                'focus-ring overflow-hidden rounded-xl ring-offset-2 ring-offset-[var(--color-panel)] transition',
                i === active ? 'ring-brand ring-2' : 'opacity-70 hover:opacity-100',
              )}
            >
              <ProductImage
                src={src}
                alt=""
                icon={icon}
                className="aspect-square w-full"
                iconSize={26}
                rounded="rounded-xl"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
