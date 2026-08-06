"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import type { PhotoPair, PhotoRecord } from "@/lib/equipment-data";
import { generateId, getCurrentMonth } from "@/lib/storage";
import { getRecordWithoutPhotos, getRecordByEquipmentAndMonth, saveRecord, getEquipmentById } from "@/lib/turso-api";
import { PhotoUploader } from "@/components/PhotoUploader";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  CheckCircle2,
  FileText,
  Shield,
  User,
  Lock,
  AlertCircle,
  Loader2,
} from "lucide-react";

type Role = "admin" | "operator";

function getStoredRole(): Role {
  if (typeof window === "undefined") return "operator";
  return (sessionStorage.getItem("userRole") as Role) || "operator";
}

export function EquipmentDetailClient({
  equipmentId: initialEquipmentId,
  initialMonth,
}: {
  equipmentId: string;
  initialMonth?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [equipmentId, setEquipmentId] = useState(initialEquipmentId);
  const [equipment, setEquipment] = useState<any>(null);
  const [equipmentLoading, setEquipmentLoading] = useState(true);

  // 初始化月份：优先从 URL searchParams 读取，其次使用 initialMonth，最后使用当前月份
  const getInitialMonth = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const monthParam = params.get("month");
      if (monthParam) return monthParam;
    }
    return initialMonth || getCurrentMonth();
  };

  const [role, setRole] = useState<Role>(getStoredRole);
  const [month, setMonth] = useState(getInitialMonth);
  const currentMonth = month;

  useEffect(() => {
    if (!equipmentId) return;
    setEquipmentLoading(true);
    // 先从静态列表查找
    const staticEquipment = EQUIPMENT_LIST.find((e) => e.id === equipmentId);
    if (staticEquipment) {
      setEquipment(staticEquipment);
      setEquipmentLoading(false);
    } else {
      // 从 Turso 数据库查找新添加的设备
      getEquipmentById(equipmentId).then((eq) => {
        if (eq) {
          setEquipment({ id: eq.id, name: eq.name, category: eq.category });
        }
        setEquipmentLoading(false);
      });
    }
  }, [equipmentId]);

  const [photoPairs, setPhotoPairs] = useState<PhotoPair[]>([]);
  const [technician, setTechnician] = useState("");
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const [recordRole, setRecordRole] = useState<Role>("operator");
  const [connectionError, setConnectionError] = useState("");
  const [saving, setSaving] = useState(false);
  // 记录已有照片组的 ID（从数据库加载的），操作端只能对新增的照片组操作
  const [existingPairIds, setExistingPairIds] = useState<Set<string>>(new Set());
  
  // 使用 ref 跟踪 saved 状态和 photoPairs，避免轮询闭包问题
  const savedRef = useRef(saved);
  const photoPairsRef = useRef(photoPairs);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);
  useEffect(() => {
    photoPairsRef.current = photoPairs;
  }, [photoPairs]);

  useEffect(() => {
    if (!equipmentId) return;
    let cancelled = false;

    const loadRecord = async (force = false) => {
      if (cancelled) return;
      // 如果用户有未保存的修改，跳过轮询（除非强制刷新）
      if (!force && !savedRef.current) return;
      
      // 检查是否有未保存的照片（有 before 或 after 但没有 id 的新照片组）
      const hasUnsavedPhotos = photoPairsRef.current.some(
        (pair) => pair.before || pair.after
      );
      if (!force && hasUnsavedPhotos) return;
      
      setLoading(true);
      setConnectionError("");
      try {
        // 只加载不含照片的记录（快速）
        const data = await getRecordWithoutPhotos(equipmentId, currentMonth);

        if (data) {
          setTechnician(data.technician || "");
          setNotes(data.notes || "");
          setDuration(data.duration || 0);
          setExistingRecordId(data.id);
          setRecordRole((data.role as Role) || "operator");
          
          // 不自动加载照片，显示空照片组
          const newPair = { id: generateId(), before: null, after: null, note: "", duration: 0 };
          setPhotoPairs([newPair]);
          setExistingPairIds(new Set());
        } else {
          const newPair = { id: generateId(), before: null, after: null, note: "", duration: 0 };
          setPhotoPairs([newPair]);
          setExistingPairIds(new Set()); // 新建记录，没有已有照片组
        }
      } catch (e: any) {
        console.error("获取记录失败:", e);
        setConnectionError("连接失败，请检查网络后刷新页面");
        const newPair = { id: generateId(), before: null, after: null, note: "", duration: 0 };
        setPhotoPairs([newPair]);
        setExistingPairIds(new Set()); // 加载失败，视为新建
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadRecord(true); // 首次加载强制刷新

    // 每 60 秒自动刷新（如果有未保存的修改或照片则跳过）
    const interval = setInterval(() => loadRecord(false), 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [equipmentId, currentMonth]);

  // 手动加载照片
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadPhotosError, setLoadPhotosError] = useState("");
  const handleLoadPhotos = async () => {
    if (!equipmentId || !existingRecordId) return;
    setLoadingPhotos(true);
    setLoadPhotosError("");
    try {
      // 添加超时处理（10 秒）
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("加载超时")), 10000)
      );
      
      const fullData = await Promise.race([
        getRecordByEquipmentAndMonth(equipmentId, currentMonth),
        timeoutPromise
      ]) as any;
      
      if (fullData && fullData.photo_pairs) {
        const photoPairs = typeof fullData.photo_pairs === 'string' 
          ? JSON.parse(fullData.photo_pairs) 
          : fullData.photo_pairs;
        
        if (Array.isArray(photoPairs) && photoPairs.length > 0) {
          setPhotoPairs(photoPairs);
          setExistingPairIds(new Set(photoPairs.map((p: PhotoPair) => p.id)));
        } else {
          setLoadPhotosError("该记录没有照片");
        }
      } else {
        setLoadPhotosError("该记录没有照片");
      }
    } catch (err: any) {
      console.error("加载照片失败:", err);
      setLoadPhotosError(err.message || "加载照片失败，请重试");
    } finally {
      setLoadingPhotos(false);
    }
  };

  // 判断照片组是否可以被当前角色编辑
  // 操作端只能编辑新增的照片组（不在 existingPairIds 中）
  // 管理端可以编辑所有照片组
  const canEditPair = useCallback((pairId: string) => {
    if (role === "admin") return true;
    if (!existingRecordId) return true; // 新建记录，所有照片组都可编辑
    return !existingPairIds.has(pairId); // 操作端只能编辑新增的照片组
  }, [role, existingRecordId, existingPairIds]);

  const handlePhotoUpload = useCallback(
    (pairId: string, type: "before" | "after", photo: PhotoRecord) => {
      if (!canEditPair(pairId)) return; // 操作端不能修改已有照片组
      setPhotoPairs((prev) =>
        prev.map((pair) =>
          pair.id === pairId ? { ...pair, [type]: photo } : pair
        )
      );
      setSaved(false);
    },
    [canEditPair]
  );

  const handlePhotoRemove = useCallback(
    (pairId: string, type: "before" | "after") => {
      if (!canEditPair(pairId)) return; // 操作端不能修改已有照片组
      setPhotoPairs((prev) =>
        prev.map((pair) =>
          pair.id === pairId ? { ...pair, [type]: null } : pair
        )
      );
      setSaved(false);
    },
    []
  );

  const addPhotoPair = useCallback(() => {
    setPhotoPairs((prev) => [
      ...prev,
      { id: generateId(), before: null, after: null, note: "", duration: 0 },
    ]);
  }, []);

  const removePhotoPair = useCallback(
    (pairId: string) => {
      setPhotoPairs((prev) => prev.filter((p) => p.id !== pairId));
      setSaved(false);
    },
    []
  );

  // 权限控制：
  // - 管理端：可以修改所有内容
  // - 操作端查看已有记录：不能修改技术员/备注/照片备注，但可以上传照片和添加新照片组
  // - 操作端新建记录：可以填写所有内容
  const canEditFields = role === "admin" || !existingRecordId;
  const canAddPhotos = true; // 所有人都可以上传照片
  const isReadOnly = role === "operator" && !!existingRecordId && recordRole === "admin";

  const handleSave = useCallback(async () => {
    // 管理端或新建记录时需要验证字段
    if (canEditFields) {
      // 验证：技术员必填
      if (!technician || technician.trim() === "") {
        alert("技术员为必填项");
        return;
      }

      // 验证：备注必填
      if (!notes || notes.trim() === "") {
        alert("备注为必填项");
        return;
      }
    }

    // 验证：已上传照片的组必须填写备注（仅管理端或新建记录时）
    if (canEditFields) {
      for (let i = 0; i < photoPairs.length; i++) {
        const pair = photoPairs[i];
        const hasPhotos = pair.before || pair.after;
        if (hasPhotos) {
          if (!pair.note || pair.note.trim() === "") {
            alert(`第 ${i + 1} 组照片的备注为必填项`);
            return;
          }
        }
      }
    }

    setSaving(true);
    
    // 照片已经在上传时存储到 Turso，直接保存记录
    // 计算有照片的组数（before 或 after 不为 null 的组）
    const photoCount = photoPairs.filter(
      (p) => p.before !== null || p.after !== null
    ).length;

    const recordData: any = {
      equipment_id: equipmentId,
      month: currentMonth,
      technician,
      notes,
      photo_pairs: photoPairs,
      photo_count: photoCount,
      role,
    };
    // 只有当 duration 有值时才包含（避免 schema cache 问题）
    if (duration > 0) {
      recordData.duration = duration;
    }

    try {
      const result = await saveRecord(recordData);
      
      if (!result.success) {
        throw new Error(result.error || "保存失败");
      }
      
      setSaved(true);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
      
      // 保存成功后重新加载数据，确保页面显示最新状态
      const data = await getRecordByEquipmentAndMonth(equipmentId, currentMonth);
      if (data) {
        const photoPairs = data.photo_pairs ? (typeof data.photo_pairs === 'string' ? JSON.parse(data.photo_pairs) : data.photo_pairs) : [];
        setPhotoPairs(photoPairs);
        setExistingPairIds(new Set(photoPairs.map((p: PhotoPair) => p.id)));
        setTechnician(data.technician || "");
        setNotes(data.notes || "");
        setDuration(data.duration || 0);
        setExistingRecordId(data.id);
        setRecordRole((data.role as Role) || "operator");
      }
    } catch (e: any) {
      alert(e.message || "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }, [equipmentId, currentMonth, technician, notes, photoPairs, role, existingRecordId, canEditFields]);

  if (!equipmentId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#2563EB]" />
      </div>
    );
  }

  if (equipmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#2563EB]" />
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">设备未找到</p>
          <button onClick={() => router.push("/")} className="mt-4 text-blue-600 text-sm">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-[#F3F4F6]">
            <ArrowLeft size={22} className="text-[#111827]" />
          </button>
          <h1 className="text-base font-bold text-[#111827] truncate">{equipment.name}</h1>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => { setRole("operator"); sessionStorage.setItem("userRole", "operator"); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${role === "operator" ? "bg-[#2563EB] text-white" : "bg-[#F3F4F6] text-[#6B7280]"}`}
            >
              <User size={12} className="inline mr-1" />操作端
            </button>
            <button
              onClick={() => {
                if (role === "admin") {
                  setRole("operator");
                  sessionStorage.setItem("userRole", "operator");
                } else {
                  const password = prompt("请输入管理端密码：");
                  if (password === "Test12345678!@") {
                    setRole("admin");
                    sessionStorage.setItem("userRole", "admin");
                  } else if (password !== null) {
                    alert("密码错误");
                  }
                }
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${role === "admin" ? "bg-[#2563EB] text-white" : "bg-[#F3F4F6] text-[#6B7280]"}`}
            >
              <Shield size={12} className="inline mr-1" />管理端
            </button>
          </div>
        </div>
      </header>

      {/* Connection error */}
      {connectionError && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
            <AlertCircle size={16} />
            {connectionError}
          </div>
        </div>
      )}

      {/* Read-only notice for operator viewing admin-created record */}
      {!canEditFields && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
            <Lock size={16} />
            操作端仅可上传照片，无法修改已保存的内容（技术员/备注/照片备注）
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#2563EB]" />
          </div>
        ) : (
          <>
            {/* Month info */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <FileText size={16} />
                <span>{currentMonth} 保养记录</span>
              </div>
            </div>

            {/* Technician, Duration & Notes */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-[#6B7280] w-20 flex-shrink-0">技术员</label>
                <input
                  type="text"
                  value={technician}
                  onChange={(e) => { setTechnician(e.target.value); setSaved(false); }}
                  disabled={!canEditFields}
                  placeholder="输入技术员姓名"
                  className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-[#6B7280] w-20 flex-shrink-0">备注</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
                  disabled={!canEditFields}
                  placeholder="输入保养备注"
                  className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
                />
              </div>
            </div>

            {/* Load photos button - only show when record exists and photos not loaded */}
            {existingRecordId && photoPairs.length === 1 && !photoPairs[0].before && !photoPairs[0].after && (
              <button
                onClick={handleLoadPhotos}
                disabled={loadingPhotos}
                className="w-full mb-2 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#6B7280] text-sm font-medium hover:bg-[#F3F4F6] transition-colors flex items-center justify-center gap-2"
              >
                {loadingPhotos ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileText size={16} />
                )}
                {loadingPhotos ? "加载照片中..." : "加载已有照片"}
              </button>
            )}
            
            {loadPhotosError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{loadPhotosError}</span>
              </div>
            )}

            {/* Photo pairs */}
            <div className="space-y-4">
              {photoPairs.map((pair, index) => (
                <div key={pair.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-medium text-[#111827] whitespace-nowrap">第 {index + 1} 组照片</span>
                    <input
                      type="text"
                      value={pair.note || ""}
                      onChange={(e) => {
                        if (!canEditPair(pair.id)) return; // 操作端不能修改已有照片组
                        const newPairs = [...photoPairs];
                        newPairs[index] = { ...newPairs[index], note: e.target.value };
                        setPhotoPairs(newPairs);
                        setSaved(false);
                      }}
                      disabled={!canEditPair(pair.id)}
                      placeholder="请输入备注（必填）"
                      className="flex-1 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
                    />
                    {photoPairs.length > 1 && canEditPair(pair.id) && (
                      <button onClick={() => removePhotoPair(pair.id)} className="p-1 rounded-full hover:bg-red-50 text-red-500 flex-shrink-0">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <PhotoUploader
                    pair={pair}
                    onUpload={handlePhotoUpload}
                    onRemove={handlePhotoRemove}
                    onChange={(updatedPair) => {
                      const newPairs = [...photoPairs];
                      newPairs[index] = updatedPair;
                      setPhotoPairs(newPairs);
                    }}
                    readOnly={!canEditPair(pair.id)}
                  />
                </div>
              ))}
            </div>

            {/* Add pair button */}
            <button
              onClick={addPhotoPair}
              className="w-full mt-4 py-3 border-2 border-dashed border-[#D1D5DB] rounded-xl text-[#6B7280] text-sm font-medium hover:border-[#2563EB] hover:text-[#2563EB] transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              添加照片组
            </button>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="w-full mt-6 py-3 bg-[#2563EB] text-white rounded-xl text-sm font-medium hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : saved ? (
                <CheckCircle2 size={18} />
              ) : (
                <Save size={18} />
              )}
              {saving ? "保存中..." : saved ? "已保存" : "保存记录"}
            </button>
          </>
        )}
      </div>

      {/* Saved toast */}
      {showSavedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#22C55E] text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-medium animate-[slideUp_0.3s_ease-out]">
          <CheckCircle2 size={16} />
          保存成功
        </div>
      )}
    </div>
  );
}
