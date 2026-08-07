/**
 * 上传照片到 S3
 * @param blob - 照片 Blob
 * @param fileName - 原始文件名
 * @param pairId - 照片组 ID
 * @param type - before 或 after
 * @returns S3 key（用于持久化存储）
 */
export async function uploadToS3(
  blob: Blob,
  fileName: string,
  pairId: string,
  type: "before" | "after"
): Promise<string> {
  // 创建 FormData
  const formData = new FormData();
  formData.append("file", blob);
  formData.append("fileName", fileName);
  formData.append("pairId", pairId);
  formData.append("type", type);

  // 调用 API 路由上传
  const response = await fetch("/api/s3?action=upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Upload failed");
  }

  const result = await response.json();
  return result.key;
}

/**
 * 从 S3 获取照片 URL（预签名）
 * @param s3Key - S3 key
 * @returns 预签名 URL
 */
export async function getS3PhotoUrl(s3Key: string): Promise<string> {
  // 调用 API 路由获取预签名 URL
  const response = await fetch(`/api/s3?action=presigned-url&key=${encodeURIComponent(s3Key)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get presigned URL");
  }

  const result = await response.json();
  return result.url;
}
