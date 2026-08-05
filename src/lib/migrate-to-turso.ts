// 从 Supabase 迁移数据到 Turso
// 运行：npx tsx src/lib/migrate-to-turso.ts

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';
import turso from './turso';

// Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL_CUSTOM!,
  process.env.SUPABASE_ANON_KEY_CUSTOM!
);

async function migrateData() {
  console.log('开始迁移数据...\n');

  // 1. 迁移设备清单
  await migrateEquipmentList();

  // 2. 迁移保养记录
  await migrateMaintenanceRecords();

  console.log('\n数据迁移完成！');
}

async function migrateEquipmentList() {
  console.log('📦 迁移设备清单...');

  // 直接从前端代码导入设备清单（更可靠）
  const { EQUIPMENT_LIST } = await import('./equipment-data');
  
  for (const eq of EQUIPMENT_LIST) {
    await turso.execute({
      sql: `INSERT OR IGNORE INTO equipment_list (id, name, category) VALUES (?, ?, ?)`,
      args: [eq.id, eq.name, eq.category || ''],
    });
  }
  console.log(`  ✅ 已导入 ${EQUIPMENT_LIST.length} 个设备`);
}

async function migrateMaintenanceRecords() {
  console.log('\n📋 迁移保养记录...');

  // 从 Supabase 查询所有保养记录
  const { data: records, error } = await supabase
    .from('maintenance_records')
    .select('*');

  if (error) {
    console.error('查询保养记录失败:', error);
    return;
  }

  if (!records || records.length === 0) {
    console.log('  ⚠️  没有保养记录需要迁移');
    return;
  }

  // 插入到 Turso
  let successCount = 0;
  for (const record of records) {
    try {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO maintenance_records 
              (id, equipment_id, month, technician, notes, photo_pairs, photo_count, role, duration, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          record.id,
          record.equipment_id,
          record.month,
          record.technician || null,
          record.notes || null,
          record.photo_pairs ? JSON.stringify(record.photo_pairs) : null,
          record.photo_count || 0,
          record.role || 'operator',
          record.duration || 0,
          record.created_at,
          record.updated_at || record.created_at,
        ],
      });
      successCount++;
    } catch (e) {
      console.error(`   迁移记录失败: ${record.id}`, e);
    }
  }

  console.log(`  ✅ 已迁移 ${successCount}/${records.length} 条记录`);
}

migrateData().catch(console.error);
