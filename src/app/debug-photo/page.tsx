'use client';

import { useEffect, useState } from 'react';

export default function DebugPhotoPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/debug/photo-structure');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">错误：{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Photo Pairs 结构调试</h1>

        {/* 概览 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">数据库概览</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-500 text-sm">总记录数</div>
              <div className="text-2xl font-bold">{data.total_records}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">GEN5 相关记录</div>
              <div className="text-2xl font-bold">{data.gen5_records}</div>
            </div>
          </div>
        </div>

        {/* Photo Pairs 结构分析 */}
        {data.photo_structure && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Photo Pairs 结构分析</h2>
            
            <div className="mb-4">
              <div className="text-gray-500 text-sm">设备 ID</div>
              <div className="font-mono">{data.photo_structure.equipment_id}</div>
            </div>
            
            <div className="mb-4">
              <div className="text-gray-500 text-sm">月份</div>
              <div>{data.photo_structure.month}</div>
            </div>
            
            <div className="mb-4">
              <div className="text-gray-500 text-sm">photo_pairs 数组长度</div>
              <div className="text-2xl font-bold">{data.photo_structure.array_length}</div>
            </div>

            <div className="mb-4">
              <div className="text-gray-500 text-sm">第一个 pair 的所有字段</div>
              <div className="font-mono bg-gray-100 p-2 rounded mt-1">
                {JSON.stringify(data.photo_structure.first_item_keys, null, 2)}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-gray-500 text-sm">has_before_field</div>
              <div className={`font-bold ${data.photo_structure.has_before_field ? 'text-green-600' : 'text-red-600'}`}>
                {data.photo_structure.has_before_field ? '✓ 存在' : '✗ 不存在'}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-gray-500 text-sm">has_after_field</div>
              <div className={`font-bold ${data.photo_structure.has_after_field ? 'text-green-600' : 'text-red-600'}`}>
                {data.photo_structure.has_after_field ? '✓ 存在' : '✗ 不存在'}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-gray-500 text-sm">before 类型</div>
              <div className="font-mono">{data.photo_structure.before_type}</div>
            </div>

            <div className="mb-4">
              <div className="text-gray-500 text-sm">after 类型</div>
              <div className="font-mono">{data.photo_structure.after_type}</div>
            </div>

            {data.photo_structure.before_keys && (
              <div className="mb-4">
                <div className="text-gray-500 text-sm">before 对象的字段</div>
                <div className="font-mono bg-gray-100 p-2 rounded mt-1">
                  {JSON.stringify(data.photo_structure.before_keys, null, 2)}
                </div>
              </div>
            )}

            {data.photo_structure.after_keys && (
              <div className="mb-4">
                <div className="text-gray-500 text-sm">after 对象的字段</div>
                <div className="font-mono bg-gray-100 p-2 rounded mt-1">
                  {JSON.stringify(data.photo_structure.after_keys, null, 2)}
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="text-gray-500 text-sm">第一个 pair 完整数据</div>
              <pre className="font-mono bg-gray-100 p-4 rounded mt-1 text-xs overflow-auto max-h-96">
                {JSON.stringify(data.photo_structure.first_item, null, 2)}
              </pre>
            </div>

            <div>
              <div className="text-gray-500 text-sm">完整样本（前 2 个 pair）</div>
              <pre className="font-mono bg-gray-100 p-4 rounded mt-1 text-xs overflow-auto max-h-96">
                {JSON.stringify(data.photo_structure.sample, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* 记录列表 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">所有记录（前 20 条）</h2>
          <div className="space-y-2">
            {data.records.map((record: any) => (
              <div key={record.id} className="border-b pb-2">
                <div className="flex justify-between">
                  <span className="font-mono text-sm">{record.equipment_id}</span>
                  <span className="text-gray-500 text-sm">{record.month}</span>
                </div>
                <div className="text-xs text-gray-400">
                  照片数：{record.photo_count} | 数据大小：{(record.photo_length / 1024).toFixed(2)} KB
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
