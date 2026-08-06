// 详细分析性能瓶颈
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join } from 'path';

// 读取 .env 文件
const envPath = join(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const TURSO_URL = envVars.NEXT_PUBLIC_TURSO_URL || '';
const TURSO_AUTH_TOKEN = envVars.NEXT_PUBLIC_TURSO_AUTH_TOKEN || '';

const turso = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

async function analyzePerformance() {
  console.log('=== 性能瓶颈分析 ===\n');
  
  // 1. 总记录数
  const totalResult = await turso.execute('SELECT COUNT(*) as count FROM maintenance_records');
  const totalRecords = Number(totalResult.rows[0].count);
  console.log(`1. 总记录数：${totalRecords} 条\n`);
  
  // 2. 各月记录分布
  const monthResult = await turso.execute(`
    SELECT month, COUNT(*) as count, SUM(LENGTH(photo_pairs)) as total_size
    FROM maintenance_records
    GROUP BY month
    ORDER BY month DESC
  `);
  console.log('2. 各月记录分布:');
  console.log('月份'.padEnd(15), '记录数'.padEnd(10), '照片总大小 (MB)');
  console.log('-'.repeat(50));
  let grandTotal = 0;
  for (const row of monthResult.rows) {
    const size = Number(row.total_size) || 0;
    grandTotal += size;
    console.log(
      String(row.month || '').padEnd(15),
      String(row.count).padEnd(10),
      (size / 1024 / 1024).toFixed(2)
    );
  }
  console.log(`\n照片数据总计：${(grandTotal / 1024 / 1024).toFixed(2)} MB\n`);
  
  // 3. 单条记录最大照片数据
  const maxResult = await turso.execute(`
    SELECT equipment_id, month, LENGTH(photo_pairs) as size
    FROM maintenance_records
    ORDER BY size DESC
    LIMIT 5
  `);
  console.log('3. 照片数据最大的 5 条记录:');
  console.log('设备 ID'.padEnd(25), '月份'.padEnd(10), '大小 (MB)');
  console.log('-'.repeat(50));
  for (const row of maxResult.rows) {
    console.log(
      String(row.equipment_id || '').padEnd(25),
      String(row.month || '').padEnd(10),
      (Number(row.size) / 1024 / 1024).toFixed(2)
    );
  }
  
  // 4. 空照片记录数
  const emptyResult = await turso.execute(`
    SELECT COUNT(*) as count FROM maintenance_records
    WHERE photo_pairs IS NULL OR photo_pairs = '[]' OR LENGTH(photo_pairs) < 100
  `);
  const emptyCount = Number(emptyResult.rows[0].count);
  console.log(`\n4. 空照片记录：${emptyCount} 条 (${((emptyCount / totalRecords) * 100).toFixed(1)}%)\n`);
  
  // 5. 有照片记录的平均大小
  const avgResult = await turso.execute(`
    SELECT AVG(LENGTH(photo_pairs)) as avg_size
    FROM maintenance_records
    WHERE photo_pairs IS NOT NULL AND photo_pairs != '[]' AND LENGTH(photo_pairs) >= 100
  `);
  const avgSize = Number(avgResult.rows[0].avg_size) || 0;
  console.log(`5. 有照片记录的平均大小：${(avgSize / 1024).toFixed(2)} KB\n`);
  
  // 6. 性能瓶颈分析
  console.log('=== 性能瓶颈分析 ===\n');
  console.log('问题 1: 照片数据存储在数据库中');
  console.log(`  - 总照片数据：${(grandTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  - 每次查询记录时，photo_pairs 字段会被传输`);
  console.log(`  - 即使不查询 photo_pairs，数据库索引也会包含这部分数据\n`);
  
  console.log('问题 2: base64 编码膨胀');
  console.log('  - base64 编码使数据增大 33%');
  console.log(`  - 原始照片约：${(grandTotal / 1.33 / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  - 编码后：${(grandTotal / 1024 / 1024).toFixed(2)} MB\n`);
  
  console.log('问题 3: 查询方式');
  console.log('  - getRecordsByMonth: 不查询 photo_pairs ✓');
  console.log('  - getRecordByEquipmentAndMonth: 查询 photo_pairs ');
  console.log('  - 设备详情页每次都要查询单条记录的 photo_pairs\n');
  
  console.log('=== 优化建议 ===\n');
  console.log('方案 1: 迁移照片到对象存储 (推荐)');
  console.log('  - 将 base64 照片迁移到 S3/OSS');
  console.log('  - 数据库只存储照片 URL');
  console.log('  - 预计减少 95% 数据库大小\n');
  
  console.log('方案 2: 压缩历史数据');
  console.log('  - 编写脚本压缩已保存的 base64 照片');
  console.log('  - 压缩到 800px，质量 0.7');
  console.log('  - 预计减少 70% 数据量\n');
  
  console.log('方案 3: 延迟加载照片');
  console.log('  - 列表页不加载 photo_pairs ✓ 已实现');
  console.log('  - 详情页按需加载 photo_pairs ✓ 已实现');
  console.log('  - 添加本地缓存 ✓ 已实现\n');
}

analyzePerformance().catch(console.error);
