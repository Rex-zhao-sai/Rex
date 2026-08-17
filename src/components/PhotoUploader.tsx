"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { PhotoPair, PhotoRecord } from "@/lib/equipment-data";
import { generateId } from "@/lib/storage";
import { Camera, X, Clock, Loader2 } from "lucide-react";
import { ImagePreview } from "./ImagePreview";
import { uploadToS3, getS3PhotoUrl } from "@/lib/s3";
import { uploadToS3Direct } from "@/lib/s3-direct-upload";

interface PhotoUploaderProps {
  pair: PhotoPair;
  onUpload: (pairId: string, type: "before" | "after", photo: PhotoRecord) => void;
  onRemove: (pairId: string, type: "before" | "after") => void;
  onChange?: (pair: PhotoPair) => void;
  readOnly?: boolean;
  canUploadAfter?: boolean; // 操作端可以补充上传 after
}

export function PhotoUploader({
  pair,
  onUpload,
  onRemove,
  onChange,
  readOnly = false,
  canUploadAfter = false,
}: PhotoUploaderProps) {
  console.log('[PhotoUploader] 组件渲染，pair:', pair);
  console.log('[PhotoUploader] pair.before:', pair.before);
  console.log('[PhotoUploader] pair.after:', pair.after);
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState<"before" | "after" | null>(null);
  const [photoUrls, setPhotoUrls] = useState<{ before: string | null; after: string | null }>({ before: null, after: null });
  const [loadErrors, setLoadErrors] = useState<{ before: boolean; after: boolean }>({ before: false, after: false });

  // 加载照片 URL（异步获取预签名 URL）
  useEffect(() => {
    console.log('[PhotoUploader] pair 对象:', pair);
    console.log('[PhotoUploader] pair.before:', pair.before);
    console.log('[PhotoUploader] pair.after:', pair.after);
    
    const loadPhotoUrls = async () => {
      const beforeKey = pair.beforeKey || pair.before?.s3Key;
      const afterKey = pair.afterKey || pair.after?.s3Key;
      
      console.log('[PhotoUploader] beforeKey:', beforeKey, 'afterKey:', afterKey);
      
      let beforeUrl: string | null = null;
      let afterUrl: string | null = null;
      
      // 优先使用 dataUrl（本地预览）
      if (pair.before?.dataUrl) {
        beforeUrl = pair.before.dataUrl;
        console.log('[PhotoUploader] 使用 before.dataUrl:', beforeUrl.substring(0, 50));
      } else if (pair.before?.s3Url && pair.before.s3Url.trim()) {
        // 使用预签名 URL（构建时生成）
        beforeUrl = pair.before.s3Url;
        console.log('[PhotoUploader] 使用 before.s3Url:', beforeUrl);
      } else if (pair.before?.src && pair.before.src.trim()) {
        // 使用旧版 URL（Supabase 存储，向后兼容）
        beforeUrl = pair.before.src;
        console.log('[PhotoUploader] 使用 before.src:', beforeUrl);
      } else if (beforeKey) {
        try {
          beforeUrl = await getS3PhotoUrl(beforeKey);
          console.log('[PhotoUploader] 从 s3Key 获取 beforeUrl:', beforeUrl);
        } catch (err) {
          console.error('Failed to load before photo URL:', err);
        }
      } else {
        console.log('[PhotoUploader] before 没有任何可用的 URL 来源');
        console.log('[PhotoUploader] before 对象完整内容:', JSON.stringify(pair.before));
      }
      
      if (pair.after?.dataUrl) {
        afterUrl = pair.after.dataUrl;
        console.log('[PhotoUploader] 使用 after.dataUrl:', afterUrl.substring(0, 50));
      } else if (pair.after?.s3Url && pair.after.s3Url.trim()) {
        // 使用预签名 URL（构建时生成）
        afterUrl = pair.after.s3Url;
        console.log('[PhotoUploader] 使用 after.s3Url:', afterUrl);
      } else if (pair.after?.src && pair.after.src.trim()) {
        // 使用旧版 URL（Supabase 存储，向后兼容）
        afterUrl = pair.after.src;
        console.log('[PhotoUploader] 使用 after.src:', afterUrl);
      } else if (afterKey) {
        try {
          afterUrl = await getS3PhotoUrl(afterKey);
          console.log('[PhotoUploader] 从 s3Key 获取 afterUrl:', afterUrl);
        } catch (err) {
          console.error('Failed to load after photo URL:', err);
        }
      } else {
        console.log('[PhotoUploader] after 没有任何可用的 URL 来源');
        console.log('[PhotoUploader] after 对象完整内容:', JSON.stringify(pair.after));
      }
      
      console.log('[PhotoUploader] 最终 photoUrls:', { before: beforeUrl, after: afterUrl });
      
      setPhotoUrls({ 
        before: beforeUrl || null, 
        after: afterUrl || null 
      });
    };
    
    loadPhotoUrls();
  }, [pair.beforeKey, pair.afterKey, pair.before?.s3Key, pair.after?.s3Key, pair.before?.dataUrl, pair.after?.dataUrl, pair.before?.src, pair.after?.src]);

  const handleFile = useCallback(
    async (type: "before" | "after", file: File) => {
      setProcessing(type);
      try {
        // 压缩照片
        const compressedBlob = await compressImage(file);
        
        let s3Key: string | null = null;
        let useBase64Fallback = false;
        
        // 尝试客户端直传 S3
        try {
          s3Key = await uploadToS3Direct(compressedBlob, file.name, pair.id, type);
          console.log("[PhotoUpload] Direct upload success:", s3Key);
        } catch (directError) {
          console.warn("[PhotoUpload] Direct upload failed, trying API route:", directError);
          // 回退到 API 路由上传
          try {
            s3Key = await uploadToS3(compressedBlob, file.name, pair.id, type);
            console.log("[PhotoUpload] API route upload success:", s3Key);
          } catch (apiError) {
            console.warn("[PhotoUpload] API route also failed, using base64 fallback:", apiError);
            useBase64Fallback = true;
          }
        }
        
        // 同时保留 base64 用于本地预览（小图）
        const dataUrl = await blobToBase64(compressedBlob);

        const now = new Date();
        const photoRecord: PhotoRecord = {
          id: generateId(),
          type,
          dataUrl: dataUrl, // 用于本地预览和 base64 回退
          s3Key: s3Key || undefined, // 用于持久化存储（S3 key），base64 回退时为 undefined
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

  // 压缩图片为 Blob（最大 1920px，质量 0.8，如果压缩后更大则保留原图）
  const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建 canvas 上下文'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                // 如果压缩后更大，保留原图
                if (blob.size > file.size) {
                  console.log(`[PhotoCompress] ${file.name}: 压缩后更大 (${(blob.size / 1024).toFixed(0)}KB > ${(file.size / 1024).toFixed(0)}KB)，保留原图`);
                  resolve(file);
                } else {
                  console.log(`[PhotoCompress] ${file.name}: ${img.width}x${img.height} -> ${width}x${height}, 原始 ${(file.size / 1024).toFixed(0)}KB -> 压缩后 ${(blob.size / 1024).toFixed(0)}KB`);
                  resolve(blob);
                }
              } else {
                reject(new Error('图片压缩失败'));
              }
            },
            'image/jpeg',
            quality
          );
        };

        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

  // Blob 转 Base64（用于本地预览）
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Blob 转 Base64 失败'));
      reader.readAsDataURL(blob);
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
    const photoSrc = photoUrls[type];
    const hasLoadError = loadErrors[type];

    // 操作端可以补充上传 after（即使 readOnly=true）
    const canUpload = type === "after" && canUploadAfter && !photo;
    const isReadOnly = readOnly && !canUpload;

    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${labelColor}`}>
            {label}
          </span>
        </div>

        {photo && photoSrc && typeof photoSrc === 'string' && photoSrc.trim().length > 0 && photoSrc !== 'null' && photoSrc !== 'undefined' && !hasLoadError ? (
          <div className="relative group">
            <ImagePreview
              src={photoSrc}
              alt={`${label} photo`}
              className="w-full aspect-square object-cover rounded-lg border border-gray-200 cursor-pointer"
              onError={(e) => {
                console.error(`[PhotoUploader] Image load failed for ${label}:`, photoSrc);
                setLoadErrors(prev => ({ ...prev, [type]: true }));
              }}
            />
            {!isReadOnly && (
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
        ) : hasLoadError ? (
          <div className="w-full aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 bg-gray-50">
            <div className="text-xs text-gray-500 text-center px-2">
              照片无法加载
              <br />
              <span className="text-[10px] text-gray-400">（存储已迁移或不可访问）</span>
            </div>
            {!isReadOnly && (
              <button
                onClick={() => ref.current?.click()}
                disabled={isProcessing}
                className="text-xs text-blue-600 hover:text-blue-700"
                type="button"
              >
                重新上传
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => ref.current?.click()}
            disabled={isReadOnly || isProcessing}
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
