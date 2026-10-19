'use client';

import * as React from 'react';

import { ProductImage } from '@/features/products/product-image';
import type { ImageDTO } from '@/types';
import { cn } from '@lib/utils';

export function ProductGallery({ images, name }: { images: ImageDTO[]; name: string }) {
  const [active, setActive] = React.useState(0);
  const [zoom, setZoom] = React.useState<{ x: number; y: number } | null>(null);
  const list = images.length ? images : [undefined];
  const current = list[Math.min(active, list.length - 1)];

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {list.length > 1 && (
        <div className="scrollbar-hidden flex gap-2.5 overflow-x-auto md:max-h-[640px] md:w-20 md:flex-col md:overflow-y-auto">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                'bg-cream relative aspect-square w-[72px] shrink-0 overflow-hidden rounded-xl ring-2 transition md:w-full',
                i === active ? 'ring-noir' : 'opacity-70 ring-transparent hover:opacity-100',
              )}
            >
              <ProductImage src={img.url} alt="" fill sizes="80px" />
            </button>
          ))}
        </div>
      )}

      <div
        className="bg-cream relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-3xl md:aspect-[4/5]"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({
            x: ((e.clientX - r.left) / r.width) * 100,
            y: ((e.clientY - r.top) / r.height) * 100,
          });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <ProductImage
          key={current?.url}
          src={current?.url}
          alt={current?.alt ?? name}
          fill
          priority
          sizes="(min-width: 1024px) 600px, 100vw"
          className="animate-fade transition-transform duration-200"
          style={
            zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined
          }
        />
        {list.length > 1 && (
          <span className="absolute right-4 bottom-4 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            {active + 1} / {list.length}
          </span>
        )}
      </div>
    </div>
  );
}
