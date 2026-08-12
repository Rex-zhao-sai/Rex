"use client";

import { useState } from "react";
import turso, { isTursoAvailable } from "@/lib/turso";
import { uploadToS3Direct } from "@/lib/s3-direct-upload";

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
  skipped: number;
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
/**
 * 将 base64 转换为 Blob
 */
function base64ToBlob(dataUrl: string): Blob | null {
  try {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return null;
    const byteCharacters = atob(matches[2]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: matches[1] });
  } catch {
    return null;
  }
}

/**
 * 清理 photo_pairs 中的 dataUrl，对于无 s3Key 的照片先上传到 S3
 */
async function stripDataUrl(
  photoPairs: PhotoPair[],
  skipNoS3Key = false
): Promise<{ cleaned: number; uploaded: number; skipped: number; errors: string[] }> {
  let cleaned = 0;
  let uploaded = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const pair of photoPairs) {
    for (const type of ["before", "after"] as const) {
      const photo = pair[type] as PhotoData | undefined;
      if (!photo) continue;

      if (photo.dataUrl) {
        if (photo.s3Key) {
          // 有 s3Key，直接删除 dataUrl
          delete photo.dataUrl;
          cleaned++;
        } else if (skipNoS3Key) {
          // 跳过无 s3Key 的记录
          skipped++;
        } else {
          // 没有 s3Key，尝试上传到 S3
          try {
            // 检查是否是有效的 base64 dataUrl
            if (!photo.dataUrl.startsWith('data:image/')) {
              errors.push(`${type} 照片格式不是 base64，跳过`);
              skipped++;
              continue;
            }

            const blob = base64ToBlob(photo.dataUrl);
            if (!blob) {
              errors.push(`${type} 照片 base64 解码失败，跳过`);
              skipped++;
              continue;
            }

            // 上传到 S3
            const s3Key = await uploadToS3Direct(blob, `migrate_${pair.id}_${type}.jpg`, pair.id, type);
            if (s3Key) {
              photo.s3Key = s3Key;
              delete photo.dataUrl;
              uploaded++;
            } else {
              errors.push(`${type} 照片上传失败：无可用上传 URL，跳过`);
              skipped++;
            }
          } catch (err: any) {
            errors.push(`${type} 照片上传出错：${err.message}，跳过`);
            skipped++;
          }
        }
      }
    }
  }

  return { cleaned, uploaded, skipped, errors };
}

export default function MigratePage() {
  const [status, setStatus] = useState<"idle" | "dry-run" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "ok" | "fail">("unknown");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [skipNoS3Key, setSkipNoS3Key] = useState(false); // 是否跳过无 s3Key 的记录

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
    setMessage(isDryRun ? "正在获取记录列表..." : "正在迁移...");
    setReport(null);
    setProgress({ current: 0, total: 0 });

    try {
      console.log("[Migrate] 开始查询记录列表...");
      
      // 第一步：只获取记录 ID 列表（不获取 photo_pairs，快速）
      const listTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("获取记录列表超时（30 秒）")), 30000)
      );
      const listPromise = turso.execute({
        sql: `SELECT id, equipment_id, month FROM maintenance_records WHERE photo_pairs IS NOT NULL AND photo_pairs != '[]'`,
      });
      const listResult = await Promise.race([listPromise, listTimeout]);
      const records = (listResult as any).rows as unknown as Array<{
        id: string;
        equipment_id: string;
        month: string;
      }>;
      
      console.log("[Migrate] 记录列表获取完成，共", records.length, "条");
      setProgress({ current: 0, total: records.length });

      let totalProcessed = 0;
      let totalUploaded = 0;
      let totalCleaned = 0;
      const errors: string[] = [];
      const details: MigrationReport["details"] = [];

      // 第二步：逐条获取 photo_pairs 并处理
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        setProgress({ current: i + 1, total: records.length });
        setMessage(`${isDryRun ? "预览" : "迁移"}中... ${i + 1}/${records.length} (${record.equipment_id?.slice(0, 8)}... ${record.month})`);

        try {
          // 逐条获取 photo_pairs（每条单独超时控制，增加到 180 秒）
          const fetchTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("获取 photo_pairs 超时（180 秒）")), 180000)
          );
          const fetchPromise = turso.execute({
            sql: `SELECT photo_pairs FROM maintenance_records WHERE id = ?`,
            args: [record.id],
          });
          const fetchResult = await Promise.race([fetchPromise, fetchTimeout]);
          const rows = (fetchResult as any).rows;
          
          if (!rows || rows.length === 0) continue;
          const photoPairsStr = rows[0].photo_pairs as string;

          let photoPairs: PhotoPair[];
          try {
            photoPairs = JSON.parse(photoPairsStr);
          } catch {
            errors.push(`记录 ${record.id} photo_pairs 解析失败`);
            continue;
          }

          if (!Array.isArray(photoPairs)) continue;

          const result = await stripDataUrl(photoPairs, skipNoS3Key);
          const { cleaned, uploaded, skipped } = result;
          if (result.errors.length > 0) {
            errors.push(...result.errors.map(e => `记录 ${record.id}: ${e}`));
          }

          if (cleaned === 0 && uploaded === 0 && skipped === 0) continue;

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
        skipped: 0,
        errors,
        details,
      };

      setMessage(
        isDryRun
          ? `预览完成：${totalProcessed} 条记录可迁移，可清理 ${totalCleaned} 个 dataUrl，可上传 ${totalUploaded} 个照片到 S3`
          : `迁移完成：处理 ${totalProcessed} 条记录，清理 ${totalCleaned} 个 dataUrl，上传 ${totalUploaded} 个照片到 S3`
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
            <li>勾选"跳过无 s3Key 的记录"：不处理这些记录，保持原样</li>
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipNoS3Key}
                  onChange={(e) => setSkipNoS3Key(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-[#111827]">跳过无 s3Key 的记录</span>
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

        {progress.total > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E5E7EB] mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6B7280]">进度</span>
              <span className="text-sm font-medium text-[#111827]">{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#2563EB] h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

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
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600">上传到 S3</div>
                <div className="text-xl font-bold text-blue-700">{report.uploaded}</div>
              </div>
              {report.skipped > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-600">跳过（无 s3Key）</div>
                  <div className="text-xl font-bold text-blue-700">{report.skipped}</div>
                </div>
              )}
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
