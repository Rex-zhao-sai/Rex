const isVercel = process.env.VERCEL === '1';
const isGitHubPages = process.env.GITHUB_PAGES === '1';

const nextConfig = {
  output: isGitHubPages ? 'export' : undefined,
  basePath: isGitHubPages ? '/Rex' : undefined,
  allowedDevOrigins: ['*.dev.coze.site', 'localhost:3000'],
  images: {
    unoptimized: isGitHubPages,
  },
  // 静态导出时排除 API 路由
  exportPathMap: async function (defaultPathMap) {
    if (isGitHubPages) {
      const filtered = {};
      for (const [key, value] of Object.entries(defaultPathMap)) {
        // 排除所有 /api/ 路由
        if (!key.startsWith('/api/')) {
          filtered[key] = value;
        }
      }
      return filtered;
    }
    return defaultPathMap;
  },
};

module.exports = nextConfig;
