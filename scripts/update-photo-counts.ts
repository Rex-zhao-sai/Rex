import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.NEXT_PUBLIC_TURSO_URL || '',
  authToken: process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN || '',
});

async function updatePhotoCounts() {
  console.log('开始批量更新 photo_count...');
  console.log('数据库 URL:', process.env.NEXT_PUBLIC_TURSO_URL);

  try {
    // 分批查询，避免内存限制
    const batchSize = 10;
    let offset = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    console.log('开始分批处理...');

    while (true) {
      const result = await turso.execute({
        sql: "SELECT id, photo_pairs FROM maintenance_records WHERE photo_pairs != '[]' AND photo_pairs IS NOT NULL LIMIT ? OFFSET ?",
        args: [batchSize, offset],
      });

      if (result.rows.length === 0) {
        break;
      }

      console.log(`\n处理第 ${offset + 1}-${offset + result.rows.length} 条记录...`);

      for (const row of result.rows) {
        const id = row.id as string;
        const photoPairsStr = row.photo_pairs as string;

        try {
          const photoPairs = JSON.parse(photoPairsStr);

          if (!Array.isArray(photoPairs)) {
            console.warn(`  记录 ${id}: photo_pairs 不是数组，跳过`);
            continue;
          }

          const photoCount = photoPairs.filter(
            (pair: any) =>
              pair.before !== null ||
              pair.after !== null
          ).length;

          await turso.execute({
            sql: 'UPDATE maintenance_records SET photo_count = ? WHERE id = ?',
            args: [photoCount, id],
          });

          totalUpdated++;
          console.log(`  ✓ ${id}: ${photoCount} 组照片`);
        } catch (error) {
          totalErrors++;
          console.error(`  ✗ ${id} 失败:`, error);
        }
      }

      offset += batchSize;
      // 等待一下，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n=== 更新完成 ===');
    console.log(`成功更新: ${totalUpdated} 条`);
    console.log(`失败: ${totalErrors} 条`);

    // 验证更新结果
    const verifyResult = await turso.execute(
      'SELECT COUNT(*) as count FROM maintenance_records WHERE photo_count > 0'
    );
    console.log(`\n验证: 有照片的记录数 = ${verifyResult.rows[0].count}`);
  } catch (error) {
    console.error('批量更新失败:', error);
  }
}

updatePhotoCounts();
