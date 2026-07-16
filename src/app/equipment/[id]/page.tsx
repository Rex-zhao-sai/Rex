"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import type { PhotoPair, PhotoRecord, MaintenanceRecord } from "@/lib/equipment-data";
import {
  getRecord,
  saveRecord,
  getCurrentMonth,
  formatMonth,
  generateId,
} from "@/lib/storage";
import { PhotoUploader } from "@/components/PhotoUploader";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  CheckCircle2,
  FileText,
  Camera,
} from "lucide-react";

export default function EquipmentDetail() {
  const params = useParams();
  const router = useRouter();
  const equipmentId = params.id as string;

  const equipment = EQUIPMENT_LIST.find((e) => e.id === equipmentId);
  const currentMonth = getCurrentMonth();

  const [photoPairs, setPhotoPairs] = useState<PhotoPair[]>([]);
  const [technician, setTechnician] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Load existing record
  useEffect(() => {
    const record = getRecord(equipmentId, currentMonth);
    if (record) {
      setPhotoPairs(record.photoPairs);
      setTechnician(record.technician);
      setNotes(record.notes);
    } else {
      // Initialize with one empty pair
      setPhotoPairs([
        { id: generateId(), before: null, after: null },
      ]);
    }
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

  const handleSave = useCallback(() => {
    const now = new Date().toISOString();
    const record: MaintenanceRecord = {
      equipmentId,
      month: currentMonth,
      photoPairs,
      notes,
      technician,
      createdAt: getRecord(equipmentId, currentMonth)?.createdAt ?? now,
      updatedAt: now,
    };
    saveRecord(record);
    setSaved(true);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  }, [equipmentId, currentMonth, photoPairs, notes, technician]);

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
              {formatMonth(currentMonth)} 保养记录
            </p>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              saved
                ? "bg-green-100 text-green-700"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            }`}
          >
            {saved ? (
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
                placeholder="请输入技术员姓名"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                placeholder="保养说明、异常情况等..."
                rows={2}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        {/* Photo Pairs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-gray-400" />
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
                {photoPairs.length > 1 && (
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
                />
                <PhotoUploader
                  label="after"
                  photo={pair.after}
                  onUpload={(photo) =>
                    handlePhotoUpload(pair.id, "after", photo)
                  }
                  onRemove={() => handlePhotoRemove(pair.id, "after")}
                  index={idx}
                />
              </div>
            </div>
          ))}

          {/* Add More Button */}
          <button
            onClick={addPhotoPair}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加更多照片组
          </button>
        </div>
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
