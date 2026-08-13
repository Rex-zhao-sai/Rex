const isVercel = process.env.VERCEL === '1';
const isGitHubPages = process.env.GITHUB_PAGES === '1';

// GitHub Pages 仓库名是 Rex，基础路径已经是 /Rex，不需要额外设置 basePath
const nextConfig = {
  output: isGitHubPages ? 'export' : undefined,
  basePath: isGitHubPages ? undefined : undefined,
  allowedDevOrigins: ['*.dev.coze.site', 'localhost:3000'],
  images: {
    unoptimized: isGitHubPages,
  },
};

module.exports = nextConfig;
