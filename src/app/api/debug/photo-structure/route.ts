import { NextRequest, NextResponse } from 'next/server';
import turso, { isTursoAvailable } from '@/lib/turso';

export async function GET(request: NextRequest) {
  try {
    if (!isTursoAvailable()) {
      return NextResponse.json({ error: 'Turso 不可用' }, { status: 500 });
    }

    // 获取 URL 参数
    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get('equipmentId');
    const month = searchParams.get('month');

    if (!equipmentId || !month) {
      // 如果没有参数，返回第一条有照片数据的记录
      const result = await turso!.execute({
        sql: `SELECT id, equipment_id, month, photo_count, LENGTH(photo_pairs) as photo_length
              FROM maintenance_records
              WHERE LENGTH(photo_pairs) > 100
              ORDER BY updated_at DESC
              LIMIT 1`,
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ error: '没有找到有照片数据的记录' }, { status: 404 });
      }

      const row = result.rows[0];
      const photoResult = await turso!.execute({
        sql: `SELECT photo_pairs FROM maintenance_records WHERE id = ?`,
        args: [row.id],
      });

      const photoPairsStr = photoResult.rows[0]?.photo_pairs;
      let photoPairs: any = photoPairsStr;
      if (typeof photoPairsStr === 'string') {
        try {
          photoPairs = JSON.parse(photoPairsStr);
        } catch (e) {
          photoPairs = { error: 'Failed to parse', raw: photoPairsStr.substring(0, 500) };
        }
      }

      return NextResponse.json({
        record: row,
        photo_pairs_type: typeof photoPairs,
        photo_pairs_is_array: Array.isArray(photoPairs),
        photo_pairs_length: Array.isArray(photoPairs) ? photoPairs.length : 0,
        structure: Array.isArray(photoPairs) && photoPairs.length > 0 ? {
          first_item_keys: Object.keys(photoPairs[0]),
          first_item: photoPairs[0],
          has_before_field: 'before' in photoPairs[0],
          has_after_field: 'after' in photoPairs[0],
          before_type: typeof photoPairs[0].before,
          after_type: typeof photoPairs[0].after,
          before_keys: photoPairs[0].before ? Object.keys(photoPairs[0].before) : null,
          after_keys: photoPairs[0].after ? Object.keys(photoPairs[0].after) : null,
        } : null,
        sample_data: Array.isArray(photoPairs) ? photoPairs.slice(0, 2) : photoPairs,
      });
    }

    // 查询指定设备的记录
    const result = await turso!.execute({
      sql: `SELECT id, equipment_id, month, photo_count, LENGTH(photo_pairs) as photo_length
            FROM maintenance_records
            WHERE equipment_id = ? AND month = ?
            LIMIT 1`,
      args: [equipmentId, month],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '记录不存在', equipmentId, month }, { status: 404 });
    }

    const row = result.rows[0];
    const photoResult = await turso!.execute({
      sql: `SELECT photo_pairs FROM maintenance_records WHERE id = ?`,
      args: [row.id],
    });

    const photoPairsStr = photoResult.rows[0]?.photo_pairs;
    let photoPairs: any = photoPairsStr;
    if (typeof photoPairsStr === 'string') {
      try {
        photoPairs = JSON.parse(photoPairsStr);
      } catch (e) {
        photoPairs = { error: 'Failed to parse', raw: photoPairsStr.substring(0, 500) };
      }
    }

    return NextResponse.json({
      record: row,
      photo_pairs_type: typeof photoPairs,
      photo_pairs_is_array: Array.isArray(photoPairs),
      photo_pairs_length: Array.isArray(photoPairs) ? photoPairs.length : 0,
      structure: Array.isArray(photoPairs) && photoPairs.length > 0 ? {
        first_item_keys: Object.keys(photoPairs[0]),
        first_item: photoPairs[0],
        has_before_field: 'before' in photoPairs[0],
        has_after_field: 'after' in photoPairs[0],
        before_type: typeof photoPairs[0].before,
        after_type: typeof photoPairs[0].after,
        before_keys: photoPairs[0].before ? Object.keys(photoPairs[0].before) : null,
        after_keys: photoPairs[0].after ? Object.keys(photoPairs[0].after) : null,
      } : null,
      sample_data: Array.isArray(photoPairs) ? photoPairs.slice(0, 2) : photoPairs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '查询失败' },
      { status: 500 }
    );
  }
}
