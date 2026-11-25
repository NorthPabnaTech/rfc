import type { MetadataRoute } from 'next';

import { PLATFORM } from '@config/platform';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/seller', '/api'] }],
    host: PLATFORM.appUrl,
  };
}
