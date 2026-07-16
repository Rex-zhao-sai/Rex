"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import type { PhotoPair, PhotoRecord, MaintenanceRecord } from "@/lib/equipment-data";
import { generateId, getCurrentMonth } from "@/lib/storage";
import {
  fetchRecords,
  createRecord,
  updateRecord,
  isUsingLocalFallback,
  setLocalFallback,
} from "@/lib/api-client";
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

export default function EquipmentDetail() {
  const params = useParams();
  const router = useRouter();
  const equipmentId = params.id as string;
  const [role, setRole] = useState<Role>(getStoredRole());

  const equipment = EQUIPMENT_LIST.find((e) => e.id === equipmentId);
  const currentMonth = getCurrentMonth();

  const [photoPairs, setPhotoPairs] = useState<PhotoPair[]>([]);
  const [technician, setTechnician] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const [recordRole, setRecordRole] = useState<Role>("operator");
  const [useLocal, setUseLocal] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [saving, setSaving] = useState(false);

  // Load existing record
  useEffect(() => {
    const loadRecord = async () => {
      setLoading(true);
      setConnectionError("");
      try {
        const records = await fetchRecords(currentMonth);
        const record = records.find(r => r.equipment_id === equipmentId);
        if (record) {
          setPhotoPairs(record.photo_pairs || []);
          setTechnician(record.technician || "");
          setNotes(record.notes || "");
          setExistingRecordId(record.id);
          setRecordRole(record.role || "operator");
        } else {
          // Initialize with one empty pair
          setPhotoPairs([
            { id: generateId(), before: null, after: null },
          ]);
        }
        setUseLocal(false);
      } catch (e) {
        console.error("云端获取失败，使用本地模式:", e);
        setUseLocal(true);
        setLocalFallback(true);
        setConnectionError("云端连接不可用，已切换到本地模式");
        // 使用本地存储
        import("@/lib/api-client").then(({ fetchRecordsLocal }) => {
          fetchRecordsLocal(currentMonth).then((localRecords) => {
            const record = localRecords.find(r => r.equipment_id === equipmentId);
            if (record) {
              setPhotoPairs(record.photo_pairs || []);
              setTechnician(record.technician || "");
              setNotes(record.notes || "");
              setExistingRecordId(record.id);
              setRecordRole(record.role || "operator");
            } else {
              setPhotoPairs([
                { id: generateId(), before: null, after: null },
              ]);
            }
          });
        });
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
      photo_pairs: photoPairs,
      role,
    };

    try {
      if (useLocal) {
        // 本地模式
        const { createRecordLocal, updateRecordLocal } = await import("@/lib/api-client");
        if (existingRecordId) {
          await updateRecordLocal(existingRecordId, recordData, role);
        } else {
          const newRecord = await createRecordLocal(recordData, role);
          setExistingRecordId(newRecord.id);
        }
      } else {
        // 云端模式
        if (existingRecordId) {
          await updateRecord(existingRecordId, recordData, role);
        } else {
          const newRecord = await createRecord(recordData, role);
          setExistingRecordId(newRecord.id);
        }
      }
      setSaved(true);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
    } catch (e: any) {
      alert(e.message || "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }, [equipmentId, currentMonth, technician, notes, photoPairs, role, existingRecordId, useLocal]);

  // Check if current user can edit
  const canEdit = role === "admin" || recordRole === "operator" || !existingRecordId;
  const isReadOnly = !canEdit;

  if (!equipment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">设备未找到</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 text-blue-600 text-sm"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const completedPairs = photoPairs.filter(
    (p) => p.before && p.after
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Connection Error Banner */}
      {connectionError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">{connectionError}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">
              {equipment.name}
            </h1>
            <p className="text-xs text-gray-500">
              {currentMonth} 保养记录
            </p>
          </div>
          {/* Role indicator */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
            role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
          }`}>
            {role === "admin" ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            {role === "admin" ? "管理端" : "操作端"}
          </div>
          <button
            onClick={handleSave}
            disabled={isReadOnly || saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isReadOnly
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : saving
                ? "bg-blue-400 text-white cursor-wait"
                : saved
                ? "bg-green-100 text-green-700"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            }`}
          >
            {isReadOnly ? (
              <>
                <Lock className="w-4 h-4" />
                只读
              </>
            ) : saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                已保存
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存
              </>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">加载中...</p>
          </div>
        ) : (
          <>
            {/* Read-only warning */}
            {isReadOnly && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">只读模式</p>
                  <p className="text-xs text-amber-600 mt-1">
                    此记录由管理员创建，操作端无法修改。请切换到管理端进行编辑。
                  </p>
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">保养信息</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">技术员</label>
                  <input
                    type="text"
                    value={technician}
                    onChange={(e) => {
                      setTechnician(e.target.value);
                      setSaved(false);
                    }}
                    disabled={isReadOnly}
                    placeholder="请输入技术员姓名"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">备注</label>
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setSaved(false);
                    }}
                    disabled={isReadOnly}
                    placeholder="保养说明、异常情况等..."
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Photo Pairs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    保养照片
                  </span>
                  <span className="text-xs text-gray-400">
                    ({completedPairs}/{photoPairs.length} 组完成)
                  </span>
                </div>
              </div>

              {photoPairs.map((pair, idx) => (
                <div
                  key={pair.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500">
                      第 {idx + 1} 组
                    </span>
                    {!isReadOnly && photoPairs.length > 1 && (
                      <button
                        onClick={() => removePhotoPair(pair.id)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        删除
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <PhotoUploader
                      label="before"
                      photo={pair.before}
                      onUpload={(photo) =>
                        handlePhotoUpload(pair.id, "before", photo)
                      }
                      onRemove={() => handlePhotoRemove(pair.id, "before")}
                      index={idx}
                      disabled={isReadOnly}
                    />
                    <PhotoUploader
                      label="after"
                      photo={pair.after}
                      onUpload={(photo) =>
                        handlePhotoUpload(pair.id, "after", photo)
                      }
                      onRemove={() => handlePhotoRemove(pair.id, "after")}
                      index={idx}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              ))}

              {/* Add More Button */}
              {!isReadOnly && (
                <button
                  onClick={addPhotoPair}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加更多照片组
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Save Toast */}
      {showSavedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-green-600 text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            保存成功
          </div>
        </div>
      )}
    </div>
  );
}
