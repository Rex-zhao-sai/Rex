"use client";

import { useEffect, useState } from 'react';

export default function DebugPhotoPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDebugInfo() {
      try {
        const info: any = {
          timestamp: new Date().toISOString(),
          localStorage: {},
          indexedDB: {},
          turso: null,
        };

        // 1. 检查 localStorage
        const localStorageKeys = Object.keys(localStorage);
        const photoKeys = localStorageKeys.filter(k => k.includes('photo') || k.includes('maintenance') || k.includes('record'));
        for (const key of photoKeys) {
          try {
            const value = localStorage.getItem(key);
            info.localStorage[key] = {
              type: typeof value,
              length: value?.length || 0,
              preview: value?.substring(0, 200),
            };
          } catch (e) {
            info.localStorage[key] = { error: 'Failed to read' };
          }
        }

        // 2. 检查 IndexedDB
        try {
          const { getDB } = await import('@/lib/indexeddb');
          const db = await getDB();
          const allMetadata = await db.getAll('metadata');
          const photoCaches = allMetadata.filter(m => m.key.startsWith('photo_cache_'));
          
          info.indexedDB = {
            total_metadata: allMetadata.length,
            photo_caches: photoCaches.length,
            caches: photoCaches.map(cache => {
              try {
                const parsed = JSON.parse(cache.value);
                return {
                  key: cache.key,
                  record_id: parsed.record_id,
                  cached_at: parsed.cached_at,
                  size: parsed.size,
                  photo_pairs_length: Array.isArray(parsed.photo_pairs) ? parsed.photo_pairs.length : 0,
                };
              } catch (e) {
                return { key: cache.key, error: 'Failed to parse' };
              }
            }),
          };
        } catch (e: any) {
          info.indexedDB = { error: e.message };
        }

        // 3. 检查 Turso 数据库（通过 API）
        try {
          // 获取所有设备列表，然后检查每个设备的记录
          const response = await fetch('/api/debug/all-records');
          if (response.ok) {
            info.turso = await response.json();
          } else {
            info.turso = { error: `API returned ${response.status}` };
          }
        } catch (e: any) {
          info.turso = { error: e.message };
        }

        setDebugInfo(info);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    loadDebugInfo();
  }, []);

  if (loading) {
    return <div className="p-8">加载中...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">错误：{error}</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">照片数据调试面板</h1>

      <div className="space-y-6">
        {/* localStorage */}
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-3">localStorage 数据</h2>
          {Object.keys(debugInfo.localStorage).length === 0 ? (
            <p className="text-gray-500">没有找到相关数据</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(debugInfo.localStorage).map(([key, value]: [string, any]) => (
                <div key={key} className="text-sm">
                  <p className="font-medium">{key}</p>
                  <p className="text-gray-600">类型：{value.type}, 长度：{value.length}</p>
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-20 mt-1">
                    {value.preview}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* IndexedDB */}
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-3">IndexedDB 缓存</h2>
          {debugInfo.indexedDB.error ? (
            <p className="text-red-500">错误：{debugInfo.indexedDB.error}</p>
          ) : debugInfo.indexedDB.photo_caches === 0 ? (
            <p className="text-gray-500">没有找到照片缓存</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">总元数据：{debugInfo.indexedDB.total_metadata}</p>
              <p className="text-sm">照片缓存：{debugInfo.indexedDB.photo_caches}</p>
              {debugInfo.indexedDB.caches?.map((cache: any, index: number) => (
                <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                  <p><strong>Record ID:</strong> {cache.record_id}</p>
                  <p><strong>缓存时间:</strong> {cache.cached_at}</p>
                  <p><strong>大小:</strong> {(cache.size / 1024).toFixed(2)} KB</p>
                  <p><strong>照片组数:</strong> {cache.photo_pairs_length}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Turso */}
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Turso 数据库</h2>
          {debugInfo.turso?.error ? (
            <p className="text-red-500">错误：{debugInfo.turso.error}</p>
          ) : debugInfo.turso?.records?.length === 0 ? (
            <p className="text-gray-500">数据库中没有记录</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">总记录数：{debugInfo.turso?.total || 0}</p>
              <p className="text-sm">有照片数据的记录：{debugInfo.turso?.with_photos || 0}</p>
              {debugInfo.turso?.records?.map((record: any, index: number) => (
                <details key={index} className="bg-gray-50 p-2 rounded">
                  <summary className="cursor-pointer font-medium text-sm">
                    {record.equipment_id} - {record.month} (照片数：{record.photo_count})
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-40">
                    {JSON.stringify(record, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </div>

        {/* 原始数据 */}
        <details className="border rounded-lg p-4 bg-white shadow-sm">
          <summary className="cursor-pointer font-semibold text-lg">查看完整调试数据 (JSON)</summary>
          <pre className="mt-4 text-xs overflow-auto max-h-96 bg-gray-50 p-3 rounded">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
