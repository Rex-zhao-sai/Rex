import { NextRequest, NextResponse } from 'next/server';
import { getRecordByEquipmentAndMonth } from '@/lib/turso-api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const record = await getRecordByEquipmentAndMonth(id, currentMonth);
    
    if (!record) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    
    // 解析 photo_pairs
    let photoPairs = record.photo_pairs;
    if (typeof photoPairs === 'string') {
      try {
        photoPairs = JSON.parse(photoPairs);
      } catch (e) {
        return NextResponse.json({ error: 'photo_pairs 解析失败' }, { status: 500 });
      }
    }
    
    // 返回调试信息
    return NextResponse.json({
      record_id: record.id,
      equipment_id: record.equipment_id,
      month: record.month,
      photo_pairs_type: typeof record.photo_pairs,
      photo_pairs_is_array: Array.isArray(photoPairs),
      photo_pairs_length: Array.isArray(photoPairs) ? photoPairs.length : 0,
      photo_pairs_structure: Array.isArray(photoPairs) && photoPairs.length > 0 ? {
        first_item_keys: Object.keys(photoPairs[0]),
        first_item: photoPairs[0],
        has_before_field: 'before' in photoPairs[0],
        has_after_field: 'after' in photoPairs[0],
        before_value: photoPairs[0].before,
        after_value: photoPairs[0].after,
      } : null,
      all_pairs: photoPairs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '查询失败' },
      { status: 500 }
    );
  }
}
