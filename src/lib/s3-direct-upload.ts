/**
 * 客户端直传 S3 工具
 * 从预生成的 URL 池中获取上传 URL，直接上传到 S3
 */

import { getBasePath } from './utils';

interface UploadUrl {
  key: string;
  url: string;
  expiresAt: string;
}

const UPLOAD_URLS_CACHE_KEY = "upload_urls_cache";
const USED_URLS_KEY = "used_upload_urls";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 分钟缓存

let urlCache: UploadUrl[] | null = null;
let cacheTimestamp = 0;

/**
 * 获取可用的上传 URL
 */
export async function getUploadUrl(): Promise<{ key: string; url: string } | null> {
  // 加载 URL 列表
  const urls = await loadUploadUrls();
  if (!urls || urls.length === 0) {
    return null;
  }

  // 获取已使用的 URL
  const usedUrls = getUsedUrls();

  // 找到未使用且未过期的 URL
  const now = Date.now();
  const availableUrl = urls.find((u) => {
    if (usedUrls.has(u.key)) return false;
    if (new Date(u.expiresAt).getTime() < now) return false;
    return true;
  });

  if (!availableUrl) {
    console.warn("[Upload] No available upload URLs");
    return null;
  }

  // 标记为已使用
  markUrlAsUsed(availableUrl.key);

  return {
    key: availableUrl.key,
    url: availableUrl.url,
  };
}

/**
 * 上传文件到 S3
 */
export async function uploadToS3Direct(
  blob: Blob,
  fileName: string,
  pairId: string,
  type: "before" | "after"
): Promise<string | null> {
  // 获取上传 URL
  const uploadUrl = await getUploadUrl();
  if (!uploadUrl) {
    throw new Error("没有可用的上传 URL，请刷新页面重试");
  }

  try {
    // 直接 PUT 上传到 S3
    const response = await fetch(uploadUrl.url, {
      method: "PUT",
      body: blob,
      headers: {
        "Content-Type": "image/jpeg",
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return uploadUrl.key;
  } catch (error) {
    console.error("[Upload] Direct upload error:", error);
    throw error;
  }
}

/**
 * 加载上传 URL 列表
 */
async function loadUploadUrls(): Promise<UploadUrl[]> {
  // 检查缓存
  if (urlCache && Date.now() - cacheTimestamp < CACHE_EXPIRY_MS) {
    return urlCache;
  }

  try {
    const basePath = getBasePath();
    const url = `${basePath}/upload-urls.json`;
    console.log("[Upload] Fetching upload URLs from:", url);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[Upload] Failed to load upload URLs: ${response.status} ${response.statusText} from ${url}`);
      // 如果带 basePath 失败，尝试不带 basePath（兜底）
      if (basePath) {
        console.log("[Upload] Trying fallback without basePath...");
        const fallbackResponse = await fetch('/upload-urls.json');
        if (fallbackResponse.ok) {
          console.log("[Upload] Fallback succeeded without basePath");
          urlCache = await fallbackResponse.json();
          cacheTimestamp = Date.now();
          localStorage.setItem(UPLOAD_URLS_CACHE_KEY, JSON.stringify({
            urls: urlCache,
            timestamp: cacheTimestamp,
          }));
          return urlCache || [];
        }
      }
      return [];
    }

    urlCache = await response.json();
    cacheTimestamp = Date.now();

    // 缓存到 localStorage
    localStorage.setItem(UPLOAD_URLS_CACHE_KEY, JSON.stringify({
      urls: urlCache,
      timestamp: cacheTimestamp,
    }));

    return urlCache || [];
  } catch (error) {
    console.error("[Upload] Error loading upload URLs:", error);

    // 尝试从 localStorage 加载
    try {
      const cached = localStorage.getItem(UPLOAD_URLS_CACHE_KEY);
      if (cached) {
        const { urls, timestamp } = JSON.parse(cached);
        urlCache = urls;
        cacheTimestamp = timestamp;
        return urls;
      }
    } catch {}

    return [];
  }
}

/**
 * 获取已使用的 URL 集合
 */
function getUsedUrls(): Set<string> {
  try {
    const used = localStorage.getItem(USED_URLS_KEY);
    if (used) {
      return new Set(JSON.parse(used));
    }
  } catch {}
  return new Set();
}

/**
 * 标记 URL 为已使用
 */
function markUrlAsUsed(key: string): void {
  const usedUrls = getUsedUrls();
  usedUrls.add(key);
  localStorage.setItem(USED_URLS_KEY, JSON.stringify([...usedUrls]));
}

/**
 * 清理过期的已使用 URL 记录
 */
export function cleanupUsedUrls(): void {
  const urls = urlCache || [];
  const usedUrls = getUsedUrls();
  const now = Date.now();

  // 移除已过期的 URL
  const expiredKeys = new Set(
    urls.filter((u) => new Date(u.expiresAt).getTime() < now).map((u) => u.key)
  );

  const newUsedUrls = [...usedUrls].filter((key) => !expiredKeys.has(key));
  localStorage.setItem(USED_URLS_KEY, JSON.stringify(newUsedUrls));
}
