"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import { formatMonth } from "@/lib/storage";
import Link from "next/link";
import { Search, CheckCircle2, Clock, ChevronRight, Monitor, QrCode, Shield, User, Plus, X, Loader2 } from "lucide-react";
import { QRCodeModal } from "@/components/QRCodeModal";
import { useIsMobile } from "@/hooks/useIsMobile";

type Role = "admin" | "operator";

function getStoredRole(): Role {
  if (typeof window === "undefined") return "operator";
  return (sessionStorage.getItem("role") as Role) || "operator";
}

export default function Home() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role>(() => {
    // Mobile always uses operator role
    if (typeof window !== "undefined" && window.innerWidth < 768) return "operator";
    return getStoredRole();
  });
  const [records, setRecords] = useState<Record<string, any>>({});
  const [currentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [equipmentList, setEquipmentList] = useState(EQUIPMENT_LIST);

  // Add equipment modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [addingEquipment, setAddingEquipment] = useState(false);
  const [addError, setAddError] = useState("");

  // Fetch records for current month
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/records?month=${currentMonth}&role=${role}`);
        const json = await res.json();
        if (json.data) {
          const map: Record<string, any> = {};
          json.data.forEach((r: any) => {
            map[r.equipment_id] = r;
          });
          setRecords(map);
        }
      } catch (e) {
        console.error("Failed to fetch records:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [currentMonth, role]);

  // Fetch equipment list from API
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const res = await fetch("/api/equipment");
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setEquipmentList(json.data.map((e: any) => ({ id: e.id, name: e.name })));
        }
      } catch (e) {
        console.error("Failed to fetch equipment:", e);
      }
    };
    fetchEquipment();
  }, []);

  const handleRoleChange = useCallback((newRole: Role) => {
    setRole(newRole);
    sessionStorage.setItem("role", newRole);
  }, []);

  const handleAddEquipment = useCallback(async () => {
    const name = newEquipmentName.trim();
    if (!name) {
      setAddError("请输入设备名称");
      return;
    }

    setAddingEquipment(true);
    setAddError("");

    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();

      if (!res.ok) {
        setAddError(json.error || "添加失败");
        return;
      }

      // Add to local list
      setEquipmentList((prev) => [...prev, json.data]);
      setNewEquipmentName("");
      setShowAddModal(false);
    } catch (e) {
      setAddError("网络错误，请重试");
    } finally {
      setAddingEquipment(false);
    }
  }, [newEquipmentName]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return equipmentList;
    return equipmentList.filter((e) =>
      e.name.toLowerCase().includes(keyword)
    );
  }, [search, equipmentList]);

  const completedCount = Object.values(records).filter(
    (r: any) => r.photo_pairs && r.photo_pairs.length > 0 && r.photo_pairs.some((p: any) => p.before || p.after)
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
                {formatMonth(currentMonth)} · 已完成 {completedCount}/{equipmentList.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Records link - desktop only */}
              {!isMobile && (
                <Link
                  href="/records"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <Monitor className="w-4 h-4" />
                  记录
                </Link>
              )}
              {/* Role Toggle - desktop only */}
              {!isMobile && (
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => handleRoleChange("operator")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      role === "operator"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    操作端
                  </button>
                  <button
                    onClick={() => handleRoleChange("admin")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      role === "admin"
                        ? "bg-white text-purple-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    管理端
                  </button>
                </div>
              )}
            </div>
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
              width: `${equipmentList.length > 0 ? (completedCount / equipmentList.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Equipment List */}
      <div className="max-w-2xl mx-auto px-4 pb-24">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p>加载中...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>未找到匹配的设备</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((equipment) => {
              const record = records[equipment.id];
              const hasAnyPhoto = record?.photo_pairs?.some(
                (p: any) => p.before || p.after
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
                            {record.photo_pairs.filter((p: any) => p.before && p.after).length}组
                          </span>
                        )}
                      </div>
                      {record && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          上次更新: {new Date(record.updated_at).toLocaleString("zh-CN")}
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

        {/* Add Equipment Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full mt-4 py-4 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-colors"
        >
          <Plus className="w-5 h-5" />
          添加新设备
        </button>
      </div>

      {/* QR Code Button - desktop only */}
      {!isMobile && <QRCodeModal />}

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">添加新设备</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  设备名称
                </label>
                <input
                  type="text"
                  value={newEquipmentName}
                  onChange={(e) => {
                    setNewEquipmentName(e.target.value);
                    setAddError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddEquipment();
                  }}
                  placeholder="请输入设备名称，如：TKP-NEW"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {addError && (
                <p className="text-sm text-red-600">{addError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddEquipment}
                  disabled={addingEquipment || !newEquipmentName.trim()}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {addingEquipment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      添加中...
                    </>
                  ) : (
                    "确认添加"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
