// 从 Supabase 迁移照片数据到 Turso（base64 存储）
import { createClient } from '@supabase/supabase-js';
import { createClient as createTursoClient } from '@libsql/client';

const SUPABASE_URL = 'https://cpkqoubbwjvchbmdsish.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwa3FvdWJid2p2Y2hibWRzaXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODkyMjksImV4cCI6MjA5OTc2NTIyOX0.pzXxbNq_sHa7JQOXYBGPf5KXUH3m7hj8l3QUwIaASU8';

const TURSO_URL = process.env.NEXT_PUBLIC_TURSO_URL || '';
const TURSO_AUTH_TOKEN = process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const turso = createTursoClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

// 将 URL 转换为 base64（Node.js 环境）
async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error(`下载失败 ${url}:`, error);
    return url; // 失败时保留原 URL
  }
}

async function migratePhotos() {
  console.log('开始从 Supabase 迁移照片数据到 Turso...');
  
  // 1. 查询 Supabase 中所有有照片的记录
  const { data: records, error } = await supabase
    .from('maintenance_records')
    .select('*')
    .neq('photo_pairs', '[]')
    .not('photo_pairs', 'is', null);
  
  if (error) {
    console.error('查询 Supabase 失败:', error);
    return;
  }
  
  console.log(`找到 ${records?.length || 0} 条有照片的记录`);
  
  if (!records || records.length === 0) {
    console.log('没有需要迁移的照片数据');
    return;
  }
  
  let successCount = 0;
  let failCount = 0;
  
  // 2. 逐条处理记录
  for (const record of records) {
    console.log(`\n处理设备: ${record.equipment_id}, 月份: ${record.month}`);
    
    try {
      const photoPairs = typeof record.photo_pairs === 'string' 
        ? JSON.parse(record.photo_pairs) 
        : record.photo_pairs;
      
      // 3. 将照片 URL 转换为 base64
      const updatedPhotoPairs = [];
      for (const pair of photoPairs) {
        const updatedPair = { ...pair };
        
        if (pair.before?.dataUrl?.startsWith('http')) {
          console.log(`  转换 before 照片...`);
          updatedPair.before = {
            ...pair.before,
            dataUrl: await urlToBase64(pair.before.dataUrl),
          };
        }
        
        if (pair.after?.dataUrl?.startsWith('http')) {
          console.log(`  转换 after 照片...`);
          updatedPair.after = {
            ...pair.after,
            dataUrl: await urlToBase64(pair.after.dataUrl),
          };
        }
        
        updatedPhotoPairs.push(updatedPair);
      }
      
      // 4. 更新 Turso 中的记录
      const photoPairsJson = JSON.stringify(updatedPhotoPairs);
      const photoCount = updatedPhotoPairs.length;
      
      // 检查记录是否已存在于 Turso
      const existing = await turso.execute({
        sql: `SELECT id FROM maintenance_records WHERE equipment_id = ? AND month = ?`,
        args: [record.equipment_id, record.month],
      });
      
      if (existing.rows.length > 0) {
        // 更新现有记录
        await turso.execute({
          sql: `UPDATE maintenance_records 
                SET photo_pairs = ?, photo_count = ?, updated_at = ?
                WHERE equipment_id = ? AND month = ?`,
          args: [
            photoPairsJson,
            photoCount,
            new Date().toISOString(),
            record.equipment_id,
            record.month,
          ],
        });
        console.log(`  ✅ 更新 Turso 记录成功`);
      } else {
        // 插入新记录
        const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        
        await turso.execute({
          sql: `INSERT INTO maintenance_records 
                (id, equipment_id, month, technician, notes, photo_pairs, photo_count, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            id,
            record.equipment_id,
            record.month,
            record.technician || null,
            record.notes || null,
            photoPairsJson,
            photoCount,
            record.role || 'operator',
            record.created_at || new Date().toISOString(),
            new Date().toISOString(),
          ],
        });
        console.log(`  ✅ 插入 Turso 记录成功`);
      }
      
      successCount++;
    } catch (error) {
      console.error(`  ❌ 处理失败:`, error);
      failCount++;
    }
  }
  
  console.log(`\n迁移完成!`);
  console.log(`成功: ${successCount} 条`);
  console.log(`失败: ${failCount} 条`);
}

migratePhotos().catch(console.error);
