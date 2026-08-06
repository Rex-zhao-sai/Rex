"use client";

import { useState, useEffect } from "react";
import * as tursoApi from "@/lib/turso-api";
import { Database, Image, HardDrive, Loader2, RefreshCw } from "lucide-react";

interface StorageStats {
  totalRecords: number;
  recordsWithPhotos: number;
  totalPhotos: number;
  estimatedSizeMB: string;
}

export default function TursoStoragePage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      // 获取所有记录
      const records = await tursoApi.getRecordsByMonth("2026-07");
      const allRecords = [...records];
      
      // 获取 8 月记录
      const augRecords = await tursoApi.getRecordsByMonth("2026-08");
      allRecords.push(...augRecords);

      // 计算统计
      let totalPhotos = 0;
      let estimatedSize = 0;
      
      allRecords.forEach(record => {
        if (record.photo_pairs && Array.isArray(record.photo_pairs)) {
          record.photo_pairs.forEach((pair: any) => {
            if (pair.before?.dataUrl) {
              totalPhotos++;
              estimatedSize += pair.before.dataUrl.length * 0.75; // base64 大小估算
            }
            if (pair.after?.dataUrl) {
              totalPhotos++;
              estimatedSize += pair.after.dataUrl.length * 0.75;
            }
          });
        }
      });

      setStats({
        totalRecords: allRecords.length,
        recordsWithPhotos: allRecords.filter(r => 
          r.photo_pairs && Array.isArray(r.photo_pairs) && r.photo_pairs.length > 0
        ).length,
        totalPhotos,
        estimatedSizeMB: (estimatedSize / 1024 / 1024).toFixed(2),
      });
    } catch (e: any) {
      setError(e.message || "获取统计信息失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#111827]">Turso 存储统计</h1>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* 加载状态 */}
        {loading && !stats && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-[#2563EB]" />
            <p className="mt-4 text-[#6B7280]">正在获取统计信息...</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 统计信息 */}
        {stats && (
          <div className="space-y-4">
            {/* 数据库信息 */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
              <div className="flex items-center gap-3 mb-3">
                <Database size={20} className="text-[#2563EB]" />
                <h2 className="font-semibold text-[#111827]">Turso 数据库</h2>
              </div>
              <p className="text-sm text-[#6B7280]">照片以 base64 格式存储在 photo_pairs 字段中</p>
            </div>

            {/* 记录统计 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database size={16} className="text-[#6B7280]" />
                  <span className="text-sm text-[#6B7280]">总记录数</span>
                </div>
                <p className="text-2xl font-bold text-[#111827]">{stats.totalRecords}</p>
              </div>

              <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Image size={16} className="text-[#22C55E]" />
                  <span className="text-sm text-[#6B7280]">有照片记录</span>
                </div>
                <p className="text-2xl font-bold text-[#111827]">{stats.recordsWithPhotos}</p>
              </div>
            </div>

            {/* 照片统计 */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
              <div className="flex items-center gap-3">
                <Image size={20} className="text-[#22C55E]" />
                <div>
                  <p className="text-sm text-[#6B7280]">照片总数</p>
                  <p className="text-2xl font-bold text-[#111827]">{stats.totalPhotos} 张</p>
                </div>
              </div>
            </div>

            {/* 存储大小 */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
              <div className="flex items-center gap-3">
                <HardDrive size={20} className="text-[#F97316]" />
                <div>
                  <p className="text-sm text-[#6B7280]">估算存储大小</p>
                  <p className="text-2xl font-bold text-[#111827]">{stats.estimatedSizeMB} MB</p>
                  <p className="text-xs text-[#6B7280] mt-1">Turso 免费额度：5 GB</p>
                </div>
              </div>
              
              {/* 使用进度条 */}
              <div className="mt-3">
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-[#2563EB] transition-all duration-500"
                    style={{ width: `${Math.min((parseFloat(stats.estimatedSizeMB) / 5120) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-[#6B7280]">
                  <span>{stats.estimatedSizeMB} MB 已用</span>
                  <span>5120 MB 总额</span>
                </div>
              </div>
            </div>

            {/* 说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">存储说明</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 照片以 base64 格式存储在 Turso 数据库中</li>
                <li>• 每张照片约增加 1-3 MB 存储空间</li>
                <li>• Turso 免费额度：5 GB 存储</li>
                <li>• 当前使用：{(parseFloat(stats.estimatedSizeMB) / 51.2).toFixed(1)}% 额度</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
