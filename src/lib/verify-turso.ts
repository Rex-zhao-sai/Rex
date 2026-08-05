// 验证 Turso 数据
// 运行：npx tsx src/lib/verify-turso.ts

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import turso from './turso';

async function verifyData() {
  console.log('验证 Turso 数据...\n');

  // 1. 查询设备数量
  const equipmentResult = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM equipment_list`,
  });
  console.log(`📦 设备数量：${equipmentResult.rows[0].count}`);

  // 2. 查询保养记录数量
  const recordsResult = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM maintenance_records`,
  });
  console.log(`📋 保养记录数量：${recordsResult.rows[0].count}`);

  // 3. 查询示例设备
  const sampleEquipment = await turso.execute({
    sql: `SELECT * FROM equipment_list LIMIT 5`,
  });
  console.log('\n示例设备：');
  console.table(sampleEquipment.rows);

  // 4. 查询示例记录
  const sampleRecords = await turso.execute({
    sql: `SELECT equipment_id, month, technician, photo_count FROM maintenance_records LIMIT 5`,
  });
  console.log('\n示例记录：');
  console.table(sampleRecords.rows);

  console.log('\n✅ 数据验证完成！');
}

verifyData().catch(console.error);
