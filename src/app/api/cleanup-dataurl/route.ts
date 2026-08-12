import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function POST(request: NextRequest) {
  try {
    const { dbUrl, authToken } = await request.json();

    if (!dbUrl || !authToken) {
      return NextResponse.json(
        { error: '缺少数据库 URL 或认证令牌' },
        { status: 400 }
      );
    }

    const turso = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    // 测试连接
    await turso.execute('SELECT 1');

    // 获取所有包含 dataUrl 的记录
    const result = await turso.execute({
      sql: 'SELECT id, equipment_id, month, photo_pairs FROM maintenance_records WHERE photo_pairs LIKE \'%"dataUrl"%\'',
      args: [],
    });

    let cleaned = 0;
    let skipped = 0;
    let errors = 0;
    const logs: string[] = [];

    logs.push(`找到 ${result.rows.length} 条包含 dataUrl 的记录`);

    for (const row of result.rows) {
      const id = row.id as string;
      const equipmentId = row.equipment_id as string;
      const month = row.month as string;
      const photoPairsStr = row.photo_pairs as string;

      try {
        const photoPairs = JSON.parse(photoPairsStr);
        let modified = false;

        for (const pair of photoPairs) {
          if (pair.before?.dataUrl) {
            if (pair.before.s3Key) {
              delete pair.before.dataUrl;
              modified = true;
            } else {
              skipped++;
            }
          }

          if (pair.after?.dataUrl) {
            if (pair.after.s3Key) {
              delete pair.after.dataUrl;
              modified = true;
            } else {
              skipped++;
            }
          }
        }

        if (modified) {
          const newPhotoPairs = JSON.stringify(photoPairs);
          await turso.execute({
            sql: 'UPDATE maintenance_records SET photo_pairs = ? WHERE id = ?',
            args: [newPhotoPairs, id],
          });
          cleaned++;
          logs.push(`✓ ${equipmentId} (${month}): 已清理`);
        } else {
          logs.push(`- ${equipmentId} (${month}): 无需清理（无 s3Key）`);
        }
      } catch (error) {
        errors++;
        logs.push(`✗ ${equipmentId} (${month}): ${error}`);
      }
    }

    // 验证
    const verifyResult = await turso.execute({
      sql: 'SELECT COUNT(*) as count FROM maintenance_records WHERE photo_pairs LIKE \'%"dataUrl"%\'',
      args: [],
    });

    const remaining = verifyResult.rows[0]?.count as number;
    logs.push('');
    logs.push('========== 清理完成 ==========');
    logs.push(`已清理：${cleaned} 条记录`);
    logs.push(`已跳过：${skipped} 个照片（无 s3Key）`);
    logs.push(`错误：${errors} 条`);
    logs.push(`剩余包含 dataUrl 的记录：${remaining} 条`);

    if (remaining === 0) {
      logs.push('✓ 所有 dataUrl 已清理完成！');
    } else {
      logs.push(`⚠ 还有 ${remaining} 条记录包含 dataUrl`);
    }

    return NextResponse.json({
      success: true,
      cleaned,
      skipped,
      errors,
      remaining,
      logs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `清理失败：${error}` },
      { status: 500 }
    );
  }
}
