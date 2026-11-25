import type { MetadataRoute } from 'next';

import { PLATFORM } from '@config/platform';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PLATFORM.name,
    short_name: PLATFORM.name,
    description: PLATFORM.tagline,
    start_url: '/',
    display: 'standalone',
    background_color: '#023047',
    theme_color: '#023047',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
