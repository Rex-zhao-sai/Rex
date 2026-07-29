/**
 * IndexedDB 数据库工具
 * 用于离线优先架构，存储设备列表和保养记录
 */

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'maintenance-db';
const DB_VERSION = 1;

export interface CachedEquipment {
  id: string;
  name: string;
  category: string;
  maintenance_cycle_months: number;
  last_maintenance_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CachedRecord {
  id: string;
  equipment_id: string;
  month: string;
  technician: string;
  notes: string;
  photo_pairs: any[];
  created_at: string;
  updated_at: string;
}

interface MaintenanceDB {
  equipment: {
    key: string;
    value: CachedEquipment;
    indexes: { 'by-updated': string };
  };
  records: {
    key: string;
    value: CachedRecord;
    indexes: { 'by-month': string; 'by-equipment': string; 'by-updated': string };
  };
  metadata: {
    key: string;
    value: { key: string; value: string; updated_at: string };
  };
}

let dbInstance: IDBPDatabase<MaintenanceDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<MaintenanceDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<MaintenanceDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 设备表
      const equipmentStore = db.createObjectStore('equipment', {
        keyPath: 'id',
      });
      equipmentStore.createIndex('by-updated', 'updated_at');

      // 保养记录表
      const recordsStore = db.createObjectStore('records', {
        keyPath: 'id',
      });
      recordsStore.createIndex('by-month', 'month');
      recordsStore.createIndex('by-equipment', 'equipment_id');
      recordsStore.createIndex('by-updated', 'updated_at');

      // 元数据表（存储同步时间戳等）
      db.createObjectStore('metadata', {
        keyPath: 'key',
      });
    },
  });

  return dbInstance;
}

// ============ 设备相关操作 ============

export async function cacheEquipmentList(equipment: CachedEquipment[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('equipment', 'readwrite');
  const store = tx.objectStore('equipment');

  // 清空旧数据
  await store.clear();

  // 写入新数据
  for (const eq of equipment) {
    await store.put(eq);
  }

  await tx.done;

  // 更新同步时间戳
  await setMetadata('equipment_last_sync', new Date().toISOString());
}

export async function getCachedEquipmentList(): Promise<CachedEquipment[]> {
  const db = await getDB();
  const all = await db.getAll('equipment');
  return all;
}

export async function getCachedEquipment(id: string): Promise<CachedEquipment | undefined> {
  const db = await getDB();
  return db.get('equipment', id);
}

// ============ 保养记录相关操作 ============

export async function cacheRecords(records: CachedRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('records', 'readwrite');
  const store = tx.objectStore('records');

  for (const record of records) {
    await store.put(record);
  }

  await tx.done;

  // 更新同步时间戳
  const months = [...new Set(records.map(r => r.month))];
  for (const month of months) {
    await setMetadata(`records_last_sync_${month}`, new Date().toISOString());
  }
}

export async function getCachedRecordsByMonth(month: string): Promise<CachedRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('records', 'by-month', month);
  return all;
}

export async function getCachedRecord(id: string): Promise<CachedRecord | undefined> {
  const db = await getDB();
  return db.get('records', id);
}

export async function deleteCachedRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('records', id);
}

// ============ 元数据操作 ============

export async function setMetadata(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put('metadata', {
    key,
    value,
    updated_at: new Date().toISOString(),
  });
}

export async function getMetadata(key: string): Promise<string | null> {
  const db = await getDB();
  const result = await db.get('metadata', key);
  return result?.value || null;
}

export async function getLastSyncTime(type: 'equipment' | `records_${string}`): Promise<string | null> {
  const key = type === 'equipment' ? 'equipment_last_sync' : `records_last_sync_${type.replace('records_', '')}`;
  return getMetadata(key);
}

// ============ 增量更新 ============

export async function getIncrementalEquipment(since: string): Promise<CachedEquipment[]> {
  const db = await getDB();
  const all = await db.getAll('equipment');
  return all.filter(eq => eq.updated_at > since);
}

export async function getIncrementalRecords(month: string, since: string): Promise<CachedRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('records', 'by-month', month);
  return all.filter(r => r.updated_at > since);
}

// ============ 缓存清理 ============

export async function clearAllCache(): Promise<void> {
  const db = await getDB();
  await db.clear('equipment');
  await db.clear('records');
  await db.clear('metadata');
}

export async function clearExpiredRecords(month: string): Promise<void> {
  const db = await getDB();
  const records = await db.getAllFromIndex('records', 'by-month', month);
  const tx = db.transaction('records', 'readwrite');
  const store = tx.objectStore('records');

  for (const record of records) {
    await store.delete(record.id);
  }

  await tx.done;
}

// ============ 统计信息 ============

export async function getCacheStats(): Promise<{
  equipment_count: number;
  records_count: number;
  last_equipment_sync: string | null;
  last_records_sync: Record<string, string>;
}> {
  const db = await getDB();
  const equipmentCount = await db.count('equipment');
  const recordsCount = await db.count('records');
  const lastEquipmentSync = await getLastSyncTime('equipment');

  // 获取所有月份的同步时间
  const metadata = await db.getAll('metadata');
  const lastRecordsSync: Record<string, string> = {};
  for (const item of metadata) {
    if (item.key.startsWith('records_last_sync_')) {
      const month = item.key.replace('records_last_sync_', '');
      lastRecordsSync[month] = item.value;
    }
  }

  return {
    equipment_count: equipmentCount,
    records_count: recordsCount,
    last_equipment_sync: lastEquipmentSync,
    last_records_sync: lastRecordsSync,
  };
}
