"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import type { PhotoPair, PhotoRecord } from "@/lib/equipment-data";
import { generateId, getCurrentMonth } from "@/lib/storage";
import supabase from "@/lib/supabase-browser";
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
  return (sessionStorage.getItem("role") as Role) || "operator";
}

export function EquipmentDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [equipmentId, setEquipmentId] = useState("");

  useEffect(() => {
    params.then((p) => setEquipmentId(p.id));
  }, [params]);

  const [role, setRole] = useState<Role>(getStoredRole);
  const equipment = EQUIPMENT_LIST.find((e) => e.id === equipmentId);
  const currentMonth = getCurrentMonth();

  const [photoPairs, setPhotoPairs] = useState<PhotoPair[]>([]);
  const [technician, setTechnician] = useState("");
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState("");
  const [saved, setSaved] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const [recordRole, setRecordRole] = useState<Role>("operator");
  const [connectionError, setConnectionError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!equipmentId) return;
    const loadRecord = async () => {
      setLoading(true);
      setConnectionError("");
      try {
        const { data, error } = await supabase
          .from("maintenance_records")
          .select("*")
          .eq("equipment_id", equipmentId)
          .eq("month", currentMonth)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPhotoPairs((data.photo_pairs as PhotoPair[]) || []);
          setTechnician(data.technician || "");
          setNotes(data.notes || "");
          setDuration(data.duration || "");
          setExistingRecordId(data.id);
          setRecordRole((data.role as Role) || "operator");
        } else {
          setPhotoPairs([{ id: generateId(), before: null, after: null }]);
        }
      } catch (e: any) {
        console.error("获取记录失败:", e);
        setConnectionError("连接失败，请检查网络后刷新页面");
        setPhotoPairs([{ id: generateId(), before: null, after: null }]);
      } finally {
        setLoading(false);
      }
    };
    loadRecord();
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
      { id: generateId(), before: null, after: null },
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
    setSaving(true);
    const recordData = {
      equipment_id: equipmentId,
      month: currentMonth,
      technician,
      notes,
      duration: duration ? parseInt(duration) : null,
      photo_pairs: photoPairs,
      role,
    };

    try {
      if (existingRecordId) {
        const { error } = await supabase
          .from("maintenance_records")
          .update({ ...recordData, updated_at: new Date().toISOString() })
          .eq("id", existingRecordId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("maintenance_records")
          .insert(recordData)
          .select()
          .single();
        if (error) throw error;
        setExistingRecordId(data.id);
      }
      setSaved(true);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
    } catch (e: any) {
      alert(e.message || "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }, [equipmentId, currentMonth, technician, notes, duration, photoPairs, role, existingRecordId]);

  const canEdit = role === "admin" || recordRole === "operator" || !existingRecordId;
  const isReadOnly = !canEdit;

  if (!equipmentId) {
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
          <button onClick={() => router.push("/")} className="p-1 rounded-full hover:bg-[#F3F4F6]">
            <ArrowLeft size={22} className="text-[#111827]" />
          </button>
          <h1 className="text-base font-bold text-[#111827] truncate">{equipment.name}</h1>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => { setRole("operator"); sessionStorage.setItem("role", "operator"); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${role === "operator" ? "bg-[#2563EB] text-white" : "bg-[#F3F4F6] text-[#6B7280]"}`}
            >
              <User size={12} className="inline mr-1" />操作端
            </button>
            <button
              onClick={() => { setRole("admin"); sessionStorage.setItem("role", "admin"); }}
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

            {/* Technician & Notes */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">技术员</label>
                <input
                  type="text"
                  value={technician}
                  onChange={(e) => { setTechnician(e.target.value); setSaved(false); }}
                  disabled={isReadOnly}
                  placeholder="输入技术员姓名"
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">备注</label>
                <textarea
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
                  disabled={isReadOnly}
                  placeholder="输入保养备注（可选）"
                  rows={2}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-[#F9FAFB] disabled:text-[#6B7280] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">时长（分钟）</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => {
                    // Only allow positive integers
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setDuration(val);
                    setSaved(false);
                  }}
                  disabled={isReadOnly}
                  placeholder="输入保养时长（分钟）"
                  min="0"
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
                />
              </div>
            </div>

            {/* Photo pairs */}
            <div className="space-y-4">
              {photoPairs.map((pair, index) => (
                <div key={pair.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-[#111827]">第 {index + 1} 组照片</span>
                    {photoPairs.length > 1 && !isReadOnly && (
                      <button onClick={() => removePhotoPair(pair.id)} className="p-1 rounded-full hover:bg-red-50 text-red-500">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <PhotoUploader
                    pair={pair}
                    onUpload={handlePhotoUpload}
                    onRemove={handlePhotoRemove}
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
