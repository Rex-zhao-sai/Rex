import { S3Storage } from "./storage";

// 初始化 S3 客户端（使用空密钥，依赖 coze-coding-dev-sdk 的自动配置）
const s3Storage = new S3Storage({
  bucketName: process.env.NEXT_PUBLIC_S3_BUCKET || "maintenance-photos",
  region: process.env.NEXT_PUBLIC_S3_REGION || "us-east-1",
  accessKey: process.env.NEXT_PUBLIC_S3_ACCESS_KEY || "",
  secretKey: process.env.NEXT_PUBLIC_S3_SECRET_KEY || "",
});

/**
 * 上传照片到 S3
 * @param blob - 照片 Blob
 * @param fileName - 原始文件名
 * @param pairId - 照片组 ID
 * @param type - before 或 after
 * @returns S3 URL
 */
export async function uploadToS3(
  blob: Blob,
  fileName: string,
  pairId: string,
  type: "before" | "after"
): Promise<string> {
  // 生成唯一的文件键
  const timestamp = Date.now();
  const ext = fileName.split('.').pop() || 'jpg';
  const fileKey = `photos/${pairId}/${type}-${timestamp}.${ext}`;

  // 上传到 S3
  const result = await s3Storage.uploadFile({
    file: blob,
    key: fileKey,
    contentType: 'image/jpeg',
  });

  // 返回公共 URL
  return s3Storage.getPublicUrl(fileKey);
}

/**
 * 从 S3 获取照片 URL
 * @param s3Url - S3 URL 或 key
 * @returns 公共 URL
 */
export function getS3PhotoUrl(s3Url: string): string {
  // 如果已经是完整 URL，直接返回
  if (s3Url.startsWith('http://') || s3Url.startsWith('https://')) {
    return s3Url;
  }
  // 否则作为 key 处理
  return s3Storage.getPublicUrl(s3Url);
}
