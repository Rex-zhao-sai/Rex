// 检查 7 月和 8 月记录的照片数据大小
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

async function checkPhotoSize() {
  console.log('检查 7 月和 8 月记录的照片数据大小...\n');
  
  // 查询 7 月记录
  const julyResult = await turso.execute({
    sql: `SELECT equipment_id, month, LENGTH(photo_pairs) as size FROM maintenance_records WHERE month = '2026-07' ORDER BY size DESC`,
  });
  
  console.log('7 月记录:');
  console.log('设备 ID'.padEnd(30), '月份'.padEnd(10), '照片大小 (字节)');
  console.log('-'.repeat(60));
  for (const row of julyResult.rows) {
    console.log(
      String(row.equipment_id || '').padEnd(30),
      String(row.month || '').padEnd(10),
      String(row.size || 0).padEnd(15)
    );
  }
  
  console.log('\n8 月记录:');
  const augResult = await turso.execute({
    sql: `SELECT equipment_id, month, LENGTH(photo_pairs) as size FROM maintenance_records WHERE month = '2026-08' ORDER BY size DESC`,
  });
  
  console.log('设备 ID'.padEnd(30), '月份'.padEnd(10), '照片大小 (字节)');
  console.log('-'.repeat(60));
  for (const row of augResult.rows) {
    console.log(
      String(row.equipment_id || '').padEnd(30),
      String(row.month || '').padEnd(10),
      String(row.size || 0).padEnd(15)
    );
  }
  
  // 计算总大小
  const julyTotal = julyResult.rows.reduce((sum, row) => sum + (Number(row.size) || 0), 0);
  const augTotal = augResult.rows.reduce((sum, row) => sum + (Number(row.size) || 0), 0);
  
  console.log('\n总计:');
  console.log(`7 月：${julyResult.rows.length} 条记录，总大小 ${julyTotal} 字节 (${(julyTotal / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`8 月：${augResult.rows.length} 条记录，总大小 ${augTotal} 字节 (${(augTotal / 1024 / 1024).toFixed(2)} MB)`);
}

checkPhotoSize().catch(console.error);
