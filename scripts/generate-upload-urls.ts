/**
 * 构建时生成 S3 预签名上传 URL 并保存为 JSON 文件
 * 客户端从该文件获取上传 URL，实现直传 S3
 */

import { S3Storage } from "coze-coding-dev-sdk";
import * as fs from "fs";
import * as path from "path";

const UPLOAD_URL_COUNT = 1000; // 每次生成 1000 个上传 URL
const URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 天有效期

// 从环境变量获取配置
const endpointUrl = process.env.COZE_BUCKET_ENDPOINT_URL || "https://s3.cn-beijing-1.coze-coding.dev";
const bucketName = process.env.COZE_BUCKET_NAME || "maintenance-photos";
const region = process.env.COZE_BUCKET_REGION || "cn-beijing";

interface UploadUrl {
  key: string;
  url: string;
  expiresAt: string;
}

async function generateUploadUrls(): Promise<UploadUrl[]> {
  console.log("🔄 Generating S3 presigned upload URLs...");
  console.log(`   Endpoint: ${endpointUrl}`);
  console.log(`   Bucket: ${bucketName}`);

  const s3 = new S3Storage({
    endpointUrl,
    accessKey: "",
    secretKey: "",
    bucketName,
    region,
  });

  const urls: UploadUrl[] = [];
  const now = Date.now();

  console.log(`📝 Generating ${UPLOAD_URL_COUNT} upload URLs...`);

  for (let i = 0; i < UPLOAD_URL_COUNT; i++) {
    const timestamp = now + i;
    const random = Math.random().toString(36).substring(2, 8);
    const key = `photos/upload_${timestamp}_${random}.jpg`;

    try {
      const presignedUrl = await s3.generatePresignedUrl({
        key,
        expireTime: URL_EXPIRY_SECONDS,
        method: "PUT",
      } as any);

      urls.push({
        key,
        url: presignedUrl,
        expiresAt: new Date(now + URL_EXPIRY_SECONDS * 1000).toISOString(),
      });

      if ((i + 1) % 200 === 0) {
        console.log(`  Generated ${i + 1}/${UPLOAD_URL_COUNT} URLs...`);
      }
    } catch (error) {
      console.error(`  Error generating URL ${i + 1}:`, error);
    }
  }

  console.log(`✅ Generated ${urls.length} upload URLs`);
  return urls;
}

// 主函数
async function main() {
  try {
    const urls = await generateUploadUrls();

    // 保存到 public 目录
    const outputPath = path.join(process.cwd(), "public", "upload-urls.json");
    fs.writeFileSync(outputPath, JSON.stringify(urls, null, 2));
    console.log(`💾 Saved to ${outputPath}`);

    // 同时保存到数据库
    const tursoUrl = process.env.NEXT_PUBLIC_TURSO_URL;
    const tursoAuthToken = process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN;

    if (tursoUrl && tursoAuthToken) {
      console.log("📊 Inserting URLs into database...");

      // 清理过期的 URL
      await fetch(`${tursoUrl}/v2/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tursoAuthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statements: ["DELETE FROM s3_upload_urls WHERE expires_at < datetime('now')"],
        }),
      });

      // 批量插入（每次 50 条）
      for (let i = 0; i < urls.length; i += 50) {
        const batch = urls.slice(i, i + 50);
        const statements = batch.map(
          (u) =>
            `INSERT OR IGNORE INTO s3_upload_urls (s3_key, presigned_url, expires_at) VALUES ('${u.key}', '${u.url.replace(/'/g, "''")}', '${u.expiresAt}')`
        );

        await fetch(`${tursoUrl}/v2/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tursoAuthToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ statements }),
        });

        console.log(`  Inserted ${Math.min(i + 50, urls.length)}/${urls.length} URLs...`);
      }

      console.log("✅ All URLs inserted into database");
    }

    console.log("🎉 Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
