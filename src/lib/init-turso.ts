// Turso 数据库初始化脚本
// 运行此脚本创建数据库表

import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import turso from './turso';

async function initDatabase() {
  if (!turso) {
    console.error(' Turso 不可用：请检查环境变量 NEXT_PUBLIC_TURSO_URL 和 NEXT_PUBLIC_TURSO_AUTH_TOKEN');
    return;
  }

  console.log('开始初始化 Turso 数据库...');

  // 创建设备清单表
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS equipment_list (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✅ equipment_list 表创建成功');

  // 创建保养记录表
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS maintenance_records (
      id TEXT PRIMARY KEY,
      equipment_id TEXT NOT NULL,
      month TEXT NOT NULL,
      technician TEXT,
      notes TEXT,
      photo_pairs TEXT,
      photo_count INTEGER DEFAULT 0,
      role TEXT DEFAULT 'operator',
      duration INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipment_list(id)
    )
  `);
  console.log('✅ maintenance_records 表创建成功');

  // 创建索引
  await turso.execute(`
    CREATE INDEX IF NOT EXISTS idx_maintenance_equipment 
    ON maintenance_records(equipment_id)
  `);
  await turso.execute(`
    CREATE INDEX IF NOT EXISTS idx_maintenance_month 
    ON maintenance_records(month)
  `);
  await turso.execute(`
    CREATE INDEX IF NOT EXISTS idx_maintenance_equipment_month 
    ON maintenance_records(equipment_id, month)
  `);
  console.log('✅ 索引创建成功');

  console.log('数据库初始化完成！');
}

initDatabase().catch(console.error);
