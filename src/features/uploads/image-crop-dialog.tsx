'use client';

import * as React from 'react';

import { Icon } from '@components/icon/icon';
import { Spinner } from '@components/shared';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { type BannerPosition, type UploadPurpose } from '@lib/constants';
import {
  type CropRect,
  type DecodedImage,
  decodeImageFile,
  normalizeImageFileForBrowser,
  processImageFile,
} from '@lib/image-processor';
import { getUploadImageProfile } from '@lib/image-upload-config';
import { toast } from '@lib/toast';
import { cn } from '@lib/utils';

type Props = {
  open: boolean;
  files: File[];
  purpose: UploadPurpose;
  bannerPosition?: BannerPosition;
  onCancel: () => void;
  /** Called with all cropped/optimized files ready for upload. */
  onConfirm: (optimizedFiles: File[]) => Promise<void> | void;
};

type FrameRect = { x: number; y: number; width: number; height: number };
type Corner = 'nw' | 'ne' | 'sw' | 'se';

const MIN_CROP_PX = 48;
const STAGE_PAD = 16;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeAspectFrame(stageW: number, stageH: number, ratio: number): FrameRect {
  const availW = Math.max(80, stageW - STAGE_PAD * 2);
  const availH = Math.max(80, stageH - STAGE_PAD * 2);
  let w = availW;
  let h = w / ratio;
  if (h > availH) {
    h = availH;
    w = h * ratio;
  }
  return {
    x: (stageW - w) / 2,
    y: (stageH - h) / 2,
    width: w,
    height: h,
  };
}

