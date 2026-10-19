'use client';

import * as React from 'react';
import Image, { type ImageProps } from 'next/image';

import { cloudinaryLoader, isCloudinaryUrl, PLACEHOLDER_IMAGE } from '@lib/images';
import { cn } from '@lib/utils';

type Props = Omit<ImageProps, 'src' | 'loader' | 'unoptimized' | 'alt'> & {
  src?: string | null;
  alt: string;
};

/**
 * Renders any product/catalog image through next/image:
 *  - Cloudinary uploads → resized, AVIF/WebP, auto-quality via the Cloudinary CDN
 *  - external supplier URLs → loaded directly (no optimizer proxy for unknown hosts)
 * Falls back to the brand placeholder if the source is missing or fails.
 */
export function ProductImage({ src, alt, className, ...rest }: Props) {
  const [failed, setFailed] = React.useState(false);
  const resolved = !src || failed ? PLACEHOLDER_IMAGE : src;
  const cloud = isCloudinaryUrl(resolved);

  return (
    <Image
      {...rest}
      src={resolved}
      alt={alt}
      loader={cloud ? cloudinaryLoader : undefined}
      unoptimized={!cloud}
      referrerPolicy={cloud ? undefined : 'no-referrer'}
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}
