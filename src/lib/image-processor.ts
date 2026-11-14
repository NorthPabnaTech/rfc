'use client';

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DecodedImage = {
  width: number;
  height: number;
  draw: (
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) => void;
  cleanup: () => void;
};

export type ProcessedImageResult = {
  file: File;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  skippedCompression: boolean;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

/**
 * Decodes an image file while respecting EXIF orientation when supported by the
 * browser (`createImageBitmap(..., { imageOrientation: 'from-image' })`), with
 * an HTMLImageElement fallback.
 */
export async function decodeImageFile(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, sx, sy, sw, sh, dx, dy, dw, dh) => {
          ctx.drawImage(bitmap, sx, sy, sw, sh, dx, dy, dw, dh);
        },
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image file.'));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, sx, sy, sw, sh, dx, dy, dw, dh) => {
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      },
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function replaceExtension(filename: string, ext: string): string {
  const base = filename.replace(/\.[^/.]+$/, '') || 'image';
  return `${base}.${ext}`;
}

/**
 * Crops (optional), resizes within `maxWidth × maxHeight` without upscaling,
 * strips EXIF/metadata via Canvas, and encodes to WebP (with JPEG fallback).
 * Avoids re-encoding if an uncropped WebP/AVIF is already within bounds and <= 120 KB.
 */
export async function processImageFile(
  file: File,
  options: {
    crop?: CropRect;
    maxWidth: number;
    maxHeight: number;
    quality?: number;
    decoded?: DecodedImage;
  },
): Promise<ProcessedImageResult> {
  const ownDecoded = !options.decoded;
  const decoded = options.decoded ?? (await decodeImageFile(file));

  try {
    const srcX = options.crop ? Math.max(0, Math.round(options.crop.x)) : 0;
    const srcY = options.crop ? Math.max(0, Math.round(options.crop.y)) : 0;
    const srcW = options.crop
      ? Math.max(1, Math.min(decoded.width - srcX, Math.round(options.crop.width)))
      : decoded.width;
    const srcH = options.crop
      ? Math.max(1, Math.min(decoded.height - srcY, Math.round(options.crop.height)))
      : decoded.height;

    const isUncropped =
      !options.crop ||
      (srcX === 0 && srcY === 0 && srcW === decoded.width && srcH === decoded.height);

    // Avoid unnecessary re-encoding for already-optimized WebP/AVIF images
    if (
      isUncropped &&
      decoded.width <= options.maxWidth &&
      decoded.height <= options.maxHeight &&
      (file.type === 'image/webp' || file.type === 'image/avif') &&
      file.size <= 120 * 1024
    ) {
      return {
        file,
        width: decoded.width,
        height: decoded.height,
        originalSize: file.size,
        optimizedSize: file.size,
        skippedCompression: true,
      };
    }

    const scale = Math.min(1, options.maxWidth / srcW, options.maxHeight / srcH);
    const outW = Math.max(1, Math.round(srcW * scale));
    const outH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is unavailable.');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    decoded.draw(ctx, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

    const quality = options.quality ?? 0.84;
    let blob = await canvasToBlob(canvas, 'image/webp', quality);
    let outType = 'image/webp';
    let outExt = 'webp';

    if (!blob || blob.type !== 'image/webp') {
      blob = await canvasToBlob(canvas, 'image/jpeg', Math.min(0.9, quality + 0.04));
      outType = 'image/jpeg';
      outExt = 'jpg';
    }

    if (!blob) throw new Error('Failed to encode optimized image.');

    // If uncropped, within target bounds, and re-encoding produced a larger file, keep original
    if (
      isUncropped &&
      decoded.width <= options.maxWidth &&
      decoded.height <= options.maxHeight &&
      blob.size >= file.size
    ) {
      return {
        file,
        width: decoded.width,
        height: decoded.height,
        originalSize: file.size,
        optimizedSize: file.size,
        skippedCompression: true,
      };
    }

    const optimizedFile = new File([blob], replaceExtension(file.name, outExt), {
      type: outType,
      lastModified: Date.now(),
    });

    return {
      file: optimizedFile,
      width: outW,
      height: outH,
      originalSize: file.size,
      optimizedSize: optimizedFile.size,
      skippedCompression: false,
    };
  } finally {
    if (ownDecoded) decoded.cleanup();
  }
}
