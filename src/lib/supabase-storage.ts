import { createClient } from '@supabase/supabase-js';

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 存储桶名称
export const SUPABASE_BUCKET = 'maintenance-photos';

// CDN 缓存时间：7 天（照片不会变化）
export const CDN_CACHE_SECONDS = 7 * 24 * 60 * 60; // 604800 秒

// 懒加载 Supabase 客户端（避免构建时因缺少环境变量报错）
let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_supabase) {
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// 生成照片存储路径
export function generatePhotoPath(
  equipmentId: string,
  type: 'before' | 'after',
  month: string // 格式：2026-08
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${month}/${equipmentId}/${type}_${timestamp}_${random}.jpg`;
}

// 上传照片到 Supabase Storage
export async function uploadPhotoToSupabase(
  file: File | Blob,
  path: string
): Promise<string | null> {
  try {
    const { data, error } = await getSupabaseClient().storage
      .from(SUPABASE_BUCKET)
      .upload(path, file, {
        cacheControl: String(CDN_CACHE_SECONDS),
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('[Supabase Upload] Error:', error.message);
      return null;
    }

    console.log('[Supabase Upload] Success:', data.path);
    return data.path;
  } catch (err) {
    console.error('[Supabase Upload] Exception:', err);
    return null;
  }
}

// 获取照片的公共 URL（带 CDN 缓存）
export function getPhotoPublicUrl(path: string): string {
  const { data } = getSupabaseClient().storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

// 获取照片的签名 URL（用于私有桶）
export async function getPhotoSignedUrl(
  path: string,
  expiresIn: number = 3600 // 1 小时
): Promise<string | null> {
  try {
    const { data, error } = await getSupabaseClient().storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('[Supabase Signed URL] Error:', error.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('[Supabase Signed URL] Exception:', err);
    return null;
  }
}

// 删除照片
export async function deletePhotoFromSupabase(
  path: string
): Promise<boolean> {
  try {
    const { error } = await getSupabaseClient().storage
      .from(SUPABASE_BUCKET)
      .remove([path]);

    if (error) {
      console.error('[Supabase Delete] Error:', error.message);
      return false;
    }

    console.log('[Supabase Delete] Success:', path);
    return true;
  } catch (err) {
    console.error('[Supabase Delete] Exception:', err);
    return false;
  }
}
