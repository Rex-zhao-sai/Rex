// 从 Supabase 迁移照片数据到 Turso
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cpkqoubbwjvchbmdsish.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwa3FvdWJid2p2Y2hibWRzaXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODkyMjksImV4cCI6MjA5OTc2NTIyOX0.pzXxbNq_sHa7JQOXYBGPf5KXUH3m7hj8l3QUwIaASU8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migratePhotos() {
  console.log('开始从 Supabase 迁移照片数据...');
  
  // 查询 Supabase 中所有有照片的记录
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
  
  // 输出记录详情
  records.forEach(record => {
    console.log(`\n记录 ID: ${record.id}`);
    console.log(`设备: ${record.equipment_id}`);
    console.log(`月份: ${record.month}`);
    console.log(`照片对: ${JSON.stringify(record.photo_pairs, null, 2)}`);
  });
}

migratePhotos().catch(console.error);
