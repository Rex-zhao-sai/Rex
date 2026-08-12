"use client";

import { useState } from "react";
import turso, { isTursoAvailable } from "@/lib/turso";

interface PhotoData {
  id: string;
  type: "before" | "after";
  dataUrl?: string;
  s3Key?: string;
  s3Url?: string;
  timestamp?: string;
}

interface PhotoPair {
  id: string;
  before?: PhotoData;
  after?: PhotoData;
  note?: string;
  duration?: number;
}

interface MigrationReport {
  total: number;
  processed: number;
  uploaded: number;
  cleaned: number;
  errors: string[];
  details: Array<{
    id: string;
    equipment_id: string;
    month: string;
    uploaded: number;
    cleaned: number;
  }>;
}

// 去除 photo_pairs 中的 dataUrl，仅保留 s3Key
function stripDataUrl(photoPairs: PhotoPair[]): { cleaned: number; uploaded: number } {
  let cleaned = 0;
  let uploaded = 0;

  for (const pair of photoPairs) {
    for (const type of ["before", "after"] as const) {
      const photo = pair[type] as PhotoData | undefined;
      if (!photo) continue;

      if (photo.dataUrl) {
        if (photo.s3Key) {
          // 有 s3Key，直接删除 dataUrl
          delete photo.dataUrl;
          cleaned++;
        } else {
          // 没有 s3Key，无法迁移（需要 S3 上传，客户端无法完成）
          // 保留 dataUrl 作为最后手段
          uploaded++;
        }
      }
    }
  }

  return { cleaned, uploaded };
}

