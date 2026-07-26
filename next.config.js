const isVercel = process.env.VERCEL === '1';
const isGitHubPages = process.env.GITHUB_PAGES === '1';
const isGiteePages = process.env.GITEE_PAGES === '1';
const isCloudflarePages = process.env.CLOUDFLARE_PAGES === '1' || process.env.CF_PAGES === '1';

// 默认使用静态导出（纯前端项目，使用 localStorage 存储）
const useStaticExport = isGitHubPages || isGiteePages || isCloudflarePages || !isVercel;

const nextConfig = {
  output: useStaticExport ? 'export' : undefined,
  basePath: isGitHubPages ? '/Rex' : isGiteePages ? '/shebeibaoyang' : undefined,
  allowedDevOrigins: ['*.dev.coze.site', 'localhost:3000'],
  images: {
    unoptimized: useStaticExport,
  },
};

module.exports = nextConfig;
