// Turso 数据访问层
// 替代 Supabase 的查询接口

import turso from './turso';

// 类型定义
export interface Equipment {
  id: string;
  name: string;
  category?: string;
}

export interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  month: string;
  technician?: string;
  notes?: string;
  photo_pairs?: any[];
  photo_count?: number;
  role?: string;
  duration?: number;
  created_at: string;
  updated_at: string;
}

// 生成 UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 格式化日期
// 格式化日期为 ISO 字符串（带时区信息）
function formatDate(date: Date): string {
  return date.toISOString();
}

// ==================== 设备清单操作 ====================

// 获取所有设备
export async function getAllEquipment(): Promise<Equipment[]> {
  const result = await turso.execute({
    sql: `SELECT id, name, category FROM equipment_list ORDER BY name`,
  });
  return result.rows as unknown as Equipment[];
}

// 根据 ID 获取设备
export async function getEquipmentById(id: string): Promise<Equipment | null> {
  const result = await turso.execute({
    sql: `SELECT id, name, category FROM equipment_list WHERE id = ?`,
    args: [id],
  });
  return result.rows.length > 0 ? (result.rows[0] as unknown as Equipment) : null;
}

// ==================== 保养记录操作 ====================

// 获取所有保养记录（用于首页）
export async function getAllRecords(): Promise<MaintenanceRecord[]> {
  const result = await turso.execute({
    sql: `SELECT id, equipment_id, month, technician, photo_count, notes, updated_at
          FROM maintenance_records
          ORDER BY updated_at DESC`,
  });
  return result.rows as unknown as MaintenanceRecord[];
}

// 根据设备 ID 和月份获取记录
export async function getRecordByEquipmentAndMonth(
  equipmentId: string,
  month: string
): Promise<MaintenanceRecord | null> {
  const result = await turso.execute({
    sql: `SELECT * FROM maintenance_records
          WHERE equipment_id = ? AND month = ?
          ORDER BY updated_at DESC
          LIMIT 1`,
    args: [equipmentId, month],
  });
  return result.rows.length > 0 ? (result.rows[0] as unknown as MaintenanceRecord) : null;
}

// 根据设备 ID 获取最新记录（任何月份）
export async function getLatestRecordByEquipment(equipmentId: string): Promise<MaintenanceRecord | null> {
  const result = await turso.execute({
    sql: `SELECT * FROM maintenance_records
          WHERE equipment_id = ?
          ORDER BY updated_at DESC
          LIMIT 1`,
    args: [equipmentId],
  });
  return result.rows.length > 0 ? (result.rows[0] as unknown as MaintenanceRecord) : null;
}

// 保存保养记录（插入或更新）
export async function saveRecord(record: {
  equipment_id: string;
  month: string;
  technician?: string;
  notes?: string;
  photo_pairs?: any[];
  photo_count?: number;
  role?: string;
  duration?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const now = formatDate(new Date());
    const id = generateUUID();

    // 检查是否已存在记录
    const existing = await getRecordByEquipmentAndMonth(record.equipment_id, record.month);

    if (existing) {
      // 更新现有记录
      await turso.execute({
        sql: `UPDATE maintenance_records
              SET technician = ?, notes = ?, photo_pairs = ?, photo_count = ?,
                  role = ?, duration = ?, updated_at = ?
              WHERE id = ?`,
        args: [
          record.technician || null,
          record.notes || null,
          record.photo_pairs ? JSON.stringify(record.photo_pairs) : null,
          record.photo_count || 0,
          record.role || null,
          record.duration || null,
          now,
          existing.id,
        ],
      });
    } else {
      // 插入新记录
      await turso.execute({
        sql: `INSERT INTO maintenance_records
              (id, equipment_id, month, technician, notes, photo_pairs, photo_count, role, duration, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          record.equipment_id,
          record.month,
          record.technician || null,
          record.notes || null,
          record.photo_pairs ? JSON.stringify(record.photo_pairs) : null,
          record.photo_count || 0,
          record.role || null,
          record.duration || null,
          now,
          now,
        ],
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 删除保养记录
export async function deleteRecord(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await turso.execute({
      sql: `DELETE FROM maintenance_records WHERE id = ?`,
      args: [id],
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== 统计操作 ====================

// 获取设备总数
export async function getEquipmentCount(): Promise<number> {
  const result = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM equipment_list`,
  });
  return Number(result.rows[0].count);
}

// 获取保养记录总数
export async function getRecordCount(): Promise<number> {
  const result = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM maintenance_records`,
  });
  return Number(result.rows[0].count);
}
