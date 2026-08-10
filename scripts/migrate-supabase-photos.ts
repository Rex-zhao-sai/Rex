/**
 * 迁移脚本：将 Supabase 存储的照片迁移到 S3
 * 
 * 使用方法：
 * 1. 设置环境变量（Supabase 和 S3 配置）
 * 2. 运行：npx tsx scripts/migrate-supabase-photos.ts
 * 
 * 环境变量：
 * - NEXT_PUBLIC_TURSO_URL: Turso 数据库 URL
 * - NEXT_PUBLIC_TURSO_AUTH_TOKEN: Turso 认证令牌
 * - COZE_BUCKET_ENDPOINT_URL: S3 端点
 * - COZE_BUCKET_NAME: S3 存储桶名称
 * - COZE_BUCKET_REGION: S3 区域
 * - COZE_WORKLOAD_IDENTITY_API_KEY: S3 API Key（用于生成预签名 URL）
 */

import { S3Storage } from "coze-coding-dev-sdk";
import * as fs from "fs";

// Turso 配置
const tursoUrl = process.env.NEXT_PUBLIC_TURSO_URL;
const tursoAuthToken = process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN;

// S3 配置
const s3Endpoint = process.env.COZE_BUCKET_ENDPOINT_URL || "https://s3.cn-beijing-1.coze-coding.dev";
const s3Bucket = process.env.COZE_BUCKET_NAME || "maintenance-photos";
const s3Region = process.env.COZE_BUCKET_REGION || "cn-beijing";

interface PhotoRecord {
  id: string;
  type: "before" | "after";
  dataUrl: string;
  s3Key?: string;
  s3Url?: string;
  src?: string; // Supabase URL（需要迁移）
  timestamp: string;
  fileName: string;
}

interface PhotoPair {
  id: string;
  before: PhotoRecord | null;
  after: PhotoRecord | null;
  note: string;
  duration: number;
}

interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  month: string;
  photo_pairs: string; // JSON string
}

// 检查是否为 Supabase URL
function isSupabaseUrl(url: string): boolean {
  return url.includes("supabase.co/storage");
}

// 从 URL 提取文件名
function extractFileName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    return pathParts[pathParts.length - 1] || "unknown.jpg";
  } catch {
    return "unknown.jpg";
  }
}

// 下载文件
async function downloadFile(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }
  return await response.blob();
}

// 上传到 S3
async function uploadToS3(s3: S3Storage, blob: Blob, key: string): Promise<string> {
  const result = await s3.uploadFile({
    file: blob,
    key,
    contentType: "image/jpeg",
  });
  return result.url;
}

// 生成 S3 key
function generateS3Key(equipmentId: string, month: string, pairId: string, type: string, fileName: string): string {
  return `photos/${equipmentId}/${month}/${pairId}_${type}_${fileName}`;
}

// 迁移单个照片
async function migratePhoto(
  s3: S3Storage,
  photo: PhotoRecord,
  equipmentId: string,
  month: string,
  pairId: string,
  type: "before" | "after"
): Promise<PhotoRecord> {
  if (!photo.src || !isSupabaseUrl(photo.src)) {
    return photo; // 不是 Supabase URL，跳过
  }

  console.log(`  Migrating ${type} photo: ${photo.src}`);

  try {
    // 下载照片
    const blob = await downloadFile(photo.src);
    console.log(`    Downloaded: ${blob.size} bytes`);

    // 生成 S3 key
    const fileName = photo.fileName || extractFileName(photo.src);
    const s3Key = generateS3Key(equipmentId, month, pairId, type, fileName);

    // 上传到 S3
    await uploadToS3(s3, blob, s3Key);
    console.log(`    Uploaded to S3: ${s3Key}`);

    // 返回更新后的照片记录
    return {
      ...photo,
      s3Key,
      src: undefined, // 移除旧的 Supabase URL
    };
  } catch (error) {
    console.error(`    Failed to migrate ${type} photo:`, error);
    return photo; // 迁移失败，保留原记录
  }
}

