const isVercel = process.env.VERCEL === '1';
const isGitHubPages = process.env.GITHUB_PAGES === '1';
const isGiteePages = process.env.GITEE_PAGES === '1';

const nextConfig = {
  output: isGitHubPages || isGiteePages ? 'export' : undefined,
  basePath: isGitHubPages ? '/Rex' : isGiteePages ? '/shebeibaoyang' : undefined,
  allowedDevOrigins: ['*.dev.coze.site', 'localhost:3000'],
  images: {
    unoptimized: isGitHubPages || isGiteePages,
  },
};

module.exports = nextConfig;
