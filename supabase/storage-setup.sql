-- 创建 maintenance-photos bucket（如果不存在）
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-photos', 'maintenance-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 允许所有用户读取公开 bucket 中的文件
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'maintenance-photos');

-- 允许认证用户上传文件
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'maintenance-photos');

-- 允许认证用户更新自己的文件
CREATE POLICY "Allow authenticated update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'maintenance-photos');

-- 允许认证用户删除自己的文件
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'maintenance-photos');
