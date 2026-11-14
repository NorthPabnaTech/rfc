'use client';

import * as React from 'react';

import { ProductImage } from '@/features/products/product-image';
import type { ImageDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { cn } from '@lib/utils';

const MIN_TOUCH_ZOOM = 1;
const MAX_TOUCH_ZOOM = 3;
const DOUBLE_TAP_ZOOM = 2.2;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function ProductGallery({ images, name }: { images: ImageDTO[]; name: string }) {
  const [active, setActive] = React.useState(0);
  const [hoverZoom, setHoverZoom] = React.useState<{ x: number; y: number } | null>(null);
  const [touchZoom, setTouchZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const stageRef = React.useRef<HTMLDivElement>(null);
  const lastTapRef = React.useRef<{ time: number; x: number; y: number } | null>(null);
  const panDragRef = React.useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  const list = images.length ? images : [undefined];
  const current = list[Math.min(active, list.length - 1)];
  // The frame takes each photo's own shape (measured on load when the DTO has
  // no size), so the whole photo shows with no empty bands around it.
  const [ratios, setRatios] = React.useState<Record<string, number>>({});
  const known = current?.width && current.height ? current.width / current.height : 1;
  const ratio = Math.min(Math.max((current && ratios[current.url]) ?? known, 0.4), 2.5);

  const clampPan = React.useCallback((nextX: number, nextY: number, scale: number) => {
    const el = stageRef.current;
    if (!el || scale <= 1) return { x: 0, y: 0 };
    const maxX = ((scale - 1) * el.clientWidth) / 2;
    const maxY = ((scale - 1) * el.clientHeight) / 2;
    return { x: clamp(nextX, -maxX, maxX), y: clamp(nextY, -maxY, maxY) };
  }, []);

  const selectImage = (idx: number) => {
    setActive(idx);
    setTouchZoom(1);
    setPan({ x: 0, y: 0 });
    setHoverZoom(null);
  };

  const stepTouchZoom = (delta: number) => {
    setTouchZoom((prev) => {
      const next = clamp(Number((prev + delta).toFixed(2)), MIN_TOUCH_ZOOM, MAX_TOUCH_ZOOM);
      setPan((p) => clampPan(p.x, p.y, next));
      return next;
    });
  };

  const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    if (touchZoom > 1) {
      e.currentTarget.setPointerCapture(e.pointerId);
      panDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: pan.x,
        origY: pan.y,
        moved: false,
      };
    }
  };

  const onStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') {
      const r = e.currentTarget.getBoundingClientRect();
      setHoverZoom({
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
      });
      return;
    }

    const drag = panDragRef.current;
    if (!drag || touchZoom <= 1) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;
    setPan(clampPan(drag.origX + dx, drag.origY + dy, touchZoom));
  };

  const onStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    const wasMoved = panDragRef.current?.moved ?? false;
    panDragRef.current = null;
    if (wasMoved) return;

    const now = Date.now();
    const prev = lastTapRef.current;
    if (
      prev &&
      now - prev.time < 300 &&
      Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 36
    ) {
      lastTapRef.current = null;
      if (touchZoom > 1) {
        setTouchZoom(1);
        setPan({ x: 0, y: 0 });
      } else {
        const el = stageRef.current;
        if (el) {
          const r = el.getBoundingClientRect();
          const offsetX = (r.width / 2 - (e.clientX - r.left)) * (DOUBLE_TAP_ZOOM - 1);
          const offsetY = (r.height / 2 - (e.clientY - r.top)) * (DOUBLE_TAP_ZOOM - 1);
          setTouchZoom(DOUBLE_TAP_ZOOM);
          setPan(clampPan(offsetX, offsetY, DOUBLE_TAP_ZOOM));
        } else {
          setTouchZoom(DOUBLE_TAP_ZOOM);
        }
      }
    } else {
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
    }
  };

  const imageStyle: React.CSSProperties | undefined =
    touchZoom > 1
      ? {
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${touchZoom})`,
          transformOrigin: '50% 50%',
        }
      : hoverZoom
        ? { transform: 'scale(1.8)', transformOrigin: `${hoverZoom.x}% ${hoverZoom.y}%` }
        : undefined;

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {list.length > 1 && (
        <div className="scrollbar-hidden -m-1 flex gap-2.5 overflow-x-auto p-1 md:max-h-[640px] md:w-22 md:flex-col md:overflow-y-auto">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => selectImage(i)}
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
        ref={stageRef}
        className={cn(
          'bg-cream relative min-w-0 flex-1 overflow-hidden rounded-3xl select-none md:self-start md:cursor-zoom-in',
          touchZoom > 1 && 'touch-none',
        )}
        style={{ aspectRatio: ratio }}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={() => {
          panDragRef.current = null;
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setHoverZoom(null);
        }}
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
          className={cn(
            'animate-fade object-contain',
            touchZoom > 1 ? 'transition-none' : 'transition-transform duration-200',
          )}
          style={imageStyle}
        />

        {/* Mobile zoom in / zoom out controls */}
        <div
          className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-black/55 p-1 text-white backdrop-blur md:hidden"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Zoom out"
            disabled={touchZoom <= MIN_TOUCH_ZOOM}
            onClick={() => stepTouchZoom(-0.6)}
            className="grid size-7 place-items-center rounded-full transition hover:bg-white/15 disabled:opacity-40"
          >
            <Icon name="minus" size={14} />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={touchZoom >= MAX_TOUCH_ZOOM}
            onClick={() => stepTouchZoom(0.6)}
            className="grid size-7 place-items-center rounded-full transition hover:bg-white/15 disabled:opacity-40"
          >
            <Icon name="plus" size={14} />
          </button>
        </div>

        {list.length > 1 && (
          <span className="absolute right-4 bottom-4 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            {active + 1} / {list.length}
          </span>
        )}
      </div>
    </div>
  );
}
