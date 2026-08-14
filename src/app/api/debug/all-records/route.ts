import { NextResponse } from 'next/server';
import turso, { isTursoAvailable } from '@/lib/turso';

export async function GET() {
  try {
    if (!isTursoAvailable()) {
      return NextResponse.json({ error: 'Turso 不可用' }, { status: 500 });
    }

    // 查询所有记录
    const result = await turso!.execute({
      sql: `SELECT id, equipment_id, month, photo_count, LENGTH(photo_pairs) as photo_length, updated_at
            FROM maintenance_records
            ORDER BY updated_at DESC
            LIMIT 50`,
    });

    const records = result.rows.map(row => ({
      id: row.id,
      equipment_id: row.equipment_id,
      month: row.month,
      photo_count: row.photo_count,
      photo_length: row.photo_length,
      updated_at: row.updated_at,
      has_photos: Number(row.photo_length) > 10,
    }));

    // 如果有照片数据，获取第一条的 photo_pairs 结构
    let photoStructure = null;
    const recordWithPhotos = records.find(r => r.has_photos);
    if (recordWithPhotos) {
      const photoResult = await turso!.execute({
        sql: `SELECT photo_pairs FROM maintenance_records WHERE id = ?`,
        args: [recordWithPhotos.id],
      });
      
      const photoPairsStr = photoResult.rows[0]?.photo_pairs;
      if (photoPairsStr && typeof photoPairsStr === 'string') {
        try {
          const photoPairs = JSON.parse(photoPairsStr);
          if (Array.isArray(photoPairs) && photoPairs.length > 0) {
            photoStructure = {
              record_id: recordWithPhotos.id,
              equipment_id: recordWithPhotos.equipment_id,
              array_length: photoPairs.length,
              first_item_keys: Object.keys(photoPairs[0]),
              first_item: photoPairs[0],
              has_before_field: 'before' in photoPairs[0],
              has_after_field: 'after' in photoPairs[0],
            };
          }
        } catch (e) {
          photoStructure = { error: 'Failed to parse photo_pairs' };
        }
      }
    }

    return NextResponse.json({
      total: records.length,
      with_photos: records.filter(r => r.has_photos).length,
      records,
      photo_structure: photoStructure,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '查询失败' },
      { status: 500 }
    );
  }
}
