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
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-stretch">
      {list.length > 1 && (
        <div className="sm:relative sm:w-[76px] sm:shrink-0">
          <div className="scrollbar-hidden flex gap-2.5 overflow-x-auto p-1 sm:absolute sm:inset-0 sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto">
            {list.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${alt} ${i + 1}`}
                className={cn(
                  'focus-ring size-16 shrink-0 overflow-hidden rounded-xl ring-offset-2 ring-offset-[var(--color-panel)] transition sm:aspect-square sm:h-auto sm:w-full',
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
        </div>
      )}
      <div className="min-w-0 flex-1">
        <ProductImage
          src={current}
          alt={alt}
          icon={icon}
          className="aspect-square w-full"
          iconSize={84}
          rounded="rounded-2xl"
        />
      </div>
    </div>
  );
}
