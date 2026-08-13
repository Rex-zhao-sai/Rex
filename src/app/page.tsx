"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import { LAST_MAINTENANCE_FROM_EXCEL } from "@/lib/excel-maintenance-data";
import { getAllEquipment, getRecordsByMonth, getLatestRecordPerEquipment, addEquipment, updateEquipment, deleteEquipment } from "@/lib/turso-api";
import { getCachedEquipment, setCachedEquipment, getCachedRecords, setCachedRecords, getCachedLatestRecords, setCachedLatestRecords, clearAll } from "@/lib/cache";
import Link from "next/link";
import { Search, CheckCircle2, Clock, ChevronRight, Monitor, QrCode, Shield, User, Plus, X, Loader2, AlertCircle, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { QRCodeModal } from "@/components/QRCodeModal";
import { useIsMobile } from "@/hooks/useIsMobile";

type Role = "admin" | "operator";

function getStoredRole(): Role {
  if (typeof window === "undefined") return "operator";
  return (sessionStorage.getItem("userRole") as Role) || "operator";
}

export default function Home() {
  const isMobile = useIsMobile();
  const [basePath, setBasePath] = useState("");
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
  const [previousMonth] = useState(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [equipmentList, setEquipmentList] = useState(EQUIPMENT_LIST);
  const [connectionError, setConnectionError] = useState("");
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const isInitialLoad = useRef(true);

  // Add equipment modal state
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [addingEquipment, setAddingEquipment] = useState(false);

  // Edit equipment modal state
  const [showEditEquipmentModal, setShowEditEquipmentModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [editEquipmentName, setEditEquipmentName] = useState("");
  const [updatingEquipment, setUpdatingEquipment] = useState(false);

  // Delete confirm modal state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingEquipment, setDeletingEquipment] = useState<any>(null);
  const [deletingEquipmentFlag, setDeletingEquipmentFlag] = useState(false);


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

  // Set basePath on client side
  useEffect(() => {
    // GitHub Pages 会自动处理仓库名作为基础路径，不需要手动设置
    setBasePath("");
  }, []);

  // Fetch records for current month with IndexedDB caching
  useEffect(() => {
    let isMounted = true;
    let hasLoaded = false; // 防止重复加载
    let isInitialFetchDone = false; // 防止重复初始化
    
    const loadRecords = async (isPolling = false) => {
      // 防止重复加载
      if (!isPolling && hasLoaded) return;
      if (!isPolling) hasLoaded = true;
      
      // 轮询时如果已经有数据，只更新不重新加载缓存
      if (isPolling && records && Object.keys(records).length > 0) {
        try {
          const data = await getRecordsByMonth(currentMonth);
          if (isMounted && data && data.length > 0) {
            const recordsMap: Record<string, any> = {};
            data.forEach((r) => {
              if (!recordsMap[r.equipment_id] || new Date(r.updated_at) > new Date(recordsMap[r.equipment_id].updated_at)) {
                recordsMap[r.equipment_id] = r;
              }
            });
            setRecords(recordsMap);
            console.log('[Page] Polling update from Turso');
          }
        } catch (e) {
          console.error("轮询更新失败:", e);
        }
        return;
      }
      
      // 首次加载：并行从缓存和 Turso 获取数据
      // 缓存用于快速显示，Turso 用于更新最新数据
      
      let cachedRecords: any[] | null = null;
      
      // 1. 从缓存快速显示（不等待）
      try {
        cachedRecords = await getCachedRecords(currentMonth);
      } catch (e) {
        console.warn('[Page] Failed to load from cache:', e);
      }
      
      // 如果有缓存，立即显示
      if (cachedRecords && cachedRecords.length > 0) {
        const recordsMap: Record<string, any> = {};
        cachedRecords.forEach(r => {
          if (!recordsMap[r.equipment_id] || new Date(r.updated_at || '') > new Date(recordsMap[r.equipment_id].updated_at || '')) {
            recordsMap[r.equipment_id] = r;
          }
        });
        if (isMounted) {
          setRecords(recordsMap);
          setLoading(false);
          console.log('[Page] Loaded from IndexedDB cache');
        }
      }
      
      if (isMounted) {
        setConnectionError("");
      }
      
      // 2. 从 Turso 获取最新数据（后台更新）
      try {
        // 优化：只查询本月记录，不查询所有最新记录（减少数据量）
        const currentMonthRecords = await getRecordsByMonth(currentMonth);

        if (isMounted) {
          const recordsMap: Record<string, any> = {};
          
          console.log('[Page] Turso currentMonthRecords count:', currentMonthRecords?.length || 0);
          
          // 用本月记录填充（确保本月状态正确）
          if (currentMonthRecords && currentMonthRecords.length > 0) {
            currentMonthRecords.forEach((r) => {
              recordsMap[r.equipment_id] = r;
            });
          }
          
          console.log('[Page] recordsMap keys count:', Object.keys(recordsMap).length);
          setRecords(recordsMap);
          // 写入 IndexedDB（只缓存当前月份记录）
          await setCachedRecords(Object.values(recordsMap));
          console.log('[Page] Updated from Turso');
          isInitialFetchDone = true;
        }
      } catch (e: any) {
        console.error("获取记录失败:", e);
        // 如果有缓存，不显示错误（离线可用）
        if (isMounted && !cachedRecords) {
          const errorMsg = e?.message || e?.code || JSON.stringify(e) || "未知错误";
          setConnectionError(`连接失败：${errorMsg}。请检查网络后刷新页面`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadRecords(false);

    // 每 5 分钟自动刷新（保养记录不需要高频更新）
    const interval = setInterval(() => loadRecords(true), 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentMonth, previousMonth]);

  // Fetch equipment list from Turso with IndexedDB caching
  useEffect(() => {
    let hasLoaded = false; // 防止重复加载
    
    const loadEquipment = async () => {
      // 防止重复加载
      if (hasLoaded) return;
      hasLoaded = true;
      
      // 先从 IndexedDB 加载缓存
      const cachedEquipment = await getCachedEquipment();
      
      // 如果有缓存，立即显示（离线优先）
      if (cachedEquipment && cachedEquipment.length > 0) {
        setEquipmentList(cachedEquipment);
        console.log('[Page] Loaded equipment from IndexedDB cache');
      }
      
      try {
        // 从 Turso 获取最新数据
        const data = await getAllEquipment();

        if (data && data.length > 0) {
          const dbEquipment = data.map((e) => ({
            id: e.id,
            name: e.name,
            category: e.category || '',
          }));
          
          // 直接使用数据库数据作为唯一数据源
          const mergedEquipment = [...dbEquipment];
          mergedEquipment.sort((a, b) => a.name.localeCompare(b.name));
          setEquipmentList(mergedEquipment);
          // 写入 IndexedDB
          await setCachedEquipment(mergedEquipment);
          console.log(`[Page] Updated equipment from Turso: ${mergedEquipment.length} total`);
        }
      } catch (e) {
        console.error("获取设备列表失败:", e);
        // 如果有缓存，不显示错误（离线可用）
      }
    };
    loadEquipment();
  }, []);

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
      let isCurrentMonth = false;
      
      if (record && record.created_at) {
        // 使用 created_at（实际保养日期）而不是 updated_at（最后更新时间）
        const lastDate = new Date(record.created_at);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // 检查是否本月保养
        isCurrentMonth = record.month === currentMonth;
      } else {
        const excelDate = LAST_MAINTENANCE_FROM_EXCEL[eq.id];
        if (excelDate) {
          const lastDate = new Date(excelDate);
          const today = new Date();
          const diffTime = Math.abs(today.getTime() - lastDate.getTime());
          days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      if (isCurrentMonth) {
        // 本月有保养记录
        completed.push({ ...eq, days, record });
      } else if (days > 30) {
        // 超期未保养 (>30 天)
        overdue.push({ ...eq, days });
      } else {
        // 即将到期 (<30 天)
        upcoming.push({ ...eq, days });
      }
    });

    // 按天数排序（降序）
    overdue.sort((a, b) => b.days - a.days);
    upcoming.sort((a, b) => b.days - a.days);
    completed.sort((a, b) => b.days - a.days);

    return { overdue, upcoming, completed };
  }, [equipmentList, search, records, currentMonth]);

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
      sessionStorage.setItem("userRole", newRole);
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
      sessionStorage.setItem("userRole", newRole);
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

  // 添加新设备（操作端和管理端都可以）
  const handleAddEquipment = async () => {
    if (!newEquipmentName.trim()) return;

    setAddingEquipment(true);
    try {
      const newEquipment = await addEquipment(newEquipmentName.trim(), '');
      if (newEquipment) {
        // 更新设备列表
        setEquipmentList(prev => {
          const updated = [...prev, { id: newEquipment.id, name: newEquipment.name, category: '' }];
          updated.sort((a, b) => a.name.localeCompare(b.name));
          return updated;
        });
        // 更新 IndexedDB 缓存
        const updatedList = [...equipmentList, { id: newEquipment.id, name: newEquipment.name, category: '' }];
        updatedList.sort((a, b) => a.name.localeCompare(b.name));
        await setCachedEquipment(updatedList);
        // 关闭弹窗并清空表单
        setShowAddEquipmentModal(false);
        setNewEquipmentName("");
      }
    } catch (e) {
      console.error("添加设备失败:", e);
      alert("添加设备失败，请重试");
    } finally {
      setAddingEquipment(false);
    }
  };

  // 编辑设备（仅管理端）
  const handleEditEquipment = async () => {
    if (!editEquipmentName.trim() || !editingEquipment) return;
    if (role !== "admin") {
      alert("只有管理端可以编辑设备");
      return;
    }

    setUpdatingEquipment(true);
    try {
      const success = await updateEquipment(editingEquipment.id, editEquipmentName.trim(), '');
      if (success) {
        // 更新设备列表
        setEquipmentList(prev => {
          const updated = prev.map(eq =>
            eq.id === editingEquipment.id
              ? { ...eq, name: editEquipmentName.trim(), category: '' }
              : eq
          );
          updated.sort((a, b) => a.name.localeCompare(b.name));
          return updated;
        });
        // 更新 IndexedDB 缓存
        const updatedList = equipmentList.map(eq =>
          eq.id === editingEquipment.id
            ? { ...eq, name: editEquipmentName.trim(), category: '' }
            : eq
        );
        updatedList.sort((a, b) => a.name.localeCompare(b.name));
        await setCachedEquipment(updatedList);
        // 关闭弹窗并清空表单
        setShowEditEquipmentModal(false);
        setEditingEquipment(null);
        setEditEquipmentName("");
      }
    } catch (e) {
      console.error("编辑设备失败:", e);
      alert("编辑设备失败，请重试");
    } finally {
      setUpdatingEquipment(false);
    }
  };

  // 删除设备
  const handleDeleteEquipment = async () => {
    if (!deletingEquipment) return;
    if (role !== "admin") {
      alert("只有管理端可以删除设备");
      return;
    }

    setDeletingEquipmentFlag(true);
    try {
      const success = await deleteEquipment(deletingEquipment.id);
      if (success) {
        console.log("[Delete] Equipment deleted successfully:", deletingEquipment.id);
        // 清除所有缓存，强制从数据库重新加载
        await clearAll();
        console.log("[Delete] All cache cleared");
        // 更新设备列表
        setEquipmentList(prev => prev.filter(eq => eq.id !== deletingEquipment.id));
        // 关闭弹窗
        setShowDeleteConfirmModal(false);
        setDeletingEquipment(null);
        // 强制刷新页面以重新加载数据
        window.location.reload();
      }
    } catch (e) {
      console.error("删除设备失败:", e);
      alert("删除设备失败，请重试");
    } finally {
      setDeletingEquipmentFlag(false);
    }
  };

  // 渲染设备卡片
  const renderEquipmentCard = (eq: any, isCompleted: boolean) => {
    const record = eq.record;
    const photoCount = record?.photo_count ?? record?.photo_pairs?.length ?? 0;
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
      statusText = ` ${eq.days}天前`;
    } else {
      // 即将到期 (<30 天)
      statusColor = "border-yellow-500";
      statusIcon = <Clock size={16} className="text-yellow-500" />;
      statusText = `🟡 ${eq.days}天前`;
    }

    return (
      <div key={eq.id} className="relative group">
        <Link
          href={`/equipment?id=${eq.id}&month=${currentMonth}`}
          className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border-l-4 ${statusColor} card-hover block`}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-900 text-sm truncate flex-1">{eq.name}</h4>
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
        {/* 管理端操作按钮 */}
        {role === "admin" && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.preventDefault();
                setEditingEquipment(eq);
                setEditEquipmentName(eq.name);
                setShowEditEquipmentModal(true);
              }}
              className="p-1.5 bg-white rounded-lg shadow-md hover:bg-blue-50 transition-colors"
              title="编辑设备"
            >
              <Pencil size={14} className="text-blue-600" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                setDeletingEquipment(eq);
                setShowDeleteConfirmModal(true);
              }}
              className="p-1.5 bg-white rounded-lg shadow-md hover:bg-red-50 transition-colors"
              title="删除设备"
            >
              <Trash2 size={14} className="text-red-600" />
            </button>
          </div>
        )}
      </div>
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
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={`${basePath}/melecs-logo.png?v=5`} alt="Melecs Logo" className="w-10 h-10 object-contain" />
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

            {/* Add equipment button - 操作端和管理端都可见 */}
            <button
              onClick={() => setShowAddEquipmentModal(true)}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2 mb-8"
            >
              <Plus size={20} />
              <span className="font-medium">添加新设备</span>
            </button>
          </>
        )}

      </main>

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

      {/* Add Equipment Modal */}
      {showAddEquipmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">添加新设备</h3>
              <button
                onClick={() => {
                  setShowAddEquipmentModal(false);
                  setNewEquipmentName("");
                }}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">设备名称 *</label>
                <input
                  type="text"
                  placeholder="输入设备名称..."
                  value={newEquipmentName}
                  onChange={(e) => setNewEquipmentName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddEquipmentModal(false);
                  setNewEquipmentName("");
                }}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddEquipment}
                disabled={!newEquipmentName.trim() || addingEquipment}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {addingEquipment ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    添加中...
                  </>
                ) : (
                  "确认添加"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Equipment Modal */}
      {showEditEquipmentModal && editingEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">编辑设备</h3>
              <button
                onClick={() => {
                  setShowEditEquipmentModal(false);
                  setEditingEquipment(null);
                  setEditEquipmentName("");
                }}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">设备名称 *</label>
                <input
                  type="text"
                  placeholder="输入设备名称..."
                  value={editEquipmentName}
                  onChange={(e) => setEditEquipmentName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEditEquipmentModal(false);
                  setEditingEquipment(null);
                  setEditEquipmentName("");
                }}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleEditEquipment}
                disabled={!editEquipmentName.trim() || updatingEquipment}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updatingEquipment ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    保存中...
                  </>
                ) : (
                  "确认保存"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirmModal && deletingEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">确认删除</h3>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeletingEquipment(null);
                }}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-2">确定要删除设备</p>
            <p className="text-base font-semibold text-gray-900 mb-4">&ldquo;{deletingEquipment.name}&rdquo;吗？</p>
            <p className="text-xs text-red-500 mb-6">⚠️ 删除后不可恢复，该设备的保养记录也将被删除</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeletingEquipment(null);
                }}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteEquipment}
                disabled={deletingEquipmentFlag}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingEquipmentFlag ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    删除中...
                  </>
                ) : (
                  "确认删除"
                )}
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
