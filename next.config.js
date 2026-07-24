const isVercel = process.env.VERCEL === '1';
const isGitHubPages = process.env.GITHUB_PAGES === '1';

const nextConfig = {
  output: isGitHubPages ? 'export' : undefined,
  basePath: isGitHubPages ? '/Rex' : undefined,
  allowedDevOrigins: ['*.dev.coze.site', 'localhost:3000'],
  images: {
    unoptimized: isGitHubPages,
  },
};

module.exports = nextConfig;