// 主函数
async function main() {
  // 检查必要的环境变量
  if (!tursoUrl || !tursoAuthToken) {
    console.error("❌ Missing Turso environment variables");
    console.error("   Required: NEXT_PUBLIC_TURSO_URL, NEXT_PUBLIC_TURSO_AUTH_TOKEN");
    process.exit(1);
  }

  if (!process.env.COZE_WORKLOAD_IDENTITY_API_KEY) {
    console.error(" Missing COZE_WORKLOAD_IDENTITY_API_KEY");
    process.exit(1);
  }

  console.log("🔄 Starting Supabase photo migration...");
  console.log(`   Turso: ${tursoUrl}`);
  console.log(`   S3: ${s3Endpoint}/${s3Bucket}`);

  // 初始化 S3 客户端
  const s3 = new S3Storage({
    endpointUrl: s3Endpoint,
    accessKey: "",
    secretKey: "",
    bucketName: s3Bucket,
    region: s3Region,
  });

  // 获取所有保养记录
  console.log("\n📊 Fetching maintenance records...");
  const recordsResponse = await fetch(`${tursoUrl}/v2/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tursoAuthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      statements: ["SELECT id, equipment_id, month, photo_pairs FROM maintenance_records WHERE photo_pairs IS NOT NULL"],
    }),
  });

  if (!recordsResponse.ok) {
    console.error("❌ Failed to fetch records:", recordsResponse.status);
    process.exit(1);
  }

  const recordsData = await recordsResponse.json();
  const records: MaintenanceRecord[] = recordsData.results?.[0]?.rows || [];
  console.log(`   Found ${records.length} records with photo_pairs`);

  let totalMigrated = 0;
  let totalFailed = 0;
  let recordsUpdated = 0;

  // 遍历所有记录
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    console.log(`\n[${i + 1}/${records.length}] Processing record: ${record.equipment_id} (${record.month})`);

    let photoPairs: PhotoPair[];
    try {
      photoPairs = JSON.parse(record.photo_pairs);
    } catch {
      console.warn("   ⚠️  Failed to parse photo_pairs, skipping");
      continue;
    }

    if (!Array.isArray(photoPairs) || photoPairs.length === 0) {
      console.log("   No photo pairs, skipping");
      continue;
    }

    let hasChanges = false;

    // 迁移每个照片对
    for (const pair of photoPairs) {
      // 迁移 before 照片
      if (pair.before && pair.before.src && isSupabaseUrl(pair.before.src)) {
        const migrated = await migratePhoto(s3, pair.before, record.equipment_id, record.month, pair.id, "before");
        if (migrated.s3Key && !migrated.src) {
          pair.before = migrated;
          hasChanges = true;
          totalMigrated++;
        } else {
          totalFailed++;
        }
      }

      // 迁移 after 照片
      if (pair.after && pair.after.src && isSupabaseUrl(pair.after.src)) {
        const migrated = await migratePhoto(s3, pair.after, record.equipment_id, record.month, pair.id, "after");
        if (migrated.s3Key && !migrated.src) {
          pair.after = migrated;
          hasChanges = true;
          totalMigrated++;
        } else {
          totalFailed++;
        }
      }
    }

    // 如果有更改，更新数据库
    if (hasChanges) {
      console.log("   💾 Updating record in database...");
      const updateResponse = await fetch(`${tursoUrl}/v2/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tursoAuthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statements: [
            `UPDATE maintenance_records SET photo_pairs = '${JSON.stringify(photoPairs).replace(/'/g, "''")}' WHERE id = '${record.id}'`,
          ],
        }),
      });

      if (updateResponse.ok) {
        console.log("   ✅ Record updated");
        recordsUpdated++;
      } else {
        console.error("   ❌ Failed to update record");
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(" Migration complete!");
  console.log(`   Total photos migrated: ${totalMigrated}`);
  console.log(`   Total photos failed: ${totalFailed}`);
  console.log(`   Total records updated: ${recordsUpdated}`);
  console.log("=".repeat(50));

  // 保存迁移报告
  const report = {
    timestamp: new Date().toISOString(),
    totalRecords: records.length,
    totalMigrated,
    totalFailed,
    recordsUpdated,
  };
  fs.writeFileSync("migration-report.json", JSON.stringify(report, null, 2));
  console.log("\n📄 Migration report saved to migration-report.json");
}

main().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
