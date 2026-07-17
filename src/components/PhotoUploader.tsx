"use client";

import { useState, useRef, useCallback } from "react";
import type { PhotoPair, PhotoRecord } from "@/lib/equipment-data";
import { generateId } from "@/lib/storage";
import { Camera, X, Clock } from "lucide-react";

interface PhotoUploaderProps {
  pair: PhotoPair;
  onUpload: (pairId: string, type: "before" | "after", photo: PhotoRecord) => void;
  onRemove: (pairId: string, type: "before" | "after") => void;
  readOnly?: boolean;
}

export function PhotoUploader({
  pair,
  onUpload,
  onRemove,
  readOnly = false,
}: PhotoUploaderProps) {
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState<"before" | "after" | null>(null);

  const handleFile = useCallback(
    (type: "before" | "after", file: File) => {
      setProcessing(type);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const now = new Date();
        const photoRecord: PhotoRecord = {
          id: generateId(),
          type,
          dataUrl,
          timestamp: now.toISOString(),
          fileName: file.name,
        };
        onUpload(pair.id, type, photoRecord);
        setProcessing(null);
      };
      reader.onerror = () => setProcessing(null);
      reader.readAsDataURL(file);
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
            <img
              src={photo.dataUrl}
              alt={`${label} photo`}
              className="w-full aspect-square object-cover rounded-lg border border-gray-200"
            />
            {!readOnly && (
              <button
                onClick={() => onRemove(pair.id, type)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
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
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
    <div className="flex gap-4">
      {renderSlot("before")}
      {renderSlot("after")}
    </div>
  );
}
