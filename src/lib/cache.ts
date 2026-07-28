// localStorage 缓存工具
const CACHE_PREFIX = "maintenance_cache_";
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCachedData<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    
    // 检查是否过期
    if (now - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    
    return entry.data;
  } catch (e) {
    console.error("读取缓存失败:", e);
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    console.error("写入缓存失败:", e);
  }
}

export function clearCache(key?: string): void {
  if (typeof window === "undefined") return;
  
  try {
    if (key) {
      localStorage.removeItem(CACHE_PREFIX + key);
    } else {
      // 清除所有缓存
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        if (k.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(k);
        }
      });
    }
  } catch (e) {
    console.error("清除缓存失败:", e);
  }
}
