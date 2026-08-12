import { NextRequest, NextResponse } from "next/server";
import turso, { isTursoAvailable } from "@/lib/turso";
import { S3Storage } from "coze-coding-dev-sdk";

// 初始化 S3 客户端
const s3Storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: process.env.COZE_BUCKET_REGION || "cn-beijing",
});

/**
 * POST /api/migrate-photos - 清理历史照片数据中的 dataUrl（base64）
 * 
 * 迁移逻辑：
 * 1. 查询所有包含 photo_pairs 的记录
 * 2. 对每张照片：
 *    - 如果有 s3Key：直接删除 dataUrl（S3 已有图片）
 *    - 如果没有 s3Key：先用 dataUrl 上传到 S3，获得 s3Key，再删除 dataUrl
 * 3. 更新记录
 */
export async function POST(request: NextRequest) {
  if (!isTursoAvailable()) {
    return NextResponse.json({ error: "Turso 不可用" }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true; // 只报告不修改
    const batchSize = Math.min(body.batchSize || 10, 50); // 每批处理数量

    // 查询所有有 photo_pairs 的记录
    const result = await turso!.execute({
      sql: `SELECT id, equipment_id, month, photo_pairs FROM maintenance_records 
            WHERE photo_pairs IS NOT NULL AND photo_pairs != '[]' AND photo_pairs != 'null'
            ORDER BY updated_at DESC`,
    });

    const records = result.rows as any[];
    const report = {
      total: records.length,
      processed: 0,
      skipped: 0,
      uploaded: 0,    // 新上传到 S3 的照片数
      cleaned: 0,     // 仅删除 dataUrl 的照片数
      errors: [] as string[],
      details: [] as any[],
    };

    for (const record of records) {
      try {
        let photoPairs: any[];
        if (typeof record.photo_pairs === "string") {
          photoPairs = JSON.parse(record.photo_pairs);
        } else {
          photoPairs = record.photo_pairs;
        }

        if (!Array.isArray(photoPairs) || photoPairs.length === 0) {
          report.skipped++;
          continue;
        }

        let modified = false;
        let recordUploaded = 0;
        let recordCleaned = 0;

        for (const pair of photoPairs) {
          for (const type of ["before", "after"] as const) {
            const photo = pair[type];
            if (!photo) continue;

            if (photo.dataUrl) {
              // 有 dataUrl 需要处理
              if (photo.s3Key) {
                // S3 已有图片，直接删除 dataUrl
                if (!dryRun) {
                  delete photo.dataUrl;
                }
                recordCleaned++;
                modified = true;
              } else {
                // 没有 s3Key，需要先上传到 S3
                try {
                  const base64Data = photo.dataUrl.split(",")[1] || photo.dataUrl;
                  const buffer = Buffer.from(base64Data, "base64");
                  const ext = photo.fileName?.split(".").pop() || "jpg";
                  const fileKey = `photos/${pair.id}/${type}-${Date.now()}.${ext}`;

                  if (!dryRun) {
                    const actualKey = await s3Storage.uploadFile({
                      fileContent: buffer,
                      fileName: fileKey,
                      contentType: "image/jpeg",
                    });
                    photo.s3Key = actualKey;
                    delete photo.dataUrl;
                  } else {
                    photo.s3Key = `[dry-run] ${fileKey}`;
                    delete photo.dataUrl;
                  }
                  recordUploaded++;
                  modified = true;
                } catch (uploadErr: any) {
                  report.errors.push(
                    `记录 ${record.id} 照片上传失败 (${type}): ${uploadErr.message}`
                  );
                }
              }
            }
          }
        }

        if (modified && !dryRun) {
          await turso!.execute({
            sql: `UPDATE maintenance_records SET photo_pairs = ?, updated_at = ? WHERE id = ?`,
            args: [JSON.stringify(photoPairs), new Date().toISOString(), record.id],
          });
        }

        report.processed++;
        report.uploaded += recordUploaded;
        report.cleaned += recordCleaned;
        report.details.push({
          id: record.id,
          equipment_id: record.equipment_id,
          month: record.month,
          uploaded: recordUploaded,
          cleaned: recordCleaned,
        });

        // 控制节奏，避免过快
        if (report.processed % batchSize === 0) {
          await new Promise((r) => setTimeout(r, 100));
        }
      } catch (err: any) {
        report.errors.push(`记录 ${record.id} 处理失败: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      report,
      message: dryRun
        ? `预览模式：共 ${report.total} 条记录，${report.uploaded} 张照片需上传，${report.cleaned} 张照片仅需清理 dataUrl`
        : `迁移完成：处理 ${report.processed} 条记录，上传 ${report.uploaded} 张照片，清理 ${report.cleaned} 张照片`,
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
