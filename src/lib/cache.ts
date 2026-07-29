/**
 * 缓存工具 - IndexedDB 版本
 * 支持离线优先架构，大容量存储，结构化查询
 */

import {
  getDB,
  cacheEquipmentList,
  getCachedEquipmentList,
  cacheRecords,
  getCachedRecordsByMonth,
  getLastSyncTime,
  setMetadata,
  getMetadata,
  clearAllCache,
  type CachedEquipment,
  type CachedRecord,
} from './indexeddb';

// 缓存 TTL（用于判断是否需要后台同步）
const CACHE_TTL = 30 * 60 * 1000; // 30 分钟

/**
 * 清理旧的 localStorage 缓存（迁移到 IndexedDB 后不再需要）
 */
function cleanupLocalStorageCache() {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('maintenance_cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`[Cache] Cleaned up old localStorage cache: ${key}`);
    });
  } catch (e) {
    // 忽略清理错误
  }
}

// 模块加载时自动清理旧缓存
if (typeof window !== 'undefined') {
  cleanupLocalStorageCache();
}

/**
 * 判断是否需要同步（缓存超过 TTL 或无缓存）
 */
export async function shouldSync(month: string): Promise<boolean> {
  const lastSync = await getLastSyncTime(`records_${month}`);
  if (!lastSync) return true;
  return Date.now() - parseInt(lastSync) > CACHE_TTL;
}

/**
 * 通知同步完成
 */
export async function notifySync(month: string): Promise<void> {
  await setMetadata(`last_sync_${month}`, Date.now());
}

/**
 * 获取缓存的设备列表
 */
export async function getCachedEquipment(): Promise<CachedEquipment[] | null> {
  if (typeof window === 'undefined') return null;

  try {
    const lastSync = await getLastSyncTime('equipment');
    if (!lastSync) return null;

    // 检查是否过期
    const age = Date.now() - new Date(lastSync).getTime();
    if (age > CACHE_TTL) {
      console.log('[Cache] Equipment cache expired, need refresh');
      // 不过期也返回，后台会更新
    }

    const equipment = await getCachedEquipmentList();
    console.log(`[Cache] Loaded ${equipment.length} equipment from IndexedDB`);
    return equipment;
  } catch (e) {
    console.error('[Cache] Failed to load equipment from IndexedDB:', e);
    return null;
  }
}

/**
 * 缓存设备列表
 */
export async function setCachedEquipment(equipment: CachedEquipment[]): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await cacheEquipmentList(equipment);
    console.log(`[Cache] Cached ${equipment.length} equipment to IndexedDB`);
  } catch (e) {
    console.error('[Cache] Failed to cache equipment:', e);
  }
}

/**
 * 获取缓存的保养记录
 */
export async function getCachedRecords(month: string): Promise<CachedRecord[] | null> {
  if (typeof window === 'undefined') return null;

  try {
    const lastSync = await getLastSyncTime(`records_${month}`);
    if (!lastSync) return null;

    const records = await getCachedRecordsByMonth(month);
    console.log(`[Cache] Loaded ${records.length} records for ${month} from IndexedDB`);
    return records;
  } catch (e) {
    console.error('[Cache] Failed to load records from IndexedDB:', e);
    return null;
  }
}

/**
 * 缓存保养记录
 */
export async function setCachedRecords(records: CachedRecord[]): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await cacheRecords(records);
    console.log(`[Cache] Cached ${records.length} records to IndexedDB`);
  } catch (e) {
    console.error('[Cache] Failed to cache records:', e);
  }
}

/**
 * 获取上次同步时间
 */
export async function getLastSyncTimeFor(type: 'equipment' | `records_${string}`): Promise<string | null> {
  return getLastSyncTime(type);
}

/**
 * 清除所有缓存
 */
export async function clearAll(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await clearAllCache();
    console.log('[Cache] All cache cleared');
  } catch (e) {
    console.error('[Cache] Failed to clear cache:', e);
  }
}

/**
 * 触发后台同步
 */
export async function triggerBackgroundSync(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      // 使用类型断言避免 TypeScript 错误
      const reg = registration as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> };
      };
      await reg.sync.register('sync-maintenance-data');
      console.log('[Cache] Background sync registered');
    }
  } catch (e) {
    console.error('[Cache] Failed to register background sync:', e);
  }
}

/**
 * 监听同步状态
 */
export function onSyncStatusChange(
  onStart?: () => void,
  onComplete?: () => void,
  onError?: (error: string) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data.type === 'SYNC_START') {
      onStart?.();
    } else if (event.data.type === 'SYNC_COMPLETE') {
      onComplete?.();
    } else if (event.data.type === 'SYNC_ERROR') {
      onError?.(event.data.error);
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}
