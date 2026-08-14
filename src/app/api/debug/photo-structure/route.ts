import { NextResponse } from 'next/server';
import turso, { isTursoAvailable } from '@/lib/turso';

export async function GET() {
  try {
    if (!isTursoAvailable()) {
      return NextResponse.json({ error: 'Turso 不可用' }, { status: 500 });
    }

    // 查询所有有照片数据的记录
    const result = await turso!.execute({
      sql: `SELECT id, equipment_id, month, photo_count, LENGTH(photo_pairs) as photo_length
            FROM maintenance_records
            WHERE LENGTH(photo_pairs) > 100
            ORDER BY updated_at DESC
            LIMIT 100`,
    });

    const records = result.rows.map(row => ({
      id: row.id,
      equipment_id: row.equipment_id || '',
      month: row.month,
      photo_count: row.photo_count,
      photo_length: Number(row.photo_length),
    }));

    // 查找 GEN5 相关的记录
    const gen5Records = records.filter(r => 
      r.equipment_id && (
        r.equipment_id.toLowerCase().includes('gen') || 
        r.equipment_id.toLowerCase().includes('flash')
      )
    );

    // 获取第一条 GEN5 记录的 photo_pairs 结构
    let photoStructure = null;
    if (gen5Records.length > 0) {
      const photoResult = await turso!.execute({
        sql: `SELECT photo_pairs FROM maintenance_records WHERE id = ?`,
        args: [gen5Records[0].id],
      });
      
      const photoPairsStr = photoResult.rows[0]?.photo_pairs;
      if (photoPairsStr && typeof photoPairsStr === 'string') {
        try {
          const photoPairs = JSON.parse(photoPairsStr);
          if (Array.isArray(photoPairs) && photoPairs.length > 0) {
            const first = photoPairs[0];
            photoStructure = {
              record_id: gen5Records[0].id,
              equipment_id: gen5Records[0].equipment_id,
              month: gen5Records[0].month,
              array_length: photoPairs.length,
              first_item_keys: Object.keys(first),
              first_item: first,
              has_before_field: 'before' in first,
              has_after_field: 'after' in first,
              before_type: typeof first.before,
              after_type: typeof first.after,
              before_keys: first.before ? Object.keys(first.before) : null,
              after_keys: first.after ? Object.keys(first.after) : null,
              sample: photoPairs.slice(0, 2),
            };
          }
        } catch (e) {
          photoStructure = { error: 'Failed to parse photo_pairs' };
        }
      }
    }

    // 如果没找到 GEN5，返回第一条有照片的记录
    if (!photoStructure && records.length > 0) {
      const photoResult = await turso!.execute({
        sql: `SELECT photo_pairs FROM maintenance_records WHERE id = ?`,
        args: [records[0].id],
      });
      
      const photoPairsStr = photoResult.rows[0]?.photo_pairs;
      if (photoPairsStr && typeof photoPairsStr === 'string') {
        try {
          const photoPairs = JSON.parse(photoPairsStr);
          if (Array.isArray(photoPairs) && photoPairs.length > 0) {
            const first = photoPairs[0];
            photoStructure = {
              record_id: records[0].id,
              equipment_id: records[0].equipment_id,
              month: records[0].month,
              array_length: photoPairs.length,
              first_item_keys: Object.keys(first),
              first_item: first,
              has_before_field: 'before' in first,
              has_after_field: 'after' in first,
              before_type: typeof first.before,
              after_type: typeof first.after,
              before_keys: first.before ? Object.keys(first.before) : null,
              after_keys: first.after ? Object.keys(first.after) : null,
              sample: photoPairs.slice(0, 2),
            };
          }
        } catch (e) {
          photoStructure = { error: 'Failed to parse photo_pairs' };
        }
      }
    }

    return NextResponse.json({
      total_records: records.length,
      gen5_records: gen5Records.length,
      records: records.slice(0, 20),
      photo_structure: photoStructure,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '查询失败' },
      { status: 500 }
    );
  }
}
