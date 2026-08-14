"use client";

import { useEffect, useState } from 'react';
import { getDB } from '@/lib/indexeddb';

export default function DebugPhotoPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDebugInfo() {
      try {
        const db = await getDB();
        
        // 获取所有缓存的照片数据
        const allMetadata = await db.getAll('metadata');
        const photoCaches = allMetadata.filter(m => m.key.startsWith('photo_cache_'));
        
        const debugInfo = photoCaches.map(cache => {
          try {
            const parsed = JSON.parse(cache.value);
            const photoPairs = parsed.photo_pairs;
            
            return {
              record_id: parsed.record_id,
              cached_at: parsed.cached_at,
              size: parsed.size,
              photo_pairs_is_array: Array.isArray(photoPairs),
              photo_pairs_length: Array.isArray(photoPairs) ? photoPairs.length : 0,
              photo_pairs_structure: Array.isArray(photoPairs) && photoPairs.length > 0 ? {
                first_item_keys: Object.keys(photoPairs[0]),
                first_item: photoPairs[0],
                has_before_field: 'before' in photoPairs[0],
                has_after_field: 'after' in photoPairs[0],
                before_value: photoPairs[0].before,
                after_value: photoPairs[0].after,
                before_type: typeof photoPairs[0].before,
                after_type: typeof photoPairs[0].after,
              } : null,
              all_pairs: photoPairs,
            };
          } catch (e) {
            return { error: 'Failed to parse cache', raw: cache.value };
          }
        });
        
        setData(debugInfo);
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
    return <div className="p-8 text-red-500">错误: {error}</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">IndexedDB 照片缓存调试</h1>
      
      {data && data.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">没有找到任何缓存的照片数据</p>
        </div>
      )}
      
      {data && data.length > 0 && (
        <div className="space-y-4">
          {data.map((item: any, index: number) => (
            <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-2">记录 {index + 1}</h2>
              <div className="space-y-2 text-sm">
                <p><strong>Record ID:</strong> {item.record_id}</p>
                <p><strong>缓存时间:</strong> {item.cached_at}</p>
                <p><strong>大小:</strong> {(item.size / 1024).toFixed(2)} KB</p>
                <p><strong>photo_pairs 是数组:</strong> {item.photo_pairs_is_array ? '是' : '否'}</p>
                <p><strong>photo_pairs 长度:</strong> {item.photo_pairs_length}</p>
                
                {item.photo_pairs_structure && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <h3 className="font-semibold mb-2">第一个 photo pair 的结构:</h3>
                    <p><strong>所有字段:</strong> {item.photo_pairs_structure.first_item_keys.join(', ')}</p>
                    <p><strong>有 before 字段:</strong> {item.photo_pairs_structure.has_before_field ? '是' : '否'}</p>
                    <p><strong>有 after 字段:</strong> {item.photo_pairs_structure.has_after_field ? '是' : '否'}</p>
                    <p><strong>before 类型:</strong> {item.photo_pairs_structure.before_type}</p>
                    <p><strong>after 类型:</strong> {item.photo_pairs_structure.after_type}</p>
                    
                    <div className="mt-2">
                      <p className="font-semibold">before 值:</p>
                      <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(item.photo_pairs_structure.before_value, null, 2)}
                      </pre>
                    </div>
                    
                    <div className="mt-2">
                      <p className="font-semibold">after 值:</p>
                      <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(item.photo_pairs_structure.after_value, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                <details className="mt-4">
                  <summary className="cursor-pointer font-semibold text-blue-600">
                    查看所有 photo_pairs 数据
                  </summary>
                  <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(item.all_pairs, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
