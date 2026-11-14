'use client';

import * as React from 'react';

import { Icon } from '@components/icon/icon';

/** Left/right arrow buttons placed to the left of the section's "View all" link. */
export function CarouselControls({
  visible,
  onPrev,
  onNext,
  label,
}: {
  visible: boolean;
  onPrev: () => void;
  onNext: () => void;
  label: string;
}) {
  if (!visible) return null;
  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <button
        type="button"
        onClick={onPrev}
        aria-label={`Scroll ${label} left`}
        className="border-line-2/70 text-ink hover:border-ink hover:bg-well grid size-8 place-items-center rounded-lg border bg-white transition"
      >
        <Icon name="chevLeft" size={15} />
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label={`Scroll ${label} right`}
        className="border-line-2/70 text-ink hover:border-ink hover:bg-well grid size-8 place-items-center rounded-lg border bg-white transition"
      >
        <Icon name="chevRight" size={15} />
      </button>
    </div>
  );
}

/**
 * Manages single-row horizontal scrolling with:
 * - overflow detection (shows controls & enables 3x-copy infinite loop only when items overflow)
 * - seamless infinite loop jump when scrolling past either end
 * - mouse drag-to-scroll (touch swipe works natively via overflow-x-auto + touch-pan-x)
 */
export function useInfiniteCarousel(
  itemCount: number,
  options?: { autoScrollMobileMs?: number },
) {
  const autoScrollMobileMs = options?.autoScrollMobileMs;
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [overflowing, setOverflowing] = React.useState(false);
  const copyWidthRef = React.useRef(0);
  const draggingRef = React.useRef(false);
  const touchingRef = React.useRef(false);
  const movedRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const startScrollRef = React.useRef(0);

  const measure = React.useCallback(() => {
    const el = trackRef.current;
    if (!el || itemCount === 0) return;

    const firstSet = el.querySelector<HTMLElement>('[data-carousel-set="0"]');
    if (!firstSet) return;

    // Include trailing gap between sets (~16px) so copyWidth matches exact repeat stride.
    const setWidth = firstSet.scrollWidth;
    const gap = 16;
    const isOver = setWidth > el.clientWidth + 2;

    setOverflowing((prev) => {
      if (prev !== isOver) return isOver;
      return prev;
    });

    if (isOver) {
      const stride = setWidth + gap;
      copyWidthRef.current = stride;
      if (el.scrollLeft < stride * 0.25 || el.scrollLeft > stride * 2.25) {
        el.scrollLeft = stride;
      }
    } else {
      copyWidthRef.current = 0;
    }
  }, [itemCount]);

  React.useLayoutEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  React.useEffect(() => {
    if (!overflowing) return;
    const el = trackRef.current;
    if (!el) return;
    const firstSet = el.querySelector<HTMLElement>('[data-carousel-set="0"]');
    if (!firstSet) return;
    const stride = firstSet.scrollWidth + 16;
    copyWidthRef.current = stride;
    el.scrollLeft = stride;
  }, [overflowing]);

  const onScroll = React.useCallback(() => {
    if (!overflowing) return;
    const el = trackRef.current;
    const stride = copyWidthRef.current;
    if (!el || stride <= 0) return;

    if (el.scrollLeft < stride * 0.5) {
      el.scrollLeft += stride;
    } else if (el.scrollLeft >= stride * 1.5) {
      el.scrollLeft -= stride;
    }
  }, [overflowing]);

  const scrollByStep = React.useCallback((dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(184, Math.round(el.clientWidth * 0.65));
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }, []);

  // Auto-scroll left-to-right on mobile every `autoScrollMobileMs` when overflowing.
  React.useEffect(() => {
    if (!overflowing || !autoScrollMobileMs) return;
    const mq = window.matchMedia('(max-width: 639px)');
    const timer = window.setInterval(() => {
      if (!mq.matches || touchingRef.current || draggingRef.current) return;
      if (document.visibilityState !== 'visible') return;
      scrollByStep(1);
    }, autoScrollMobileMs);
    return () => window.clearInterval(timer);
  }, [overflowing, autoScrollMobileMs, scrollByStep]);

  const onTouchStart = React.useCallback(() => {
    touchingRef.current = true;
  }, []);

  const onTouchEnd = React.useCallback(() => {
    touchingRef.current = false;
  }, []);

  const onMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el || e.button !== 0) return;
    draggingRef.current = true;
    movedRef.current = false;
    startXRef.current = e.clientX;
    startScrollRef.current = el.scrollLeft;
  }, []);

  React.useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !trackRef.current) return;
      const dx = e.clientX - startXRef.current;
      if (Math.abs(dx) > 5) movedRef.current = true;
      if (movedRef.current) {
        trackRef.current.scrollLeft = startScrollRef.current - dx;
      }
    };
    const onMouseUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const onClickCapture = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (movedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      movedRef.current = false;
    }
  }, []);

  return {
    trackRef,
    overflowing,
    copies: overflowing ? [0, 1, 2] : [0],
    onScroll,
    scrollByStep,
    onMouseDown,
    onTouchStart,
    onTouchEnd,
    onClickCapture,
  };
}
