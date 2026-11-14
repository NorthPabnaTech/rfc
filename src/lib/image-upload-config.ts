import type { BannerPosition, UploadPurpose } from '@lib/constants';

export type AspectPreset = {
  id: string;
  label: string;
  /** Aspect ratio (width / height). `null` means free/original aspect ratio. */
  ratio: number | null;
};

export type UploadImageProfile = {
  label: string;
  /** Default aspect ratio on open (`null` preserves original image aspect ratio). */
  defaultAspect: number | null;
  /** Show a circular crop guide (e.g. profile avatars). */
  circularMask?: boolean;
  maxWidth: number;
  maxHeight: number;
  /** Target WebP/JPEG encoding quality (0..1). */
  quality: number;
  presets: AspectPreset[];
};

const BANNER_PROFILES: Record<BannerPosition, UploadImageProfile> = {
  hero: {
    label: 'Hero banner',
    defaultAspect: 1600 / 640,
    maxWidth: 1600,
    maxHeight: 640,
    quality: 0.85,
    presets: [
      { id: 'recommended', label: '5:2 (Hero)', ratio: 1600 / 640 },
      { id: '16:9', label: '16:9', ratio: 16 / 9 },
      { id: 'free', label: 'Free', ratio: null },
    ],
  },
  hero_side: {
    label: 'Hero side card',
    defaultAspect: 800 / 640,
    maxWidth: 800,
    maxHeight: 640,
    quality: 0.85,
    presets: [
      { id: 'recommended', label: '5:4 (Side)', ratio: 800 / 640 },
      { id: '1:1', label: '1:1', ratio: 1 },
      { id: 'free', label: 'Free', ratio: null },
    ],
  },
  special: {
    label: 'Special offer banner',
    defaultAspect: 1600 / 480,
    maxWidth: 1600,
    maxHeight: 480,
    quality: 0.85,
    presets: [
      { id: 'recommended', label: '10:3 (Wide)', ratio: 1600 / 480 },
      { id: '16:9', label: '16:9', ratio: 16 / 9 },
      { id: 'free', label: 'Free', ratio: null },
    ],
  },
  combo: {
    label: 'Combo page banner',
    defaultAspect: 1600 / 480,
    maxWidth: 1600,
    maxHeight: 480,
    quality: 0.85,
    presets: [
      { id: 'recommended', label: '10:3 (Wide)', ratio: 1600 / 480 },
      { id: '16:9', label: '16:9', ratio: 16 / 9 },
      { id: 'free', label: 'Free', ratio: null },
    ],
  },
};

export function getUploadImageProfile(
  purpose: UploadPurpose,
  bannerPosition?: BannerPosition,
): UploadImageProfile {
  if (purpose === 'banners') {
    return BANNER_PROFILES[bannerPosition ?? 'hero'];
  }

  switch (purpose) {
    case 'products':
      return {
        label: 'Product image',
        defaultAspect: 1,
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.84,
        presets: [
          { id: '1:1', label: '1:1 (Square)', ratio: 1 },
          { id: '4:5', label: '4:5', ratio: 4 / 5 },
          { id: '4:3', label: '4:3', ratio: 4 / 3 },
          { id: 'free', label: 'Free', ratio: null },
        ],
      };
    case 'categories':
      return {
        label: 'Category image',
        defaultAspect: 1,
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.84,
        presets: [
          { id: '1:1', label: '1:1 (Square)', ratio: 1 },
          { id: '4:3', label: '4:3', ratio: 4 / 3 },
          { id: 'free', label: 'Free', ratio: null },
        ],
      };
    case 'users':
      return {
        label: 'Profile photo',
        defaultAspect: 1,
        circularMask: true,
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.84,
        presets: [
          { id: '1:1', label: '1:1 (Square)', ratio: 1 },
          { id: 'free', label: 'Free', ratio: null },
        ],
      };
    case 'reviews':
      return {
        label: 'Review photo',
        defaultAspect: null,
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.82,
        presets: [
          { id: 'free', label: 'Original / Free', ratio: null },
          { id: '1:1', label: '1:1', ratio: 1 },
          { id: '4:3', label: '4:3', ratio: 4 / 3 },
        ],
      };
    case 'returns':
      return {
        label: 'Return evidence photo',
        defaultAspect: null,
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.82,
        presets: [
          { id: 'free', label: 'Original / Free', ratio: null },
          { id: '1:1', label: '1:1', ratio: 1 },
          { id: '4:3', label: '4:3', ratio: 4 / 3 },
        ],
      };
    case 'expenses':
      return {
        label: 'Receipt / Expense',
        defaultAspect: null,
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.84,
        presets: [
          { id: 'free', label: 'Original / Free', ratio: null },
          { id: '3:4', label: '3:4 (Receipt)', ratio: 3 / 4 },
          { id: '1:1', label: '1:1', ratio: 1 },
        ],
      };
  }
}
