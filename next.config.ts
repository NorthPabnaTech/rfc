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
};

export default nextConfig;
