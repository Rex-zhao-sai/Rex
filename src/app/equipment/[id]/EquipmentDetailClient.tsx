"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import type { PhotoPair, PhotoRecord } from "@/lib/equipment-data";
import { generateId, getCurrentMonth } from "@/lib/storage";
import { getRecordByEquipmentAndMonth, saveRecord, getEquipmentById } from "@/lib/turso-api";
import { uploadPhotoPair } from "@/lib/github-storage";
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

export function EquipmentDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [equipmentId, setEquipmentId] = useState("");
  const [equipment, setEquipment] = useState<any>(null);
  const [equipmentLoading, setEquipmentLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setEquipmentId(p.id));
  }, [params]);

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

  const [role, setRole] = useState<Role>(getStoredRole);
  const currentMonth = getCurrentMonth();

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
  
  // 使用 ref 跟踪 saved 状态，避免轮询闭包问题
  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  useEffect(() => {
    if (!equipmentId) return;
    let cancelled = false;

    const loadRecord = async (force = false) => {
      if (cancelled) return;
      // 如果用户有未保存的修改，跳过轮询（除非强制刷新）
      if (!force && !savedRef.current) return;
      
      setLoading(true);
      setConnectionError("");
      try {
        const data = await getRecordByEquipmentAndMonth(equipmentId, currentMonth);

        if (data) {
          // 解析 photo_pairs（JSON 字符串）
          const photoPairs = data.photo_pairs ? (typeof data.photo_pairs === 'string' ? JSON.parse(data.photo_pairs) : data.photo_pairs) : [];
          setPhotoPairs(photoPairs);
          setTechnician(data.technician || "");
          setNotes(data.notes || "");
          setDuration(data.duration || 0);
          setExistingRecordId(data.id);
          setRecordRole((data.role as Role) || "operator");
        } else {
          setPhotoPairs([{ id: generateId(), before: null, after: null, note: "", duration: 0 }]);
        }
      } catch (e: any) {
        console.error("获取记录失败:", e);
        setConnectionError("连接失败，请检查网络后刷新页面");
        setPhotoPairs([{ id: generateId(), before: null, after: null, note: "", duration: 0 }]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadRecord(true); // 首次加载强制刷新

    // 每 30 秒自动刷新（如果有未保存的修改则跳过）
    const interval = setInterval(() => loadRecord(false), 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [equipmentId, currentMonth]);

  const handlePhotoUpload = useCallback(
    (pairId: string, type: "before" | "after", photo: PhotoRecord) => {
      setPhotoPairs((prev) =>
        prev.map((pair) =>
          pair.id === pairId ? { ...pair, [type]: photo } : pair
        )
      );
      setSaved(false);
    },
    []
  );

  const handlePhotoRemove = useCallback(
    (pairId: string, type: "before" | "after") => {
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

  const handleSave = useCallback(async () => {
    // 验证：技术员必填
    if (!technician || technician.trim() === "") {
      alert("技术员为必填项");
      return;
    }

    // 验证：整体保养时长（暂时改为非必填，等 Supabase schema cache 刷新后恢复）
    if (duration < 0) {
      alert("保养时长不能为负数");
      return;
    }

    // 验证：备注必填
    if (!notes || notes.trim() === "") {
      alert("备注为必填项");
      return;
    }

    // 验证：已上传照片的组必须填写备注
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

    setSaving(true);
    
    // 上传照片到 GitHub Releases（如果有新照片）
    const uploadedPhotoPairs = [...photoPairs];
    try {
      for (let i = 0; i < uploadedPhotoPairs.length; i++) {
        const pair = uploadedPhotoPairs[i];
        // 如果照片是 base64 格式，需要上传到 GitHub
        if (pair.before && pair.before.dataUrl && pair.before.dataUrl.startsWith("data:image")) {
          const beforeFile = base64ToFile(pair.before.dataUrl, `before-${i}.jpg`);
          const afterFile = pair.after?.dataUrl 
            ? base64ToFile(pair.after.dataUrl, `after-${i}.jpg`)
            : beforeFile;
          const urls = await uploadPhotoPair(equipmentId, beforeFile, afterFile);
          uploadedPhotoPairs[i] = {
            ...pair,
            before: { ...pair.before, dataUrl: urls.before },
            after: pair.after ? { ...pair.after, dataUrl: urls.after } : null,
          };
        }
      }
    } catch (uploadError: any) {
      alert(`照片上传失败：${uploadError.message || "请重试"}`);
      setSaving(false);
      return;
    }

    // 暂时移除 duration 和 photo_count 字段，等 Supabase schema cache 刷新后恢复
    const recordData: any = {
      equipment_id: equipmentId,
      month: currentMonth,
      technician,
      notes,
      photo_pairs: uploadedPhotoPairs,
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
    } catch (e: any) {
      alert(e.message || "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }, [equipmentId, currentMonth, technician, notes, photoPairs, role, existingRecordId]);

  // base64 转 File 的辅助函数
  const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const canEdit = role === "admin" || recordRole === "operator" || !existingRecordId;
  const isReadOnly = !canEdit;

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
              onClick={() => { setRole("admin"); sessionStorage.setItem("userRole", "admin"); }}
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

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
            <Lock size={16} />
            当前记录由管理端创建，操作端仅可查看
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
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
                  placeholder="输入保养备注"
                  className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
                />
              </div>
            </div>

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
                        const newPairs = [...photoPairs];
                        newPairs[index] = { ...newPairs[index], note: e.target.value };
                        setPhotoPairs(newPairs);
                        setSaved(false);
                      }}
                      disabled={isReadOnly}
                      placeholder="请输入备注（必填）"
                      className="flex-1 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
                    />
                    {photoPairs.length > 1 && !isReadOnly && (
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
                    readOnly={isReadOnly}
                  />
                </div>
              ))}
            </div>

            {/* Add pair button */}
            {!isReadOnly && (
              <button
                onClick={addPhotoPair}
                className="w-full mt-4 py-3 border-2 border-dashed border-[#D1D5DB] rounded-xl text-[#6B7280] text-sm font-medium hover:border-[#2563EB] hover:text-[#2563EB] transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                添加照片组
              </button>
            )}

            {/* Save button */}
            {!isReadOnly && (
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
            )}
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
