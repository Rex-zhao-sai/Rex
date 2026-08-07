import { NextRequest, NextResponse } from "next/server";
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
 * POST /api/s3/upload - 上传照片到 S3
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;
    const fileName = formData.get("fileName") as string;
    const pairId = formData.get("pairId") as string;
    const type = formData.get("type") as "before" | "after";

    if (!file || !fileName || !pairId || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 生成唯一的文件键
    const timestamp = Date.now();
    const ext = fileName.split('.').pop() || 'jpg';
    const fileKey = `photos/${pairId}/${type}-${timestamp}.${ext}`;

    // 上传到 S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const actualKey = await s3Storage.uploadFile({
      fileContent: buffer,
      fileName: fileKey,
      contentType: 'image/jpeg',
    });

    return NextResponse.json({ key: actualKey });
  } catch (error: any) {
    console.error("S3 upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/s3?action=presigned-url&key=xxx - 获取预签名 URL
 */
export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action");
    const key = request.nextUrl.searchParams.get("key");
    
    if (action === "presigned-url") {
      if (!key) {
        return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
      }

      // 生成预签名 URL（24 小时有效期）
      const url = await s3Storage.generatePresignedUrl({
        key,
        expireTime: 86400,
      });

      return NextResponse.json({ url });
    }
    
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("S3 presigned URL error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
