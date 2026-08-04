"use client";

import { useState, useEffect } from "react";
import supabase from "@/lib/supabase-browser";
import { uploadPhoto } from "@/lib/github-storage";

interface PhotoPair {
  before: string | { dataUrl?: string };
  after: string | { dataUrl?: string };
  note?: string;
  timestamp?: string;
}

interface MigrationRecord {
  id: string;
  equipment_id: string;
  month: string;
  photo_pairs: PhotoPair[];
}

export default function MigrationPage() {
  const [records, setRecords] = useState<MigrationRecord[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRecords();
  }, []);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const loadRecords = async () => {
    try {
      const { data: records, error } = await supabase
        .from("maintenance_records")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: storageFiles, error: storageError } = await supabase.storage
        .from("maintenance-photos")
        .list();

      if (storageError) {
        addLog(`Storage 查询失败：${storageError.message}`);
      }

      const recordsWithPhotos = (records || []).filter((r: any) => r.photo_pairs?.length > 0);
      const base64Records = recordsWithPhotos.filter((record: any) =>
        record.photo_pairs?.some((pair: any) => {
          const beforeStr = typeof pair.before === 'string' ? pair.before : pair.before?.dataUrl || '';
          const afterStr = typeof pair.after === 'string' ? pair.after : pair.after?.dataUrl || '';
          return beforeStr.startsWith("data:image") || afterStr.startsWith("data:image");
        })
      );
      const urlRecords = recordsWithPhotos.length - base64Records.length;

      addLog(`总记录数：${records?.length || 0}`);
      addLog(`有照片的记录：${recordsWithPhotos.length}`);
      addLog(`Base64 格式：${base64Records.length} 条`);
      addLog(`URL 格式：${urlRecords} 条`);
      addLog(`Storage 文件数：${storageFiles?.length || 0}`);

      setRecords(recordsWithPhotos);
      addLog(`待迁移记录：${recordsWithPhotos.length} 条`);
    } catch (e: any) {
      setError(e.message);
      addLog(`加载记录失败：${e.message}`);
    }
  };

  const base64ToFile = (base64: string, filename: string): File | null => {
    try {
      // 检查是否是有效的 base64 格式
      if (!base64.includes(',')) {
        addLog(`   无效的 base64 格式（缺少逗号）`);
        return null;
      }
      
      const arr = base64.split(',');
      if (arr.length < 2) {
        addLog(`  ⚠ 无效的 base64 格式`);
        return null;
      }
      
      const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch (e: any) {
      addLog(`   Base64 解码失败：${e.message}`);
      return null;
    }
  };

  const migrateRecord = async (record: MigrationRecord) => {
    if (!record.photo_pairs?.length) {
      addLog(`设备 ${record.equipment_id} 没有照片`);
      return;
    }

    try {
      const newPhotoPairs = [];
      let hasChanges = false;
      
      for (let i = 0; i < record.photo_pairs.length; i++) {
        const pair = record.photo_pairs[i];
        const pairIndex = i + 1;
        const timestamp = pair.timestamp || new Date().toISOString();
        
        let beforeUrl = '';
        let afterUrl = '';
        let skipThisPair = false;
        
        // 处理 before 照片
        if (pair.before) {
          if (typeof pair.before === 'string' && pair.before.startsWith('data:image')) {
            // Base64 格式
            const file = base64ToFile(pair.before, `${timestamp}-before.jpg`);
            if (file) {
              try {
                const url = await uploadPhoto(record.equipment_id, file, 'before');
                beforeUrl = url;
                addLog(`  上传 before 照片 ${pairIndex}（Base64）`);
                hasChanges = true;
              } catch (e: any) {
                addLog(`  ✗ before 照片 ${pairIndex} 上传失败：${e.message}`);
                beforeUrl = pair.before; // 保留原始数据
              }
            } else {
              beforeUrl = pair.before; // 保留原始数据
              skipThisPair = true;
            }
          } else if (typeof pair.before === 'string' && (pair.before.startsWith('http') || pair.before.startsWith('https'))) {
            // URL 格式（Supabase Storage）- 需要下载后上传
            addLog(`  下载 before 照片 ${pairIndex}（Storage）...`);
            try {
              const response = await fetch(pair.before);
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              const blob = await response.blob();
              const file = new File([blob], `${timestamp}-before.jpg`, { type: blob.type || 'image/jpeg' });
              const url = await uploadPhoto(record.equipment_id, file, 'before');
              beforeUrl = url;
              addLog(`  上传 before 照片 ${pairIndex} 到 GitHub`);
              hasChanges = true;
            } catch (e: any) {
              addLog(`  ✗ before 照片 ${pairIndex} 下载/上传失败：${e.message}`);
              beforeUrl = pair.before; // 保留原始 URL
            }
          } else if (typeof pair.before === 'object' && 'dataUrl' in pair.before && pair.before.dataUrl) {
            // 对象格式
            const file = base64ToFile(pair.before.dataUrl, `${timestamp}-before.jpg`);
            if (file) {
              try {
                const url = await uploadPhoto(record.equipment_id, file, 'before');
                beforeUrl = url;
                addLog(`  上传 before 照片 ${pairIndex}（对象格式）`);
                hasChanges = true;
              } catch (e: any) {
                addLog(`  ✗ before 照片 ${pairIndex} 上传失败：${e.message}`);
                beforeUrl = pair.before.dataUrl;
              }
            } else {
              beforeUrl = pair.before.dataUrl;
            }
          } else {
            // 未知格式，保留原值
            beforeUrl = pair.before as string;
          }
        }
        
        // 处理 after 照片
        if (pair.after) {
          if (typeof pair.after === 'string' && pair.after.startsWith('data:image')) {
            // Base64 格式
            const file = base64ToFile(pair.after, `${timestamp}-after.jpg`);
            if (file) {
              try {
                const url = await uploadPhoto(record.equipment_id, file, 'after');
                afterUrl = url;
                addLog(`  上传 after 照片 ${pairIndex}（Base64）`);
                hasChanges = true;
              } catch (e: any) {
                addLog(`  ✗ after 照片 ${pairIndex} 上传失败：${e.message}`);
                afterUrl = pair.after;
              }
            } else {
              afterUrl = pair.after;
            }
          } else if (typeof pair.after === 'string' && (pair.after.startsWith('http') || pair.after.startsWith('https'))) {
            // URL 格式（Supabase Storage）
            addLog(`  下载 after 照片 ${pairIndex}（Storage）...`);
            try {
              const response = await fetch(pair.after);
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              const blob = await response.blob();
              const file = new File([blob], `${timestamp}-after.jpg`, { type: blob.type || 'image/jpeg' });
              const url = await uploadPhoto(record.equipment_id, file, 'after');
              afterUrl = url;
              addLog(`  上传 after 照片 ${pairIndex} 到 GitHub`);
              hasChanges = true;
            } catch (e: any) {
              addLog(`  ✗ after 照片 ${pairIndex} 下载/上传失败：${e.message}`);
              afterUrl = pair.after;
            }
          } else if (typeof pair.after === 'object' && 'dataUrl' in pair.after && pair.after.dataUrl) {
            // 对象格式
            const file = base64ToFile(pair.after.dataUrl, `${timestamp}-after.jpg`);
            if (file) {
              try {
                const url = await uploadPhoto(record.equipment_id, file, 'after');
                afterUrl = url;
                addLog(`  上传 after 照片 ${pairIndex}（对象格式）`);
                hasChanges = true;
              } catch (e: any) {
                addLog(`   after 照片 ${pairIndex} 上传失败：${e.message}`);
                afterUrl = pair.after.dataUrl;
              }
            } else {
              afterUrl = pair.after.dataUrl;
            }
          } else {
            // 未知格式，保留原值
            afterUrl = pair.after as string;
          }
        }
        
        if (skipThisPair) {
          addLog(`  ⚠ 跳过第 ${pairIndex} 组照片（base64 无效）`);
          newPhotoPairs.push(pair);
        } else {
          newPhotoPairs.push({
            before: beforeUrl,
            after: afterUrl,
            timestamp: timestamp,
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // 只有当有成功上传的照片时才更新数据库
      if (hasChanges) {
        const { error } = await supabase
          .from("maintenance_records")
          .update({
            photo_pairs: newPhotoPairs,
            migrated_at: new Date().toISOString(),
          })
          .eq("id", record.id);

        if (error) {
          addLog(` 设备 ${record.equipment_id} 数据库更新失败：${error.message}`);
        } else {
          addLog(`✅ 设备 ${record.equipment_id} 迁移完成（${newPhotoPairs.length} 组照片）`);
        }
      } else {
        addLog(`⚠ 设备 ${record.equipment_id} 没有成功上传的照片，跳过`);
      }
    } catch (e: any) {
      addLog(`❌ 设备 ${record.equipment_id} 迁移失败：${e.message}`);
      throw e;
    }
  };

  const handleMigrateAll = async () => {
    if (records.length === 0) {
      alert("没有需要迁移的记录");
      return;
    }

    if (!confirm(`确定要迁移 ${records.length} 条记录吗？\n\n这会将所有照片（包括 Storage 中的）迁移到 GitHub Releases。`)) {
      return;
    }

    setMigrating(true);
    setProgress({ current: 0, total: records.length });
    addLog(`开始迁移 ${records.length} 条记录...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < records.length; i++) {
      setProgress({ current: i + 1, total: records.length });
      try {
        await migrateRecord(records[i]);
        successCount++;
      } catch (e: any) {
        failCount++;
        addLog(`继续下一条记录...`);
      }
    }

    addLog(`迁移完成！成功：${successCount}，失败：${failCount}`);
    setMigrating(false);
    alert(`迁移完成！成功：${successCount}，失败：${failCount}`);
  };

  const handleMigrateSingle = async (record: MigrationRecord) => {
    if (!confirm(`确定要迁移设备 ${record.equipment_id} 的记录吗？`)) {
      return;
    }

    setMigrating(true);
    try {
      await migrateRecord(record);
    } catch (e: any) {
      addLog(`迁移失败：${e.message}`);
    }
    setMigrating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">数据迁移工具</h1>
        <p className="text-gray-600 mb-6">
          将所有照片迁移到 GitHub Releases 存储（包括 Base64 和 Storage）
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">错误：{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">待迁移记录</h2>
              <p className="text-gray-600">
                共 {records.length} 条记录包含照片
              </p>
            </div>
            <button
              onClick={handleMigrateAll}
              disabled={migrating || records.length === 0}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {migrating ? "迁移中..." : "全部迁移"}
            </button>
          </div>

          {migrating && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>进度</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{record.equipment_id}</p>
                  <p className="text-sm text-gray-600">
                    {record.month} · {record.photo_pairs.length} 组照片
                  </p>
                </div>
                <button
                  onClick={() => handleMigrateSingle(record)}
                  disabled={migrating}
                  className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  迁移
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">迁移日志</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">暂无日志</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">注意事项</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 迁移过程中会保留原始数据作为备份</li>
            <li>• 迁移后的记录会添加 migrated_at 时间戳</li>
            <li>• 如果迁移失败，原始数据不会丢失</li>
            <li>• 迁移时间取决于照片数量（约 100 张照片需要 5-10 分钟）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
