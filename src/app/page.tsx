"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import supabase from "@/lib/supabase-browser";
import Link from "next/link";
import { Search, CheckCircle2, Clock, ChevronRight, Monitor, QrCode, Shield, User, Plus, X, Loader2, AlertCircle } from "lucide-react";
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
  const [connectionError, setConnectionError] = useState("");

  // Add equipment modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [addingEquipment, setAddingEquipment] = useState(false);
  const [addError, setAddError] = useState("");

  // QR code modal
  const [showQR, setShowQR] = useState(false);

  // Fetch records for current month
  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      setConnectionError("");
      try {
        const { data, error } = await supabase
          .from("maintenance_records")
          .select("*, equipment(name)")
          .eq("month", currentMonth);

        if (error) throw error;

        const map: Record<string, any> = {};
        (data || []).forEach((r) => {
          map[r.equipment_id] = r;
        });
        setRecords(map);
      } catch (e: any) {
        console.error("获取记录失败:", e);
        setConnectionError("连接失败，请检查网络后刷新页面");
      } finally {
        setLoading(false);
      }
    };
    loadRecords();
  }, [currentMonth]);

  // Fetch equipment list from Supabase
  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const { data, error } = await supabase
          .from("equipment")
          .select("*")
          .order("name");

        if (error) throw error;
        if (data && data.length > 0) {
          setEquipmentList(data.map((e) => ({ id: e.id, name: e.name })));
        }
      } catch (e) {
        console.error("获取设备列表失败:", e);
      }
    };
    loadEquipment();
  }, []);

  // Add new equipment
  const handleAddEquipment = async () => {
    if (!newEquipmentName.trim()) return;
    setAddingEquipment(true);
    setAddError("");

    try {
      const id = newEquipmentName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data, error } = await supabase
        .from("equipment")
        .insert({ id, name: newEquipmentName.trim() })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          setAddError("设备名称已存在");
        } else {
          throw error;
        }
        return;
      }

      setEquipmentList((prev) => [...prev, { id: data.id, name: data.name }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewEquipmentName("");
      setShowAddModal(false);
    } catch (e: any) {
      setAddError(e.message || "添加失败");
    } finally {
      setAddingEquipment(false);
    }
  };

  // Filtered equipment
  const filtered = useMemo(() => {
    if (!search.trim()) return equipmentList;
    const q = search.toLowerCase();
    return equipmentList.filter((e) => e.name.toLowerCase().includes(q));
  }, [equipmentList, search]);

  // Stats
  const completed = Object.keys(records).length;
  const total = equipmentList.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleRoleToggle = () => {
    const newRole = role === "admin" ? "operator" : "admin";
    setRole(newRole);
    sessionStorage.setItem("role", newRole);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#111827]">设备月度保养</h1>
          <div className="flex items-center gap-2">
            {/* Role toggle - desktop only */}
            {!isMobile && (
              <button
                onClick={handleRoleToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  role === "admin"
                    ? "bg-[#2563EB] text-white"
                    : "bg-[#F3F4F6] text-[#6B7280]"
                }`}
              >
                {role === "admin" ? <Shield size={14} /> : <User size={14} />}
                {role === "admin" ? "管理端" : "操作端"}
              </button>
            )}
            {/* Records link - desktop only */}
            {!isMobile && (
              <Link
                href="/records"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-sm font-medium hover:bg-[#E5E7EB] transition-colors"
              >
                <Monitor size={14} />
                记录
              </Link>
            )}
            {/* QR code button - visible on all devices */}
            <button
              onClick={() => setShowQR(true)}
              className="p-2 rounded-full bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] transition-colors"
            >
              <QrCode size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Connection error banner */}
      {connectionError && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
            <AlertCircle size={16} />
            {connectionError}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#6B7280]">{currentMonth} 保养进度</span>
            <span className="text-sm font-medium text-[#111827]">
              {completed}/{total} ({progress}%)
            </span>
          </div>
          <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#22C55E] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="搜索设备名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* Equipment list */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#2563EB]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#6B7280] text-sm">
            没有找到匹配的设备
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((eq) => {
              const record = records[eq.id];
              const isCompleted = !!record;
              const photoCount = record?.photo_pairs?.length || 0;

              return (
                <Link
                  key={eq.id}
                  href={`/equipment/${eq.id}`}
                  className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-[#E5E7EB]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle2 size={18} className="text-[#22C55E] flex-shrink-0" />
                        ) : (
                          <Clock size={18} className="text-[#9CA3AF] flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-[#111827] truncate">
                          {eq.name}
                        </span>
                      </div>
                      {isCompleted && (
                        <div className="mt-1 ml-5 text-xs text-[#6B7280]">
                          {photoCount} 组照片 · {new Date(record.updated_at).toLocaleDateString("zh-CN")}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-[#D1D5DB] flex-shrink-0 ml-2" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Add equipment button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full mt-4 py-3 border-2 border-dashed border-[#D1D5DB] rounded-xl text-[#6B7280] text-sm font-medium hover:border-[#2563EB] hover:text-[#2563EB] transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          添加新设备
        </button>
      </div>

      {/* Add equipment modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#111827]">添加新设备</h3>
              <button onClick={() => { setShowAddModal(false); setAddError(""); setNewEquipmentName(""); }} className="p-1 rounded-full hover:bg-[#F3F4F6]">
                <X size={20} className="text-[#6B7280]" />
              </button>
            </div>
            <input
              type="text"
              placeholder="输入设备名称..."
              value={newEquipmentName}
              onChange={(e) => { setNewEquipmentName(e.target.value); setAddError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAddEquipment()}
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              autoFocus
            />
            {addError && (
              <p className="mt-2 text-xs text-red-500">{addError}</p>
            )}
            <button
              onClick={handleAddEquipment}
              disabled={!newEquipmentName.trim() || addingEquipment}
              className="w-full mt-4 py-2.5 bg-[#2563EB] text-white rounded-xl text-sm font-medium hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {addingEquipment ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {addingEquipment ? "添加中..." : "确认添加"}
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {!isMobile && showQR && <QRCodeModal />}
    </div>
  );
}
