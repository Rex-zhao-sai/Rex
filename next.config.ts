import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Rex',
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
