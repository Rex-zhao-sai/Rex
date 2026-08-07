/**
 * 迁移照片从 Turso (base64) 到 S3 对象存储
 * 
 * 功能：
 * 1. 从 Turso 读取所有包含照片的记录（分批查询）
 * 2. 将 base64 照片上传到 S3
 * 3. 更新数据库记录，将 photo_pairs 中的 base64 替换为 S3 key
 */

import { S3Storage } from "coze-coding-dev-sdk";
import { createClient } from "@libsql/client";
import { getS3PhotoUrl } from "../src/lib/s3";

// 初始化 S3 存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// 初始化 Turso 客户端
const turso = createClient({
  url: process.env.NEXT_PUBLIC_TURSO_URL!,
  authToken: process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN,
});

interface PhotoPair {
  id: string;
  before: string;
  after: string;
  beforeKey?: string;
  afterKey?: string;
  beforeTime: string;
  afterTime: string;
  note?: string;
}

async function uploadBase64ToS3(base64Data: string, fileName: string): Promise<string | null> {
  try {
    // 移除 data:image/xxx;base64, 前缀
    const base64Content = base64Data.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    const buffer = Buffer.from(base64Content, "base64");
    
    console.log(`    上传 ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)...`);
    
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: "image/jpeg",
    });
    
    return key;
  } catch (error) {
    console.error(`    上传失败 ${fileName}:`, error);
    return null;
  }
}

async function main() {
  console.log("开始迁移照片到 S3...");
  
  // 先查询所有记录 ID（不包含 photo_pairs）
  const idResult = await turso.execute({
    sql: "SELECT id, equipment_id, month FROM maintenance_records WHERE photo_pairs IS NOT NULL AND photo_pairs != '[]' AND photo_pairs != ''",
  });
  
  console.log(`找到 ${idResult.rows.length} 条包含照片的记录`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  // 逐个处理记录
  for (let i = 0; i < idResult.rows.length; i++) {
    const row = idResult.rows[i];
    const recordId = row.id as string;
    const equipmentId = row.equipment_id as string;
    const month = row.month as string;
    
    console.log(`\n[${i + 1}/${idResult.rows.length}] 处理记录: ${equipmentId} (${month})`);
    
    try {
      // 单独查询这条记录的 photo_pairs
      const recordResult = await turso.execute({
        sql: "SELECT photo_pairs FROM maintenance_records WHERE id = ?",
        args: [recordId],
      });
      
      if (recordResult.rows.length === 0) {
        console.log("  跳过：记录不存在");
        skippedCount++;
        continue;
      }
      
      const photoPairsStr = recordResult.rows[0].photo_pairs as string;
      
      // 调试：显示 photo_pairs 的前 100 个字符
      if (i === 0) {
        console.log(`  photo_pairs 预览：${photoPairsStr.substring(0, 200)}`);
      }
      
      // 解析 photo_pairs
      let photoPairs: PhotoPair[];
      if (typeof photoPairsStr === "string") {
        photoPairs = JSON.parse(photoPairsStr);
      } else {
        photoPairs = photoPairsStr as unknown as PhotoPair[];
      }
      
      if (!Array.isArray(photoPairs) || photoPairs.length === 0) {
        console.log("  跳过：photo_pairs 为空或格式错误");
        skippedCount++;
        continue;
      }
      
      let hasChanges = false;
      
      // 处理每个照片组
      for (const pair of photoPairs as any[]) {
        // 处理 before 照片 (PhotoRecord 对象，dataUrl 字段)
        if (pair.before && typeof pair.before === 'object' && pair.before.dataUrl && pair.before.dataUrl.startsWith("data:")) {
          const fileName = `${equipmentId}_${month}_${pair.id}_before.jpg`;
          const key = await uploadBase64ToS3(pair.before.dataUrl, fileName);
          
          if (key) {
            const s3Url = await getS3PhotoUrl(key);
            pair.before.s3Url = s3Url;
            pair.before.dataUrl = ""; // 清空 base64 数据
            hasChanges = true;
            console.log(`    ✓ before 已上传：${s3Url}`);
          }
        }
        
        // 处理 after 照片 (PhotoRecord 对象，dataUrl 字段)
        if (pair.after && typeof pair.after === 'object' && pair.after.dataUrl && pair.after.dataUrl.startsWith("data:")) {
          const fileName = `${equipmentId}_${month}_${pair.id}_after.jpg`;
          const key = await uploadBase64ToS3(pair.after.dataUrl, fileName);
          
          if (key) {
            const s3Url = await getS3PhotoUrl(key);
            pair.after.s3Url = s3Url;
            pair.after.dataUrl = ""; // 清空 base64 数据
            hasChanges = true;
            console.log(`    ✓ after 已上传：${s3Url}`);
          }
        }
      }
      
      // 如果有变化，更新数据库
      if (hasChanges) {
        await turso.execute({
          sql: "UPDATE maintenance_records SET photo_pairs = ? WHERE id = ?",
          args: [JSON.stringify(photoPairs), recordId],
        });
        
        updatedCount++;
        console.log(`  ✓ 记录已更新`);
      } else {
        console.log(`  无需更新`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`  ✗ 处理失败:`, error);
      errorCount++;
    }
  }
  
  console.log("\n=== 迁移完成 ===");
  console.log(`总记录数：${idResult.rows.length}`);
  console.log(`已更新：${updatedCount}`);
  console.log(`已跳过：${skippedCount}`);
  console.log(`错误：${errorCount}`);
}

main().catch(console.error);
