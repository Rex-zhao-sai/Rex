import type { NextConfig } from 'next';

const isVercel = process.env.VERCEL === '1';
const isGitHubPages = process.env.GITHUB_PAGES === '1';

const nextConfig: NextConfig = {
  output: isGitHubPages ? 'export' : undefined,
  basePath: isGitHubPages ? '/Rex' : undefined,
  allowedDevOrigins: ['*.dev.coze.site', 'localhost:3000'],
  images: {
    unoptimized: isGitHubPages,
  },
};

export default nextConfig;