export function ImageCropDialog({
  open,
  files,
  purpose,
  bannerPosition,
  onCancel,
  onConfirm,
}: Props) {
  if (!open || files.length === 0) return null;
  return (
    <ImageCropSession
      files={files}
      purpose={purpose}
      bannerPosition={bannerPosition}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function ImageCropSession({
  files,
  purpose,
  bannerPosition,
  onCancel,
  onConfirm,
}: Omit<Props, 'open'>) {
  const profile = React.useMemo(
    () => getUploadImageProfile(purpose, bannerPosition),
    [purpose, bannerPosition],
  );

  const [queue] = React.useState<File[]>(files);
  const [index, setIndex] = React.useState(0);
  const [readyFiles, setReadyFiles] = React.useState<File[]>([]);

  const [loaded, setLoaded] = React.useState<{
    file: File;
    normalizedFile: File;
    decoded: DecodedImage;
    sourceUrl: string;
  } | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [freeBox, setFreeBox] = React.useState<FrameRect | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [progressText, setProgressText] = React.useState<string>('');

  const [stageEl, setStageEl] = React.useState<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = React.useState({ width: 320, height: 240 });

  // Measure stage dimensions responsively via callback ref (works inside Radix Portal)
  React.useEffect(() => {
    if (!stageEl) return;
    const update = () => {
      const w = stageEl.clientWidth;
      const h = stageEl.clientHeight;
      if (w > 0 && h > 0) {
        setStageSize({ width: w, height: h });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stageEl);
    return () => ro.disconnect();
  }, [stageEl]);

  const currentFile = queue[index] ?? null;
  const decoded = loaded?.file === currentFile ? loaded.decoded : null;
  const sourceUrl = loaded?.file === currentFile ? loaded.sourceUrl : '';

  // Decode current file when index/queue changes
  React.useEffect(() => {
    if (!currentFile) return;
    let cancelled = false;
    let decodedRef: DecodedImage | null = null;
    let objectUrl = '';

    void normalizeImageFileForBrowser(currentFile)
      .then(async (browserFile) => {
        if (cancelled) return;
        const url = URL.createObjectURL(browserFile);
        objectUrl = url;
        const res = await decodeImageFile(browserFile);
        if (cancelled) {
          res.cleanup();
          URL.revokeObjectURL(url);
          objectUrl = '';
          return;
        }
        decodedRef = res;
        setLoadError(null);
        setLoaded({ file: currentFile, normalizedFile: browserFile, decoded: res, sourceUrl: url });
      })
      .catch((err) => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = '';
        }
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Unable to load image.');
          setLoaded(null);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      decodedRef?.cleanup();
    };
  }, [currentFile]);

  const isFreeCrop = purpose !== 'users';

  // Base frame keeps the image fixed in place (especially when resizing Free crop)
  const baseFrame: FrameRect = React.useMemo(() => {
    if (!decoded) {
      return computeAspectFrame(stageSize.width, stageSize.height, 1);
    }
    const ratio = isFreeCrop ? decoded.width / decoded.height : (profile.defaultAspect ?? 1);
    return computeAspectFrame(stageSize.width, stageSize.height, ratio);
  }, [decoded, stageSize, isFreeCrop, profile.defaultAspect]);

  // Minimum scale so the image always covers baseFrame
  const minScale = React.useMemo(() => {
    if (!decoded) return 1;
    return Math.max(baseFrame.width / decoded.width, baseFrame.height / decoded.height);
  }, [decoded, baseFrame]);

  const scale = minScale * zoom;

  const clampedPan = React.useMemo(() => {
    if (!decoded) return { x: 0, y: 0 };
    const maxX = Math.max(0, (decoded.width * scale - baseFrame.width) / 2);
    const maxY = Math.max(0, (decoded.height * scale - baseFrame.height) / 2);
    return {
      x: clamp(pan.x, -maxX, maxX),
      y: clamp(pan.y, -maxY, maxY),
    };
  }, [decoded, scale, baseFrame, pan]);

  // Visible image bounds in stage coordinates (for clamping Free crop handles)
  const imageBounds: FrameRect = React.useMemo(() => {
    if (!decoded) return baseFrame;
    const w = decoded.width * scale;
    const h = decoded.height * scale;
    const left = baseFrame.x + baseFrame.width / 2 + clampedPan.x - w / 2;
    const top = baseFrame.y + baseFrame.height / 2 + clampedPan.y - h / 2;
    const clampedLeft = Math.max(STAGE_PAD, left);
    const clampedTop = Math.max(STAGE_PAD, top);
    const clampedRight = Math.min(stageSize.width - STAGE_PAD, left + w);
    const clampedBottom = Math.min(stageSize.height - STAGE_PAD, top + h);
    return {
      x: clampedLeft,
      y: clampedTop,
      width: Math.max(MIN_CROP_PX, clampedRight - clampedLeft),
      height: Math.max(MIN_CROP_PX, clampedBottom - clampedTop),
    };
  }, [decoded, scale, baseFrame, clampedPan, stageSize]);

  // Current crop frame in stage coordinates (defaults to 1:1 square in free-crop mode)
  const cropFrame: FrameRect = React.useMemo(() => {
    if (!isFreeCrop) {
      return baseFrame;
    }
    if (freeBox) {
      const x = clamp(freeBox.x, imageBounds.x, imageBounds.x + imageBounds.width - MIN_CROP_PX);
      const y = clamp(freeBox.y, imageBounds.y, imageBounds.y + imageBounds.height - MIN_CROP_PX);
      const w = clamp(freeBox.width, MIN_CROP_PX, imageBounds.x + imageBounds.width - x);
      const h = clamp(freeBox.height, MIN_CROP_PX, imageBounds.y + imageBounds.height - y);
      return { x, y, width: w, height: h };
    }
    const side = Math.max(MIN_CROP_PX, Math.min(baseFrame.width, baseFrame.height));
    return {
      x: baseFrame.x + (baseFrame.width - side) / 2,
      y: baseFrame.y + (baseFrame.height - side) / 2,
      width: side,
      height: side,
    };
  }, [isFreeCrop, freeBox, baseFrame, imageBounds]);

  const computeNaturalCrop = React.useCallback((): CropRect | undefined => {
    if (!decoded) return undefined;
    const imgLeft = baseFrame.x + baseFrame.width / 2 + clampedPan.x - (decoded.width * scale) / 2;
    const imgTop = baseFrame.y + baseFrame.height / 2 + clampedPan.y - (decoded.height * scale) / 2;
    return {
      x: (cropFrame.x - imgLeft) / scale,
      y: (cropFrame.y - imgTop) / scale,
      width: cropFrame.width / scale,
      height: cropFrame.height / scale,
    };
  }, [decoded, baseFrame, cropFrame, clampedPan, scale]);

  // Pointer drag state (panning image, moving free-crop box, or resizing free-crop corners)
  const dragRef = React.useRef<
    | { type: 'pan'; startX: number; startY: number; origPanX: number; origPanY: number }
    | { type: 'moveBox'; startX: number; startY: number; origBox: FrameRect }
    | { type: 'corner'; corner: Corner; startX: number; startY: number; origBox: FrameRect }
    | null
  >(null);

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (!decoded) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (isFreeCrop) {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const insideBox =
        px >= cropFrame.x &&
        px <= cropFrame.x + cropFrame.width &&
        py >= cropFrame.y &&
        py <= cropFrame.y + cropFrame.height;
      if (insideBox) {
        dragRef.current = {
          type: 'moveBox',
          startX: e.clientX,
          startY: e.clientY,
          origBox: cropFrame,
        };
        return;
      }
    }

    dragRef.current = {
      type: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      origPanX: clampedPan.x,
      origPanY: clampedPan.y,
    };
  };

  const onCornerPointerDown = (corner: Corner) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!isFreeCrop || !decoded) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      type: 'corner',
      corner,
      startX: e.clientX,
      startY: e.clientY,
      origBox: cropFrame,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !decoded) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.type === 'pan') {
      const maxX = Math.max(0, (decoded.width * scale - baseFrame.width) / 2);
      const maxY = Math.max(0, (decoded.height * scale - baseFrame.height) / 2);
      setPan({
        x: clamp(drag.origPanX + dx, -maxX, maxX),
        y: clamp(drag.origPanY + dy, -maxY, maxY),
      });
    } else if (drag.type === 'moveBox') {
      const b = drag.origBox;
      const nextX = clamp(b.x + dx, imageBounds.x, imageBounds.x + imageBounds.width - b.width);
      const nextY = clamp(b.y + dy, imageBounds.y, imageBounds.y + imageBounds.height - b.height);
      setFreeBox({ x: nextX, y: nextY, width: b.width, height: b.height });
    } else {
      const b = drag.origBox;
      const minX = imageBounds.x;
      const minY = imageBounds.y;
      const maxR = imageBounds.x + imageBounds.width;
      const maxB = imageBounds.y + imageBounds.height;
      let left = b.x;
      let top = b.y;
      let right = b.x + b.width;
      let bottom = b.y + b.height;

      if (drag.corner === 'nw' || drag.corner === 'sw') {
        left = clamp(b.x + dx, minX, right - MIN_CROP_PX);
      }
      if (drag.corner === 'ne' || drag.corner === 'se') {
        right = clamp(b.x + b.width + dx, left + MIN_CROP_PX, maxR);
      }
      if (drag.corner === 'nw' || drag.corner === 'ne') {
        top = clamp(b.y + dy, minY, bottom - MIN_CROP_PX);
      }
      if (drag.corner === 'sw' || drag.corner === 'se') {
        bottom = clamp(b.y + b.height + dy, top + MIN_CROP_PX, maxB);
      }
      setFreeBox({ x: left, y: top, width: right - left, height: bottom - top });
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFreeBox(null);
  };

  const finishWithFiles = async (finalFiles: File[]) => {
    setSubmitting(true);
    setProgressText(`Uploading ${finalFiles.length} optimized image(s)…`);
    try {
      await onConfirm(finalFiles);
    } finally {
      setSubmitting(false);
      setProgressText('');
    }
  };

  const handleConfirmCurrent = async (useUncroppedOriginal: boolean) => {
    if (!currentFile || !decoded || !loaded) return;
    setSubmitting(true);
    setProgressText('Optimizing image…');
    try {
      const processed = await processImageFile(loaded.normalizedFile, {
        crop: useUncroppedOriginal ? undefined : computeNaturalCrop(),
        maxWidth: profile.maxWidth,
        maxHeight: profile.maxHeight,
        quality: profile.quality,
        decoded,
      });
      const nextReady = [...readyFiles, processed.file];
      if (index + 1 < queue.length) {
        setReadyFiles(nextReady);
        setIndex(index + 1);
        handleReset();
        setSubmitting(false);
        setProgressText('');
      } else {
        await finishWithFiles(nextReady);
      }
    } catch (err) {
      toast.error('Optimization failed', {
        description: err instanceof Error ? err.message : undefined,
      });
      setSubmitting(false);
      setProgressText('');
    }
  };

  const handleOptimizeAllRemaining = async () => {
    if (!currentFile || !decoded || !loaded) return;
    setSubmitting(true);
    try {
      const currentProcessed = await processImageFile(loaded.normalizedFile, {
        crop: computeNaturalCrop(),
        maxWidth: profile.maxWidth,
        maxHeight: profile.maxHeight,
        quality: profile.quality,
        decoded,
      });
      const batch: File[] = [...readyFiles, currentProcessed.file];
      for (let i = index + 1; i < queue.length; i++) {
        setProgressText(`Optimizing ${i + 1} of ${queue.length}…`);
        const res = await processImageFile(queue[i]!, {
          maxWidth: profile.maxWidth,
          maxHeight: profile.maxHeight,
          quality: profile.quality,
        });
        batch.push(res.file);
      }
      await finishWithFiles(batch);
    } catch (err) {
      toast.error('Optimization failed', {
        description: err instanceof Error ? err.message : undefined,
      });
      setSubmitting(false);
      setProgressText('');
    }
  };

  const imgStyle: React.CSSProperties = decoded
    ? {
        width: decoded.width * scale,
        height: decoded.height * scale,
        left: baseFrame.x + baseFrame.width / 2 + clampedPan.x - (decoded.width * scale) / 2,
        top: baseFrame.y + baseFrame.height / 2 + clampedPan.y - (decoded.height * scale) / 2,
      }
    : {};

  return (
    <Dialog open onOpenChange={(o) => !o && !submitting && onCancel()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span>{profile.label}</span>
            {queue.length > 1 && (
              <span className="bg-well text-muted rounded-full px-2.5 py-0.5 text-xs font-medium">
                {index + 1} / {queue.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {loadError ? (
            <div className="bg-danger-soft text-danger rounded-xl p-4 text-sm">{loadError}</div>
          ) : (
            <>
              {/* Interactive Crop Stage */}
              <div
                ref={setStageEl}
                onPointerDown={onStagePointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={(e) => {
                  if (!decoded || submitting) return;
                  e.preventDefault();
                  setZoom((z) => clamp(Number((z - e.deltaY * 0.0015).toFixed(2)), 1, 3));
                }}
                className="relative h-[240px] w-full cursor-grab touch-none overflow-hidden rounded-xl bg-slate-950 select-none active:cursor-grabbing sm:h-[340px]"
              >
                {!decoded && (
                  <div className="absolute inset-0 grid place-items-center">
                    <Spinner size="md" />
                  </div>
                )}
                {decoded && sourceUrl && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sourceUrl}
                      alt=""
                      draggable={false}
                      style={imgStyle}
                      className="pointer-events-none absolute max-w-none"
                    />
                    {/* Dark scrim outside crop box */}
                    <div
                      style={{
                        left: cropFrame.x,
                        top: cropFrame.y,
                        width: cropFrame.width,
                        height: cropFrame.height,
                        boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.65)',
                      }}
                      className={cn(
                        'pointer-events-none absolute border-2 border-white/90',
                        profile.circularMask && 'rounded-full',
                      )}
                    >
                      {!profile.circularMask && (
                        <>
                          <span className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
                          <span className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
                          <span className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
                          <span className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
                        </>
                      )}
                    </div>

                    {/* Corner resize handles in Free mode */}
                    {isFreeCrop && (
                      <>
                        {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                          <button
                            key={corner}
                            type="button"
                            aria-label={`Resize ${corner}`}
                            onPointerDown={onCornerPointerDown(corner)}
                            style={{
                              left:
                                corner === 'nw' || corner === 'sw'
                                  ? cropFrame.x - 8
                                  : cropFrame.x + cropFrame.width - 8,
                              top:
                                corner === 'nw' || corner === 'ne'
                                  ? cropFrame.y - 8
                                  : cropFrame.y + cropFrame.height - 8,
                            }}
                            className={cn(
                              'bg-brand absolute size-4 rounded-full border-2 border-white shadow',
                              corner === 'nw' || corner === 'se'
                                ? 'cursor-nwse-resize'
                                : 'cursor-nesw-resize',
                            )}
                          />
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Zoom & Reset row */}
              <div className="flex items-center gap-3">
                <span className="text-muted text-xs font-medium">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.02}
                  value={zoom}
                  disabled={submitting || !decoded}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="accent-brand h-1.5 min-w-0 flex-1 cursor-pointer"
                />
                <span className="text-muted w-10 text-right text-xs tabular-nums">
                  {zoom.toFixed(1)}×
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={submitting}
                  onClick={handleReset}
                >
                  Reset
                </Button>
              </div>
            </>
          )}
        </DialogBody>

        <DialogFooter className="flex-wrap justify-end gap-2">
          {queue.length > 1 && index + 1 < queue.length && (
            <Button
              type="button"
              variant="secondary"
              disabled={submitting || !decoded}
              onClick={() => void handleOptimizeAllRemaining()}
              className="w-full sm:mr-auto sm:w-auto"
            >
              Auto-optimize all ({queue.length - index})
            </Button>
          )}
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting || !decoded}
              onClick={() => void handleConfirmCurrent(true)}
              className="flex-1 sm:flex-initial"
            >
              Upload original
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={submitting || !decoded}
              onClick={() => void handleConfirmCurrent(false)}
              className="flex-1 sm:flex-initial"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" /> {progressText || 'Uploading…'}
                </>
              ) : index + 1 < queue.length ? (
                `Crop & next (${index + 1}/${queue.length})`
              ) : (
                <>
                  <Icon name="upload" size={15} /> Crop &amp; upload
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
