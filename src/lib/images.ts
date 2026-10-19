/**
 * Client-safe image URL helpers.
 *
 * Cloudinary images are delivered through a transformation URL so the CDN
 * resizes them to the rendered width and picks the best format (AVIF/WebP)
 * and quality for each browser. External supplier URLs are used as-is.
 */

export type ImageLike = { type: 'cloudinary' | 'external'; url: string } | string;

const UPLOAD_SEGMENT = '/image/upload/';

export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com/') && url.includes(UPLOAD_SEGMENT);
}

/** Inserts `f_auto,q_auto,w_<width>` into a Cloudinary delivery URL. */
export function cloudinaryUrl(
  url: string,
  width?: number,
  quality: number | 'auto' = 'auto',
): string {
  if (!isCloudinaryUrl(url)) return url;
  const parts = ['f_auto', `q_${quality}`, 'c_limit'];
  if (width) parts.push(`w_${Math.round(width)}`);
  return url.replace(UPLOAD_SEGMENT, `${UPLOAD_SEGMENT}${parts.join(',')}/`);
}

/** next/image loader for Cloudinary images. */
export function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return cloudinaryUrl(src, width, quality ?? 'auto');
}

export function imageSrc(image: ImageLike | undefined | null): string | undefined {
  if (!image) return undefined;
  return typeof image === 'string' ? image : image.url;
}

export const PLACEHOLDER_IMAGE = '/brand/placeholder.svg';
