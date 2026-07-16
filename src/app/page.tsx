"use client";

import { useState, useMemo } from "react";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import { getAllRecords, getCurrentMonth, formatMonth } from "@/lib/storage";
import Link from "next/link";
import { Search, CheckCircle2, Clock, ChevronRight, Monitor, QrCode, ArrowLeft } from "lucide-react";
import { QRCodeModal } from "@/components/QRCodeModal";

export default function Home() {
  const [search, setSearch] = useState("");
  const currentMonth = getCurrentMonth();

  const records = useMemo(() => getAllRecords(), []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return EQUIPMENT_LIST;
    return EQUIPMENT_LIST.filter((e) =>
      e.name.toLowerCase().includes(keyword)
    );
  }, [search]);

  const getRecordStatus = (equipmentId: string) => {
    return records.find(
      (r) => r.equipmentId === equipmentId && r.month === currentMonth
    );
  };

  const completedCount = records.filter(
    (r) => r.month === currentMonth && r.photoPairs.length > 0
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">设备月度保养</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatMonth(currentMonth)} · 已完成 {completedCount}/{EQUIPMENT_LIST.length}
              </p>
            </div>
            <Link
              href="/records"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Monitor className="w-4 h-4" />
              记录
            </Link>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索设备名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{
              width: `${(completedCount / EQUIPMENT_LIST.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Equipment List */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>未找到匹配的设备</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((equipment) => {
              const record = getRecordStatus(equipment.id);
              const hasAnyPhoto = record?.photoPairs.some(
                (p) => p.before || p.after
              );

              return (
                <Link
                  key={equipment.id}
                  href={`/equipment/${equipment.id}`}
                  className="block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="flex items-center px-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {equipment.name}
                        </span>
                        {hasAnyPhoto && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
                            <CheckCircle2 className="w-3 h-3" />
                            {record?.photoPairs.filter((p) => p.before && p.after).length || 0}组
                          </span>
                        )}
                      </div>
                      {record && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          上次更新: {new Date(record.updatedAt).toLocaleString("zh-CN")}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 ml-2" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Code Button */}
      <QRCodeModal />
    </div>
  );
}