export default function MigratePage() {
  const [status, setStatus] = useState<"idle" | "dry-run" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "ok" | "fail">("unknown");

  const testConnection = async () => {
    if (!isTursoAvailable() || !turso) {
      setConnectionStatus("fail");
      setMessage("Turso 不可用：环境变量未配置");
      return;
    }

    setMessage("正在测试连接...");
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("连接超时（10 秒）")), 10000)
      );
      const queryPromise = turso.execute({ sql: `SELECT 1 as test` });
      await Promise.race([queryPromise, timeoutPromise]);
      setConnectionStatus("ok");
      setMessage("Turso 连接正常");
    } catch (err: any) {
      setConnectionStatus("fail");
      setMessage(`连接失败：${err.message}`);
    }
  };

  const runMigration = async (isDryRun: boolean) => {
    if (!isTursoAvailable() || !turso) {
      setMessage("Turso 不可用：环境变量未配置");
      setStatus("error");
      return;
    }

    setStatus(isDryRun ? "dry-run" : "running");
    setMessage(isDryRun ? "正在预览迁移效果..." : "正在迁移，请稍候...");
    setReport(null);

    try {
      console.log("[Migrate] 开始查询数据库...");
      
      // 添加超时控制（60 秒）
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("查询超时（60 秒）- 可能是网络问题或数据量过大")), 60000)
      );

      const queryPromise = turso.execute({
        sql: `SELECT id, equipment_id, month, photo_pairs FROM maintenance_records WHERE photo_pairs IS NOT NULL AND photo_pairs != '[]'`,
      });

      const result = await Promise.race([queryPromise, timeoutPromise]);
      console.log("[Migrate] 查询完成，记录数:", (result as any).rows?.length);

      const records = (result as any).rows as unknown as Array<{
        id: string;
        equipment_id: string;
        month: string;
        photo_pairs: string;
      }>;
      let totalProcessed = 0;
      let totalUploaded = 0;
      let totalCleaned = 0;
      const errors: string[] = [];
      const details: MigrationReport["details"] = [];

      for (const record of records) {
        try {
          let photoPairs: PhotoPair[];
          try {
            photoPairs = JSON.parse(record.photo_pairs);
          } catch {
            errors.push(`记录 ${record.id} photo_pairs 解析失败`);
            continue;
          }

          if (!Array.isArray(photoPairs)) continue;

          const { cleaned, uploaded } = stripDataUrl(photoPairs);

          if (cleaned === 0 && uploaded === 0) continue;

          if (!isDryRun) {
            // 实际更新数据库（带超时）
            const updateTimeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`记录 ${record.id} 更新超时`)), 30000)
            );
            const updatePromise = turso.execute({
              sql: `UPDATE maintenance_records SET photo_pairs = ? WHERE id = ?`,
              args: [JSON.stringify(photoPairs), record.id],
            });
            await Promise.race([updatePromise, updateTimeout]);
          }

          totalProcessed++;
          totalCleaned += cleaned;
          totalUploaded += uploaded;
          details.push({
            id: record.id,
            equipment_id: record.equipment_id,
            month: record.month,
            uploaded,
            cleaned,
          });
        } catch (err: any) {
          errors.push(`记录 ${record.id}: ${err.message}`);
        }
      }

      const report: MigrationReport = {
        total: records.length,
        processed: totalProcessed,
        uploaded: totalUploaded,
        cleaned: totalCleaned,
        errors,
        details,
      };

      setMessage(
        isDryRun
          ? `预览完成：${totalProcessed} 条记录可迁移，可清理 ${totalCleaned} 个 dataUrl`
          : `迁移完成：处理 ${totalProcessed} 条记录，清理 ${totalCleaned} 个 dataUrl`
      );
      setReport(report);
      setStatus("done");
    } catch (err: any) {
      setMessage(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#111827] mb-6">照片数据迁移工具</h1>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E5E7EB] mb-6">
          <h2 className="text-lg font-semibold text-[#111827] mb-3">功能说明</h2>
          <p className="text-sm text-[#6B7280] mb-4">
            清理历史保养记录中照片的 base64 数据（dataUrl），仅保留 S3 存储引用（s3Key）。
            这样可以大幅减小数据库 photo_pairs 字段的大小，解决查询超时问题。
          </p>
          <ul className="text-sm text-[#6B7280] space-y-1 list-disc list-inside">
            <li>有 s3Key 的照片：直接删除 dataUrl（S3 已有完整图片）</li>
            <li>没有 s3Key 的照片：保留 dataUrl（无法自动迁移）</li>
            <li>迁移后 photo_pairs 数据量预计从 MB 级降到 KB 级</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E5E7EB] mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-[#111827]">预览模式（不实际修改数据）</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                connectionStatus === "ok" ? "bg-green-500" :
                connectionStatus === "fail" ? "bg-red-500" : "bg-gray-300"
              }`}></span>
              <span className="text-xs text-[#6B7280]">
                {connectionStatus === "ok" ? "已连接" : connectionStatus === "fail" ? "连接失败" : "未测试"}
              </span>
              <button
                onClick={testConnection}
                className="px-3 py-1 text-xs text-[#2563EB] border border-[#2563EB] rounded hover:bg-[#2563EB] hover:text-white"
              >
                测试连接
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => runMigration(true)}
              disabled={status === "running"}
              className="px-4 py-2 bg-[#6B7280] text-white rounded-lg text-sm font-medium hover:bg-[#4B5563] disabled:opacity-50"
            >
              预览迁移效果
            </button>
            <button
              onClick={() => runMigration(false)}
              disabled={status === "running" || dryRun}
              className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              执行迁移
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-xl p-4 border ${
              status === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : status === "done"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {report && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E5E7EB] mt-4">
            <h3 className="text-base font-semibold text-[#111827] mb-3">迁移报告</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-[#6B7280]">总记录数</div>
                <div className="text-xl font-bold text-[#111827]">{report.total}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-[#6B7280]">已处理</div>
                <div className="text-xl font-bold text-[#111827]">{report.processed}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600">清理 dataUrl</div>
                <div className="text-xl font-bold text-green-700">{report.cleaned}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-xs text-yellow-600">保留（无 s3Key）</div>
                <div className="text-xl font-bold text-yellow-700">{report.uploaded}</div>
              </div>
            </div>

            {report.errors.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-red-700 mb-2">错误 ({report.errors.length})</h4>
                <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                  {report.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <details className="text-sm">
              <summary className="cursor-pointer text-[#6B7280] hover:text-[#111827]">
                查看详细记录 ({report.details.length})
              </summary>
              <div className="mt-2 max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">设备</th>
                      <th className="text-left py-1">月份</th>
                      <th className="text-right py-1">清理</th>
                      <th className="text-right py-1">保留</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.details.map((d) => (
                      <tr key={d.id} className="border-b border-gray-100">
                        <td className="py-1 text-[#6B7280]">{d.equipment_id?.slice(0, 8)}...</td>
                        <td className="py-1">{d.month}</td>
                        <td className="py-1 text-right text-green-600">{d.cleaned}</td>
                        <td className="py-1 text-right text-yellow-600">{d.uploaded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
