import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Image uploads (product/review/return photos) go through server actions and
  // the upload route as multipart bodies; 1 MB default is too small.
  experimental: {
    serverActions: { bodySizeLimit: '12mb' },
  },
  images: {
    // Cloudinary images are resized by Cloudinary itself (see lib/images.ts).
    // External supplier images can live on any host, so they are rendered
    // unoptimized rather than opening the image optimizer to every domain.
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // No framing (clickjacking on admin/checkout), no <base>/plugin tricks.
          // A full script CSP is left out: Pusher, Google sign-in and supplier
          // images need a tested allowlist first.
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
