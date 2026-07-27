-- 修复 Storage RLS 策略：允许匿名用户上传
-- 在 Supabase SQL Editor 中执行此脚本

-- 删除旧的策略
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

-- 创建新的策略（允许所有用户）
CREATE POLICY "Allow public upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'maintenance-photos');

CREATE POLICY "Allow public update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'maintenance-photos');

CREATE POLICY "Allow public delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'maintenance-photos');
