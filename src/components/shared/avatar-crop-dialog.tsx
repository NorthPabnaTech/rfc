'use client';

import * as React from 'react';

import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';

const VIEW_SIZE = 280;
const OUTPUT_SIZE = 400;

export function AvatarCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (next: boolean) => void;
  onConfirm: (file: File) => Promise<void>;
}) {
  const [imgSize, setImgSize] = React.useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [uploading, setUploading] = React.useState(false);
  const dragRef = React.useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  React.useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImgSize(null);
  }, [imageSrc]);

  const baseScale = imgSize ? VIEW_SIZE / Math.min(imgSize.w, imgSize.h) : 1;
  const totalScale = baseScale * zoom;

  const clampOffset = React.useCallback(
    (nx: number, ny: number, z = zoom) => {
      if (!imgSize) return { x: 0, y: 0 };
      const s = (VIEW_SIZE / Math.min(imgSize.w, imgSize.h)) * z;
      const maxX = Math.max(0, (imgSize.w * s - VIEW_SIZE) / 2);
      const maxY = Math.max(0, (imgSize.h * s - VIEW_SIZE) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, nx)),
        y: Math.min(maxY, Math.max(-maxY, ny)),
      };
    },
    [imgSize, zoom],
  );

  const handleZoomChange = (nextZoom: number) => {
    const z = Math.min(3, Math.max(1, nextZoom));
    setZoom(z);
    setOffset((prev) => clampOffset(prev.x, prev.y, z));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset(clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleSave = async () => {
    if (!imgRef.current || !imgSize || uploading) return;
    setUploading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');

      const ratio = OUTPUT_SIZE / VIEW_SIZE;
      const drawW = imgSize.w * totalScale * ratio;
      const drawH = imgSize.h * totalScale * ratio;
      const drawX = (OUTPUT_SIZE - drawW) / 2 + offset.x * ratio;
      const drawY = (OUTPUT_SIZE - drawH) / 2 + offset.y * ratio;

      ctx.drawImage(imgRef.current, drawX, drawY, drawW, drawH);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to export image'))),
          'image/webp',
          0.85,
        );
      });

      const file = new File([blob], 'avatar.webp', { type: 'image/webp' });
      await onConfirm(file);
      onOpenChange(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !uploading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop profile photo (1:1)</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col items-center gap-4 py-4">
          {imageSrc && (
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="border-line bg-well relative cursor-grab overflow-hidden rounded-2xl border select-none active:cursor-grabbing"
              style={{ width: VIEW_SIZE, height: VIEW_SIZE, touchAction: 'none' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  setImgSize({ w: el.naturalWidth, h: el.naturalHeight });
                }}
                className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
                style={
                  imgSize
                    ? {
                        width: imgSize.w * totalScale,
                        height: imgSize.h * totalScale,
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                      }
                    : { opacity: 0 }
                }
              />
              {/* 1:1 circular crop overlay */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full ring-[9999px] ring-black/45"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80"
              />
            </div>
          )}

          <div className="flex w-full max-w-[280px] items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.15)}
              aria-label="Zoom out"
              className="text-muted hover:text-ink grid size-7 place-items-center rounded-md"
            >
              <Icon name="minus" size={14} />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              aria-label="Zoom"
              className="accent-brand flex-1 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.15)}
              aria-label="Zoom in"
              className="text-muted hover:text-ink grid size-7 place-items-center rounded-md"
            >
              <Icon name="plus" size={14} />
            </button>
          </div>
          <p className="text-muted text-xs">Drag to reposition, use slider to zoom.</p>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={uploading || !imgSize}
            onClick={handleSave}
          >
            {uploading ? 'Uploading…' : 'Crop & Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
