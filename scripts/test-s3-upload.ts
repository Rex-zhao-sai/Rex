/**
 * 测试 S3 上传
 */

import { S3Storage } from "coze-coding-dev-sdk";

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

async function testUpload() {
  console.log("Testing S3 upload...");
  
  const testContent = Buffer.from("Hello, World!");
  const testFileName = "test.txt";
  
  try {
    console.log("Uploading test file...");
    const key = await storage.uploadFile({
      fileContent: testContent,
      fileName: testFileName,
      contentType: "text/plain",
    });
    
    console.log("Upload successful! Key:", key);
    
    // Generate presigned URL
    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 3600,
    });
    
    console.log("Presigned URL:", url);
  } catch (error) {
    console.error("Upload failed:", error);
  }
}

testUpload();
