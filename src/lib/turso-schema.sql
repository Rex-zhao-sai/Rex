-- Turso 数据库初始化脚本
-- 设备月度保养记录系统

-- 设备清单表
CREATE TABLE IF NOT EXISTS equipment_list (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 保养记录表
CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY,
  equipment_id TEXT NOT NULL,
  month TEXT NOT NULL,
  technician TEXT,
  notes TEXT,
  photo_pairs TEXT,  -- JSON 字符串
  photo_count INTEGER DEFAULT 0,
  role TEXT DEFAULT 'operator',
  duration INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (equipment_id) REFERENCES equipment_list(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_maintenance_equipment ON maintenance_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_month ON maintenance_records(month);
CREATE INDEX IF NOT EXISTS idx_maintenance_equipment_month ON maintenance_records(equipment_id, month);
