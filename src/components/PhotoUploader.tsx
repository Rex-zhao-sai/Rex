"use client";

import { useState, useRef, useCallback } from "react";
import type { PhotoPair, PhotoRecord } from "@/lib/equipment-data";
import { generateId } from "@/lib/storage";
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
        // 压缩照片后转换为 base64
        const dataUrl = await compressAndConvertToBase64(file);

        const now = new Date();
        const photoRecord: PhotoRecord = {
          id: generateId(),
          type,
          dataUrl: dataUrl,
          timestamp: now.toISOString(),
          fileName: file.name,
        };
        onUpload(pair.id, type, photoRecord);
      } catch (error: any) {
        console.error("Photo upload error:", error);
        alert(`照片处理失败：${error.message}`);
      } finally {
        setProcessing(null);
      }
    },
    [pair.id, onUpload]
  );

  // 压缩照片并转换为 base64（最大 800px，质量 0.7）
  const compressAndConvertToBase64 = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          // 计算压缩后的尺寸
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          // 创建 canvas 并绘制压缩后的图片
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建 canvas 上下文'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // 转换为 base64（JPEG 格式，指定质量）
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          console.log(`[PhotoCompress] ${file.name}: ${img.width}x${img.height} -> ${width}x${height}, 原始 ${(file.size / 1024).toFixed(0)}KB -> 压缩后 ${(compressedDataUrl.length * 0.75 / 1024).toFixed(0)}KB`);

          resolve(compressedDataUrl);
        };

        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

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
      <div className="flex gap-4">
        {renderSlot("before")}
        {renderSlot("after")}
      </div>
    </div>
  );
}
