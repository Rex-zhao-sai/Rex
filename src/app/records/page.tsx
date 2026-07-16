"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import { getAllRecords, getCurrentMonth, formatMonth } from "@/lib/storage";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Calendar,
  User,
  FileText,
  Download,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function RecordsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showQR, setShowQR] = useState(false);

  const allRecords = useMemo(() => getAllRecords(), []);

  // Get all unique months from records
  const availableMonths = useMemo(() => {
    const months = new Set(allRecords.map((r) => r.month));
    months.add(getCurrentMonth());
    return Array.from(months).sort().reverse();
  }, [allRecords]);

  const monthRecords = useMemo(() => {
    return allRecords.filter((r) => r.month === selectedMonth);
  }, [allRecords, selectedMonth]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return monthRecords;
    return monthRecords.filter((r) => {
      const eq = EQUIPMENT_LIST.find((e) => e.id === r.equipmentId);
      return eq?.name.toLowerCase().includes(keyword);
    });
  }, [monthRecords, search]);

  const completedCount = monthRecords.filter(
    (r) => r.photoPairs.length > 0
  ).length;

  const getEquipmentName = (id: string) => {
    return EQUIPMENT_LIST.find((e) => e.id === id)?.name ?? id;
  };

  const handleExport = () => {
    const data = filtered.map((r) => ({
      设备名称: getEquipmentName(r.equipmentId),
      技术员: r.technician,
      照片组数: r.photoPairs.filter((p) => p.before && p.after).length,
      备注: r.notes,
      创建时间: new Date(r.createdAt).toLocaleString("zh-CN"),
      更新时间: new Date(r.updatedAt).toLocaleString("zh-CN"),
    }));

    const csvContent = [
      ["设备名称", "技术员", "照片组数", "备注", "创建时间", "更新时间"].join(","),
      ...data.map((row) =>
        Object.values(row)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `保养记录_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">保养记录总览</h1>
            <p className="text-xs text-gray-500">
              电脑端查看 · 共 {completedCount} 台设备已完成
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQR(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              扫码
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出CSV
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索设备名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">设备总数</p>
            <p className="text-2xl font-bold text-gray-900">
              {EQUIPMENT_LIST.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">已完成</p>
            <p className="text-2xl font-bold text-green-600">
              {completedCount}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">待保养</p>
            <p className="text-2xl font-bold text-orange-500">
              {EQUIPMENT_LIST.length - completedCount}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">完成率</p>
            <p className="text-2xl font-bold text-blue-600">
              {Math.round((completedCount / EQUIPMENT_LIST.length) * 100)}%
            </p>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">暂无保养记录</p>
              <p className="text-xs mt-1">
                {search ? "尝试其他关键词" : "请在手机端完成保养后查看"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      设备名称
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      技术员
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      照片组数
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      备注
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      更新时间
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((record) => {
                    const completedPairs = record.photoPairs.filter(
                      (p) => p.before && p.after
                    ).length;
                    return (
                      <tr
                        key={record.equipmentId}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {getEquipmentName(record.equipmentId)}
                            </span>
                            {completedPairs > 0 && (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>{record.technician || "-"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              completedPairs > 0
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {completedPairs} 组
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-[200px] truncate">
                          {record.notes || "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(record.updatedAt).toLocaleString("zh-CN")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/equipment/${record.equipmentId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            查看
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Photo Preview Section */}
        {filtered.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              保养照片预览
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((record) => {
                const completedPairs = record.photoPairs.filter(
                  (p) => p.before && p.after
                );
                if (completedPairs.length === 0) return null;
                return (
                  <div
                    key={record.equipmentId}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {getEquipmentName(record.equipmentId)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {completedPairs.length}组
                      </span>
                    </div>
                    <div className="space-y-3">
                      {completedPairs.slice(0, 3).map((pair, idx) => (
                        <div key={pair.id} className="flex gap-2">
                          {pair.before && (
                            <div className="flex-1">
                              <div className="relative">
                                <img
                                  src={pair.before.dataUrl}
                                  alt={`Before #${idx + 1}`}
                                  className="w-full aspect-square object-cover rounded-lg border border-gray-100"
                                />
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">
                                  Before
                                </span>
                              </div>
                            </div>
                          )}
                          {pair.after && (
                            <div className="flex-1">
                              <div className="relative">
                                <img
                                  src={pair.after.dataUrl}
                                  alt={`After #${idx + 1}`}
                                  className="w-full aspect-square object-cover rounded-lg border border-gray-100"
                                />
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded">
                                  After
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {completedPairs.length > 3 && (
                        <p className="text-xs text-gray-400 text-center">
                          还有 {completedPairs.length - 3} 组照片...
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/equipment/${record.equipmentId}`}
                      className="mt-3 block text-center text-xs text-blue-600 hover:underline"
                    >
                      查看完整记录 →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">
                手机扫码进入
              </h3>
              <button
                onClick={() => setShowQR(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 text-gray-500 rotate-180" />
              </button>
            </div>
            <div className="flex justify-center py-4">
              <div className="bg-white p-3 rounded-xl border-2 border-gray-100 shadow-inner">
                <QRCodeSVG
                  value={typeof window !== "undefined" ? window.location.origin : ""}
                  size={200}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#111827"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              用手机浏览器扫描此二维码即可进入保养页面
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
