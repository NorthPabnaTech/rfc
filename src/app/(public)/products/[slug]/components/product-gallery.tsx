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
  // The frame takes each photo's own shape (measured on load when the DTO has
  // no size), so the whole photo shows with no empty bands around it.
  const [ratios, setRatios] = React.useState<Record<string, number>>({});
  const known = current?.width && current.height ? current.width / current.height : 1;
  const ratio = Math.min(Math.max((current && ratios[current.url]) ?? known, 0.4), 2.5);

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {list.length > 1 && (
        <div className="scrollbar-hidden -m-1 flex gap-2.5 overflow-x-auto p-1 md:max-h-[640px] md:w-22 md:flex-col md:overflow-y-auto">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                'bg-cream relative aspect-square w-[72px] shrink-0 overflow-hidden rounded-xl transition md:w-full',
                i === active ? 'ring-noir ring-2' : 'ring-line opacity-70 ring-1 hover:opacity-100',
              )}
            >
              <ProductImage src={img.url} alt="" fill sizes="80px" />
            </button>
          ))}
        </div>
      )}

      <div
        className="bg-cream relative min-w-0 flex-1 cursor-zoom-in overflow-hidden rounded-3xl md:self-start"
        style={{ aspectRatio: ratio }}
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
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
            const url = current?.url;
            if (url && w && h) setRatios((r) => (r[url] ? r : { ...r, [url]: w / h }));
          }}
          // contain: only matters for extreme ratios clamped above.
          className="animate-fade object-contain transition-transform duration-200"
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
