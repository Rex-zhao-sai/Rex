// GitHub Releases 照片存储服务
import { Octokit } from "@octokit/rest";

// 从环境变量获取配置
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN || "";
const OWNER = process.env.NEXT_PUBLIC_GITHUB_PHOTO_OWNER || "Rex-zhao-sai";
const REPO = process.env.NEXT_PUBLIC_GITHUB_PHOTO_REPO || "maintenance-photos";
const RELEASE_TAG = "latest";

// 创建 Octokit 客户端
const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

// 获取或创建 Release
async function getOrCreateRelease() {
  try {
    const { data } = await octokit.repos.getReleaseByTag({
      owner: OWNER,
      repo: REPO,
      tag: RELEASE_TAG,
    });
    return data;
  } catch {
    // Release 不存在，创建新的
    const { data } = await octokit.repos.createRelease({
      owner: OWNER,
      repo: REPO,
      tag_name: RELEASE_TAG,
      name: "Latest Photos",
      body: "设备保养照片存储",
      prerelease: false,
    });
    return data;
  }
}

// 上传照片到 GitHub Releases
export async function uploadPhoto(
  equipmentId: string,
  file: File,
  type: "before" | "after"
): Promise<string> {
  if (!GITHUB_TOKEN) {
    throw new Error("GitHub Token 未配置，请在环境变量中设置 NEXT_PUBLIC_GITHUB_TOKEN");
  }

  // 生成文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const fileName = `${equipmentId}/${timestamp}-${type}.jpg`;

  // 获取 Release
  const release = await getOrCreateRelease();

  // 读取文件内容
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 上传到 Release
  await octokit.repos.uploadReleaseAsset({
    owner: OWNER,
    repo: REPO,
    release_id: release.id,
    name: fileName,
    data: buffer as any,
    headers: {
      "content-type": file.type || "image/jpeg",
      "content-length": buffer.length,
    },
  });

  // 返回下载 URL
  return `https://github.com/${OWNER}/${REPO}/releases/download/${RELEASE_TAG}/${fileName}`;
}

// 批量上传照片对
export async function uploadPhotoPair(
  equipmentId: string,
  beforeFile: File,
  afterFile: File
): Promise<{ before: string; after: string }> {
  const [beforeUrl, afterUrl] = await Promise.all([
    uploadPhoto(equipmentId, beforeFile, "before"),
    uploadPhoto(equipmentId, afterFile, "after"),
  ]);

  return { before: beforeUrl, after: afterUrl };
}

// 获取所有照片列表
export async function listPhotos(): Promise<Array<{ name: string; url: string }>> {
  if (!GITHUB_TOKEN) {
    return [];
  }

  try {
    const release = await getOrCreateRelease();
    return release.assets.map((asset) => ({
      name: asset.name,
      url: asset.browser_download_url,
    }));
  } catch {
    return [];
  }
}

// 删除照片
export async function deletePhoto(fileName: string): Promise<void> {
  if (!GITHUB_TOKEN) {
    throw new Error("GitHub Token 未配置");
  }

  const release = await getOrCreateRelease();
  const asset = release.assets.find((a) => a.name === fileName);

  if (asset) {
    await octokit.repos.deleteReleaseAsset({
      owner: OWNER,
      repo: REPO,
      asset_id: asset.id,
    });
  }
}

// 存储使用情况
export interface StorageUsage {
  totalSize: number;        // 总大小（字节）
  totalSizeMB: string;      // 总大小（MB，格式化）
  fileCount: number;        // 文件数量
  limitGB: number;          // 限制（GB）
  limitMB: number;          // 限制（MB）
  usagePercent: string;     // 使用百分比
  repoName: string;         // 仓库名称
}

// 获取存储使用情况
export async function getStorageUsage(): Promise<StorageUsage> {
  if (!GITHUB_TOKEN) {
    throw new Error("GitHub Token 未配置");
  }

  const release = await getOrCreateRelease();
  
  // 计算总大小
  const totalSize = release.assets.reduce((sum, asset) => sum + asset.size, 0);
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
  const fileCount = release.assets.length;
  
  // GitHub Releases 限制：单个 Release 2GB
  const limitGB = 2;
  const limitMB = limitGB * 1024;
  const usageMB = totalSize / 1024 / 1024;
  const usagePercent = ((usageMB / limitMB) * 100).toFixed(2);

  return {
    totalSize,
    totalSizeMB,
    fileCount,
    limitGB,
    limitMB,
    usagePercent,
    repoName: `${OWNER}/${REPO}`,
  };
}
