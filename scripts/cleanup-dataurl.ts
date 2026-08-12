/**
 * 清理 photo_pairs 中的 dataUrl 字段
 * 
 * 使用方法：
 * 1. 确保已安装依赖：pnpm install
 * 2. 设置环境变量：
 *    - TURSO_DATABASE_URL
 *    - TURSO_AUTH_TOKEN
 * 3. 运行：npx tsx scripts/cleanup-dataurl.ts
 */

import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

async function cleanupDataUrl() {
  console.log('开始清理 dataUrl...\n');

  // 获取所有记录
  const result = await turso.execute({
    sql: 'SELECT id, equipment_id, month, photo_pairs FROM maintenance_records WHERE photo_pairs LIKE \'%"dataUrl"%\'',
    args: [],
  });

  console.log(`找到 ${result.rows.length} 条包含 dataUrl 的记录\n`);

  let cleaned = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of result.rows) {
    const id = row.id as string;
    const equipmentId = row.equipment_id as string;
    const month = row.month as string;
    const photoPairsStr = row.photo_pairs as string;

    try {
      const photoPairs = JSON.parse(photoPairsStr);
      let modified = false;

      for (const pair of photoPairs) {
        // 处理 before 照片
        if (pair.before?.dataUrl) {
          if (pair.before.s3Key) {
            // 有 s3Key，删除 dataUrl
            delete pair.before.dataUrl;
            modified = true;
          } else {
            // 无 s3Key，保留 dataUrl（跳过）
            skipped++;
          }
        }

        // 处理 after 照片
        if (pair.after?.dataUrl) {
          if (pair.after.s3Key) {
            // 有 s3Key，删除 dataUrl
            delete pair.after.dataUrl;
            modified = true;
          } else {
            // 无 s3Key，保留 dataUrl（跳过）
            skipped++;
          }
        }
      }

      if (modified) {
        const newPhotoPairs = JSON.stringify(photoPairs);
        await turso.execute({
          sql: 'UPDATE maintenance_records SET photo_pairs = ? WHERE id = ?',
          args: [newPhotoPairs, id],
        });
        cleaned++;
        console.log(`✓ ${equipmentId} (${month}): 已清理`);
      } else {
        console.log(`- ${equipmentId} (${month}): 无需清理（无 s3Key）`);
      }
    } catch (error) {
      errors++;
      console.error(`✗ ${equipmentId} (${month}): 处理失败 - ${error}`);
    }
  }

  console.log('\n========== 清理完成 ==========');
  console.log(`已清理：${cleaned} 条记录`);
  console.log(`已跳过：${skipped} 个照片（无 s3Key）`);
  console.log(`错误：${errors} 条`);
  console.log('================================\n');

  // 验证清理结果
  const verifyResult = await turso.execute({
    sql: 'SELECT COUNT(*) as count FROM maintenance_records WHERE photo_pairs LIKE \'%"dataUrl"%\'',
    args: [],
  });

  const remainingCount = verifyResult.rows[0]?.count as number;
  console.log(`剩余包含 dataUrl 的记录：${remainingCount} 条`);

  if (remainingCount === 0) {
    console.log('✓ 所有 dataUrl 已清理完成！');
  } else {
    console.log(`⚠ 还有 ${remainingCount} 条记录包含 dataUrl（可能是无 s3Key 的旧记录）`);
  }
}

cleanupDataUrl().catch(console.error);
