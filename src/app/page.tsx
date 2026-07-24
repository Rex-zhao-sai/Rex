"use client";

import { useState, useEffect, useMemo } from "react";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import { LAST_MAINTENANCE_FROM_EXCEL } from "@/lib/excel-maintenance-data";
import supabase from "@/lib/supabase-browser";
import Link from "next/link";
import { Search, CheckCircle2, Clock, ChevronRight, Monitor, QrCode, Shield, User, Plus, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { QRCodeModal } from "@/components/QRCodeModal";
import { useIsMobile } from "@/hooks/useIsMobile";

type Role = "admin" | "operator";

// Get basePath for static assets (GitHub Pages uses /Rex)
const getBasePath = () => {
  if (typeof window !== "undefined" && window.location.hostname.includes("github.io")) {
    return "/Rex";
  }
  return "";
};

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

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Expand state for each group
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    overdue: false,
    upcoming: false,
    completed: false,
  });

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

  // 切换分组展开状态
  const toggleExpand = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  // 过滤和分组设备
  const groupedEquipment = useMemo(() => {
    let list = equipmentList;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = equipmentList.filter((e) => e.name.toLowerCase().includes(q));
    }

    const overdue: any[] = [];      // 超期未保养 (>30 天)
    const upcoming: any[] = [];     // 即将到期 (<30 天但本月未保养)
    const completed: any[] = [];    // 本月已完成

    list.forEach((eq) => {
      const record = records[eq.id];
      
      // 内联计算天数，避免闭包问题
      let days = 61; // 默认值
      if (record && record.updated_at) {
        const lastDate = new Date(record.updated_at);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else {
        const excelDate = LAST_MAINTENANCE_FROM_EXCEL[eq.id];
        if (excelDate) {
          const lastDate = new Date(excelDate);
          const today = new Date();
          const diffTime = Math.abs(today.getTime() - lastDate.getTime());
          days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      if (record) {
        // 本月有保养记录
        completed.push({ ...eq, days, record });
      } else if (days > 30) {
        // 超期未保养 (>30 天)
        overdue.push({ ...eq, days });
      } else {
        // 即将到期 (<30 天但本月未保养)
        upcoming.push({ ...eq, days });
      }
    });

    // 按天数排序（降序）
    overdue.sort((a, b) => b.days - a.days);
    upcoming.sort((a, b) => b.days - a.days);
    completed.sort((a, b) => b.days - a.days);

    return { overdue, upcoming, completed };
  }, [equipmentList, search, records]);

  // Stats
  const completedCount = groupedEquipment.completed.length;
  const upcomingCount = groupedEquipment.upcoming.length;
  const overdueCount = groupedEquipment.overdue.length;
  const total = equipmentList.length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const handleRoleToggle = () => {
    if (role === "admin") {
      // Switching from admin to operator - no password needed
      const newRole = "operator";
      setRole(newRole);
      sessionStorage.setItem("role", newRole);
    } else {
      // Switching from operator to admin - show password modal
      setShowPasswordModal(true);
      setPassword("");
      setPasswordError("");
    }
  };

  const handlePasswordSubmit = () => {
    if (password === "Test12345678!@") {
      const newRole = "admin";
      setRole(newRole);
      sessionStorage.setItem("role", newRole);
      setShowPasswordModal(false);
      setPassword("");
      setPasswordError("");
    } else {
      setPasswordError("密码错误，请重试");
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPassword("");
    setPasswordError("");
  };

  // 渲染设备卡片
  const renderEquipmentCard = (eq: any, isCompleted: boolean) => {
    const record = eq.record;
    const photoCount = record?.photo_pairs?.length || 0;
    const lastMaintenanceDate = record?.updated_at || LAST_MAINTENANCE_FROM_EXCEL[eq.id] || null;

    let statusColor = "";
    let statusIcon = null;
    let statusText = "";

    if (isCompleted) {
      statusColor = "border-green-500";
      statusIcon = <CheckCircle2 size={16} className="text-green-500" />;
      statusText = `🟢 ${eq.days}天前`;
    } else if (eq.days > 30) {
      // 超期未保养 (>30 天)
      statusColor = "border-red-500";
      statusIcon = <AlertCircle size={16} className="text-red-500" />;
      statusText = `🔴 ${eq.days}天前`;
    } else {
      // 即将到期 (<30 天)
      statusColor = "border-yellow-500";
      statusIcon = <Clock size={16} className="text-yellow-500" />;
      statusText = `🟡 ${eq.days}天前`;
    }

    return (
      <Link
        key={eq.id}
        href={`/equipment/${eq.id}`}
        className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border-l-4 ${statusColor} card-hover block`}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-gray-900 text-sm truncate">{eq.name}</h4>
          {statusIcon}
        </div>
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isCompleted ? "bg-green-100 text-green-700" :
            eq.days > 30 ? "bg-red-100 text-red-700" :
            "bg-yellow-100 text-yellow-700"
          }`}>
            {statusText}
          </span>
        </div>
        {isCompleted ? (
          <p className="text-xs text-gray-500">
            保养人：{record.technician || "未知"} · {photoCount} 组照片
          </p>
        ) : lastMaintenanceDate ? (
          <p className="text-xs text-gray-500">
            上次保养：{new Date(lastMaintenanceDate).toLocaleDateString("zh-CN")}
          </p>
        ) : null}
      </Link>
    );
  };

  // 渲染分组
  const renderGroup = (title: string, count: number, items: any[], groupKey: string, isCompleted: boolean) => {
    const isExpanded = expandedGroups[groupKey];
    const visibleItems = isExpanded ? items : items.slice(0, 4);

    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              groupKey === "overdue" ? "bg-red-500" :
              groupKey === "upcoming" ? "bg-yellow-500" :
              "bg-green-500"
            }`}></span>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              groupKey === "overdue" ? "bg-red-100 text-red-700" :
              groupKey === "upcoming" ? "bg-yellow-100 text-yellow-700" :
              "bg-green-100 text-green-700"
            }`}>
              {count}
            </span>
          </div>
          {items.length > 4 && (
            <button
              onClick={() => toggleExpand(groupKey)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronDown
                size={20}
                className={`text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleItems.map((eq) => renderEquipmentCard(eq, isCompleted))}
        </div>
        {isExpanded && items.length > 4 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
            {items.slice(4).map((eq) => renderEquipmentCard(eq, isCompleted))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={`${getBasePath()}/melecs-logo.png`} alt="Melecs Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-xl font-bold text-gray-900">设备月度保养</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Role toggle - desktop only */}
            {!isMobile && (
              <button
                onClick={handleRoleToggle}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  role === "admin"
                    ? "bg-[#2563EB] text-white"
                    : "bg-gray-100 text-gray-700"
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <Monitor size={14} />
                记录
              </Link>
            )}
            {/* QR code button - visible on all devices */}
            <button
              onClick={() => setShowQR(true)}
              className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <QrCode size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Connection error banner */}
      {connectionError && (
        <div className="max-w-7xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
            <AlertCircle size={16} />
            {connectionError}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Progress overview card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              <h2 className="text-lg font-semibold text-gray-900">{currentMonth} 保养进度</h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {completedCount}/{total} <span className="text-sm text-gray-500">({progress}%)</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600 flex-wrap">
            <span>已完成 <span className="font-semibold text-green-600">{completedCount}</span></span>
            <span>即将到期 <span className="font-semibold text-yellow-600">{upcomingCount}</span></span>
            <span>超期 <span className="font-semibold text-red-600">{overdueCount}</span></span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索设备名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 pl-12 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Overdue group */}
            {renderGroup("超期未保养", overdueCount, groupedEquipment.overdue, "overdue", false)}

            {/* Upcoming group */}
            {renderGroup("即将到期", upcomingCount, groupedEquipment.upcoming, "upcoming", false)}

            {/* Completed group */}
            {renderGroup("本月已完成", completedCount, groupedEquipment.completed, "completed", true)}

            {/* No results */}
            {search.trim() && overdueCount === 0 && upcomingCount === 0 && completedCount === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">
                没有找到匹配的设备
              </div>
            )}
          </>
        )}

        {/* Add equipment button */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            <span className="font-medium">添加新设备</span>
          </button>
        </div>
      </main>

      {/* Add equipment modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">添加新设备</h3>
              <button
                onClick={() => { setShowAddModal(false); setAddError(""); setNewEquipmentName(""); }}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <input
              type="text"
              placeholder="输入设备名称..."
              value={newEquipmentName}
              onChange={(e) => { setNewEquipmentName(e.target.value); setAddError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAddEquipment()}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {addError && (
              <p className="mt-2 text-xs text-red-500">{addError}</p>
            )}
            <button
              onClick={handleAddEquipment}
              disabled={!newEquipmentName.trim() || addingEquipment}
              className="w-full mt-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {addingEquipment ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {addingEquipment ? "添加中..." : "确认添加"}
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {!isMobile && showQR && <QRCodeModal />}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">管理端验证</h3>
              <button
                onClick={handlePasswordCancel}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">请输入管理端密码以切换身份</p>
            <input
              type="password"
              placeholder="输入密码..."
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {passwordError && (
              <p className="mt-2 text-xs text-red-500">{passwordError}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handlePasswordCancel}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={!password.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
