"use client";

import { useState } from "react";

export default function MigratePage() {
  const [status, setStatus] = useState<"idle" | "dry-run" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<any>(null);
  const [dryRun, setDryRun] = useState(true);

  const runMigration = async (isDryRun: boolean) => {
    setStatus(isDryRun ? "dry-run" : "running");
    setMessage(isDryRun ? "正在预览迁移效果..." : "正在迁移，请稍候...");
    setReport(null);

    try {
      const res = await fetch("/api/migrate-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: isDryRun, batchSize: 20 }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "迁移失败");
      }

      setMessage(data.message);
      setReport(data.report);
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
            <li>没有 s3Key 的照片：先上传到 S3，获得 s3Key，再删除 dataUrl</li>
            <li>迁移后 photo_pairs 数据量预计从 MB 级降到 KB 级</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E5E7EB] mb-6">
          <div className="flex items-center gap-4 mb-4">
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
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600">新上传 S3</div>
                <div className="text-xl font-bold text-blue-700">{report.uploaded}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600">仅清理 dataUrl</div>
                <div className="text-xl font-bold text-green-700">{report.cleaned}</div>
              </div>
            </div>

            {report.errors.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-red-700 mb-2">错误 ({report.errors.length})</h4>
                <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                  {report.errors.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <details className="text-sm">
              <summary className="cursor-pointer text-[#6B7280] hover:text-[#111827]">
                查看详细记录 ({report.details?.length || 0})
              </summary>
              <div className="mt-2 max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">设备</th>
                      <th className="text-left py-1">月份</th>
                      <th className="text-right py-1">上传</th>
                      <th className="text-right py-1">清理</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.details?.map((d: any) => (
                      <tr key={d.id} className="border-b border-gray-100">
                        <td className="py-1 text-[#6B7280]">{d.equipment_id?.slice(0, 8)}...</td>
                        <td className="py-1">{d.month}</td>
                        <td className="py-1 text-right text-blue-600">{d.uploaded}</td>
                        <td className="py-1 text-right text-green-600">{d.cleaned}</td>
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
