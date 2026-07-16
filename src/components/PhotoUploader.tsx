"use client";

import { useState, useRef, useCallback } from "react";
import type { PhotoRecord } from "@/lib/equipment-data";
import { generateId } from "@/lib/storage";
import { Camera, X, Clock } from "lucide-react";

interface PhotoUploaderProps {
  label: "before" | "after";
  photo: PhotoRecord | null;
  onUpload: (photo: PhotoRecord) => void;
  onRemove: () => void;
  index: number;
}

export function PhotoUploader({
  label,
  photo,
  onUpload,
  onRemove,
  index,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const now = new Date();
        const photoRecord: PhotoRecord = {
          id: generateId(),
          type: label,
          dataUrl,
          timestamp: now.toISOString(),
          fileName: file.name,
        };
        onUpload(photoRecord);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    },
    [label, onUpload]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so same file can be selected again
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile]
  );

  const labelColor =
    label === "before"
      ? "bg-orange-100 text-orange-700"
      : "bg-blue-100 text-blue-700";
  const labelText = label === "before" ? "Before" : "After";

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${labelColor}`}
        >
          {labelText}
        </span>
        <span className="text-xs text-gray-400">#{index + 1}</span>
      </div>

      {photo ? (
        <div className="relative group">
          <img
            src={photo.dataUrl}
            alt={`${labelText} photo`}
            className="w-full aspect-square object-cover rounded-lg border border-gray-200"
          />
          <button
            onClick={onRemove}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            type="button"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(photo.timestamp).toLocaleString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
          className="w-full aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/50 transition-colors disabled:opacity-50"
          type="button"
        >
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Camera className="w-6 h-6 text-gray-300" />
              <span className="text-xs text-gray-400">
                {label === "before" ? "拍照/上传" : "拍照/上传"}
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
