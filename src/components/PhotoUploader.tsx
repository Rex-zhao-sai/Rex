"use client";

import { useState, useRef, useCallback } from "react";
import type { PhotoPair, PhotoRecord } from "@/lib/equipment-data";
import { generateId } from "@/lib/storage";
import supabase from "@/lib/supabase-browser";
import { Camera, X, Clock, Loader2 } from "lucide-react";
import { ImagePreview } from "./ImagePreview";

interface PhotoUploaderProps {
  pair: PhotoPair;
  onUpload: (pairId: string, type: "before" | "after", photo: PhotoRecord) => void;
  onRemove: (pairId: string, type: "before" | "after") => void;
  onChange?: (pair: PhotoPair) => void;
  readOnly?: boolean;
}

export function PhotoUploader({
  pair,
  onUpload,
  onRemove,
  onChange,
  readOnly = false,
}: PhotoUploaderProps) {
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState<"before" | "after" | null>(null);

  const handleFile = useCallback(
    async (type: "before" | "after", file: File) => {
      setProcessing(type);
      try {
        // 压缩照片（可选，这里先保持原图）
        // 生成唯一文件名
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${generateId()}.${fileExt}`;
        const filePath = `${fileName}`;

        // 上传到 Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("maintenance-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // 获取公开 URL
        const { data: urlData } = supabase.storage
          .from("maintenance-photos")
          .getPublicUrl(filePath);

        const now = new Date();
        const photoRecord: PhotoRecord = {
          id: generateId(),
          type,
          dataUrl: urlData.publicUrl, // 使用 Storage URL 而不是 base64
          timestamp: now.toISOString(),
          fileName: file.name,
        };
        onUpload(pair.id, type, photoRecord);
      } catch (error: any) {
        console.error("Photo upload error:", error);
        alert(`照片上传失败：${error.message}`);
      } finally {
        setProcessing(null);
      }
    },
    [pair.id, onUpload]
  );

  const handleChange = useCallback(
    (type: "before" | "after") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(type, file);
      if (e.target) e.target.value = "";
    },
    [handleFile]
  );

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const renderSlot = (type: "before" | "after") => {
    const photo = type === "before" ? pair.before : pair.after;
    const isProcessing = processing === type;
    const ref = type === "before" ? beforeRef : afterRef;
    const label = type === "before" ? "Before" : "After";
    const labelColor = type === "before" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700";

    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${labelColor}`}>
            {label}
          </span>
        </div>

        {photo ? (
          <div className="relative group">
            <ImagePreview
              src={photo.dataUrl}
              alt={`${label} photo`}
              className="w-full aspect-square object-cover rounded-lg border border-gray-200 cursor-pointer"
            />
            {!readOnly && (
              <button
                onClick={() => onRemove(pair.id, type)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{formatTime(photo.timestamp)}</span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => ref.current?.click()}
            disabled={readOnly || isProcessing}
            className="w-full aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent"
            type="button"
          >
            {isProcessing ? (
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            ) : (
              <>
                <Camera className="w-6 h-6 text-gray-300" />
                <span className="text-xs text-gray-400">点击上传</span>
              </>
            )}
          </button>
        )}

        <input
          ref={ref}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange(type)}
          className="hidden"
        />
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {!readOnly && (
        <>
          {/* 保养时长 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              保养时长 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                value={pair.duration || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  // 只允许正整数
                  if (val === "" || (Number.isInteger(Number(val)) && Number(val) > 0)) {
                    onChange?.({ ...pair, duration: val ? Number(val) : 0 });
                  }
                }}
                placeholder="请输入整数（分钟）"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">分钟</span>
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={pair.note || ""}
              onChange={(e) => {
                onChange?.({ ...pair, note: e.target.value || "" });
              }}
              placeholder="请输入保养备注"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </>
      )}

      <div className="flex gap-4">
        {renderSlot("before")}
        {renderSlot("after")}
      </div>
    </div>
  );
}
