"use client";

import { useState, useEffect } from "react";
import { getStorageUsage, type StorageUsage } from "@/lib/github-storage";
import { HardDrive, FileImage, Loader2, AlertCircle, RefreshCw } from "lucide-react";

export default function StoragePage() {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsage = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStorageUsage();
      setUsage(data);
    } catch (e: any) {
      setError(e.message || "获取存储信息失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#111827]">存储空间</h1>
          <button
            onClick={fetchUsage}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* 加载状态 */}
        {loading && !usage && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-[#2563EB]" />
            <p className="mt-4 text-[#6B7280]">正在获取存储信息...</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">获取失败</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 存储信息 */}
        {usage && (
          <div className="space-y-4">
            {/* 仓库信息 */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
              <div className="flex items-center gap-3 mb-3">
                <HardDrive size={20} className="text-[#2563EB]" />
                <h2 className="font-semibold text-[#111827]">GitHub Releases 存储</h2>
              </div>
              <p className="text-sm text-[#6B7280]">仓库：{usage.repoName}</p>
            </div>

            {/* 使用量卡片 */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[#6B7280]">已使用空间</span>
                <span className="text-2xl font-bold text-[#111827]">{usage.totalSizeMB} MB</span>
              </div>
              
              {/* 进度条 */}
              <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-[#2563EB] transition-all duration-500"
                  style={{ width: `${Math.min(parseFloat(usage.usagePercent), 100)}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-[#6B7280]">{usage.usagePercent}%</span>
                <span className="text-[#6B7280]">限制 {usage.limitGB} GB</span>
              </div>
            </div>

            {/* 文件统计 */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
              <div className="flex items-center gap-3">
                <FileImage size={20} className="text-[#22C55E]" />
                <div>
                  <p className="text-sm text-[#6B7280]">照片数量</p>
                  <p className="text-2xl font-bold text-[#111827]">{usage.fileCount} 张</p>
                </div>
              </div>
            </div>

            {/* 说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">存储说明</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 照片存储在 GitHub Releases 中</li>
                <li>• 单个 Release 附件总大小限制为 2 GB</li>
                <li>• 单个文件大小限制为 2 GB</li>
                <li>• 照片上传后不可修改，只能删除后重新上传</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
