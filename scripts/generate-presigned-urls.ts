import { S3Storage } from 'coze-coding-dev-sdk';
import turso from '../src/lib/turso';

const s3Storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: process.env.COZE_BUCKET_REGION || 'cn-beijing',
});

async function generatePresignedUrls() {
  if (!turso) {
    console.error('Turso not available');
    return;
  }

  // 查询所有有 beforeKey 的记录
  const result = await turso.execute({
    sql: 'SELECT equipment_id, month, photo_pairs FROM maintenance_records',
    args: [],
  });

  let updated = 0;
  let skipped = 0;

  for (const row of result.rows) {
    const pairs = JSON.parse(row.photo_pairs as string);
    let changed = false;

    for (const pair of pairs) {
      if (pair.beforeKey && !pair.before?.s3Url) {
        try {
          const url = await s3Storage.generatePresignedUrl({
            key: pair.beforeKey,
            expireTime: 30 * 24 * 3600, // 30 天
          });
          pair.before = pair.before || {};
          pair.before.s3Url = url;
          changed = true;
        } catch (error) {
          console.error(`Error generating presigned URL for ${pair.beforeKey}:`, error);
        }
      }

      if (pair.afterKey && !pair.after?.s3Url) {
        try {
          const url = await s3Storage.generatePresignedUrl({
            key: pair.afterKey,
            expireTime: 30 * 24 * 3600, // 30 天
          });
          pair.after = pair.after || {};
          pair.after.s3Url = url;
          changed = true;
        } catch (error) {
          console.error(`Error generating presigned URL for ${pair.afterKey}:`, error);
        }
      }
    }

    if (changed) {
      await turso.execute({
        sql: 'UPDATE maintenance_records SET photo_pairs = ? WHERE equipment_id = ? AND month = ?',
        args: [JSON.stringify(pairs), row.equipment_id as string, row.month as string],
      });
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`Updated: ${updated}, Skipped: ${skipped}`);
}

generatePresignedUrls().catch(console.error);
