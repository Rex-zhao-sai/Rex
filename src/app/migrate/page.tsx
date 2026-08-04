"use client";

import { useState, useEffect } from "react";
import supabase from "@/lib/supabase-browser";
import { uploadPhotoPair } from "@/lib/github-storage";

interface MigrationRecord {
  id: string;
  equipment_id: string;
  month: string;
  photo_pairs: Array<{
    before: string;
    after: string;
    note?: string;
    timestamp?: string;
  }>;
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

  const loadRecords = async () => {
    try {
      // 1. 查询所有有照片的记录
      const { data: records, error } = await supabase
        .from("maintenance_records")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 2. 列出 Storage 中的所有照片
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from("maintenance-photos")
        .list();

      if (storageError) {
        addLog(`Storage 查询失败：${storageError.message}`);
      }

      // 3. 统计信息
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

      // 4. 显示待迁移记录（base64 格式）
      setRecords(base64Records);
      addLog(`待迁移记录：${base64Records.length} 条`);
    } catch (e: any) {
      setError(e.message);
      addLog(`加载记录失败：${e.message}`);
    }
  };

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const migrateRecord = async (record: MigrationRecord) => {
    const updatedPhotoPairs = [];

    for (let i = 0; i < record.photo_pairs.length; i++) {
      const pair = record.photo_pairs[i];
      
      // 获取 before 和 after 的字符串值（兼容 PhotoRecord 对象和字符串）
      let beforeStr = '';
      let afterStr = '';
      
      if (typeof pair.before === 'string') {
        beforeStr = pair.before;
      } else if (pair.before && typeof pair.before === 'object' && 'dataUrl' in pair.before) {
        beforeStr = (pair.before as any).dataUrl || '';
      }
      
      if (typeof pair.after === 'string') {
        afterStr = pair.after;
      } else if (pair.after && typeof pair.after === 'object' && 'dataUrl' in pair.after) {
        afterStr = (pair.after as any).dataUrl || '';
      }
      
      // 如果是 base64，上传到 GitHub
      if (beforeStr.startsWith("data:image") || afterStr.startsWith("data:image")) {
        try {
          const beforeFile = base64ToFile(
            beforeStr || afterStr,
            `before-${i}.jpg`
          );
          const afterFile = base64ToFile(
            afterStr || beforeStr,
            `after-${i}.jpg`
          );

          const urls = await uploadPhotoPair(record.equipment_id, beforeFile, afterFile);
          
          updatedPhotoPairs.push({
            ...pair,
            before: urls.before,
            after: urls.after,
          });
          
          addLog(`✓ 设备 ${record.equipment_id} 第 ${i + 1} 组照片上传成功`);
        } catch (e: any) {
          addLog(`✗ 设备 ${record.equipment_id} 第 ${i + 1} 组照片上传失败：${e.message}`);
          // 保留原始 base64
          updatedPhotoPairs.push(pair);
        }
      } else {
        // 已经是 URL，直接保留
        updatedPhotoPairs.push(pair);
      }
    }

    // 更新数据库（保留原始数据作为备份，添加 migrated 标记）
    const { error } = await supabase
      .from("maintenance_records")
      .update({
        photo_pairs: updatedPhotoPairs,
        migrated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    if (error) {
      addLog(`✗ 设备 ${record.equipment_id} 数据库更新失败：${error.message}`);
    } else {
      addLog(`✓ 设备 ${record.equipment_id} 迁移完成`);
    }
  };

  const handleMigrateAll = async () => {
    if (records.length === 0) {
      alert("没有需要迁移的记录");
      return;
    }

    if (!confirm(`确定要迁移 ${records.length} 条记录吗？\n\n注意：原始 base64 数据会保留在数据库中作为备份。`)) {
      return;
    }

    setMigrating(true);
    setProgress({ current: 0, total: records.length });
    addLog(`开始迁移 ${records.length} 条记录...`);

    for (let i = 0; i < records.length; i++) {
      setProgress({ current: i + 1, total: records.length });
      await migrateRecord(records[i]);
    }

    addLog("迁移完成！");
    setMigrating(false);
    alert("迁移完成！");
  };

  const handleMigrateSingle = async (record: MigrationRecord) => {
    if (!confirm(`确定要迁移设备 ${record.equipment_id} 的记录吗？`)) {
      return;
    }

    setMigrating(true);
    await migrateRecord(record);
    setMigrating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">数据迁移工具</h1>
        <p className="text-gray-600 mb-6">
          将照片从 base64 格式迁移到 GitHub Releases 存储
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
                共 {records.length} 条记录包含 base64 照片
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
            <li>• 迁移过程中会保留原始 base64 数据作为备份</li>
            <li>• 迁移后的记录会添加 migrated_at 时间戳</li>
            <li>• 如果迁移失败，原始数据不会丢失</li>
            <li>• 建议先在测试环境验证后再正式迁移</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
