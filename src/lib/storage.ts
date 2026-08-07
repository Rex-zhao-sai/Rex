import type { MaintenanceRecord } from "./equipment-data";

const STORAGE_KEY = "maintenance_records";

// S3 配置
const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET || "maintenance-photos";
const S3_REGION = process.env.NEXT_PUBLIC_S3_REGION || "us-west-2";
const S3_ACCESS_KEY = process.env.NEXT_PUBLIC_S3_ACCESS_KEY || "";
const S3_SECRET_KEY = process.env.NEXT_PUBLIC_S3_SECRET_KEY || "";

/**
 * S3 存储客户端
 */
export class S3Storage {
  private bucketName: string;
  private region: string;
  private accessKey: string;
  private secretKey: string;

  constructor(config: {
    bucketName: string;
    region: string;
    accessKey: string;
    secretKey: string;
  }) {
    this.bucketName = config.bucketName;
    this.region = config.region;
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
  }

  /**
   * 上传文件到 S3
   */
  async uploadFile(params: {
    file: Blob;
    key: string;
    contentType?: string;
  }): Promise<{ url: string }> {
    // TODO: 实现实际的 S3 上传逻辑
    // 这里需要集成 coze-coding-dev-sdk 的 S3 客户端
    console.log("[S3] 上传文件:", params.key);
    return { url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${params.key}` };
  }

  /**
   * 获取公共 URL
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * 获取预签名 URL
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // 使用 AWS Signature Version 4 生成预签名 URL
    const endpoint = `https://${this.bucketName}.s3.${this.region}.amazonaws.com`;
    const service = 's3';
    const date = new Date();
    const dateStamp = date.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 8);
    const amzDate = date.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15);
    const expires = expiresIn.toString();
    
    // 构建规范请求
    const canonicalUri = `/${key}`;
    const canonicalQuerystring = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(`${this.accessKey}/${dateStamp}/${this.region}/${service}/aws4_request`)}&X-Amz-Date=${amzDate}&X-Amz-Expires=${expires}&X-Amz-SignedHeaders=host`;
    const canonicalHeaders = `host:${this.bucketName}.s3.${this.region}.amazonaws.com\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';
    const canonicalRequest = `GET\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    // 构建签名字符串
    const credentialScope = `${dateStamp}/${this.region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await this.sha256(canonicalRequest)}`;
    
    // 计算签名
    const signingKey = await this.getSignatureKey(dateStamp);
    const signature = await this.hmac(signingKey, new TextEncoder().encode(stringToSign));
    
    // 构建最终 URL
    return `${endpoint}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
  }

  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async hmac(key: Uint8Array, message: Uint8Array): Promise<string> {
    const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, message as BufferSource);
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async getSignatureKey(dateStamp: string): Promise<Uint8Array> {
    const kDate = await this.hmacRaw(new TextEncoder().encode(`AWS4${this.secretKey}`), dateStamp);
    const kRegion = await this.hmacRaw(kDate, this.region);
    const kService = await this.hmacRaw(kRegion, 's3');
    return this.hmacRaw(kService, 'aws4_request');
  }

  private async hmacRaw(key: Uint8Array | string, message: string): Promise<Uint8Array> {
    const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
    const cryptoKey = await crypto.subtle.importKey('raw', keyData as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
    return new Uint8Array(signature);
  }
}

export function getAllRecords(): MaintenanceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MaintenanceRecord[];
  } catch {
    return [];
  }
}

export function getRecord(equipmentId: string, month: string): MaintenanceRecord | null {
  const records = getAllRecords();
  return records.find((r) => r.equipmentId === equipmentId && r.month === month) ?? null;
}

export function saveRecord(record: MaintenanceRecord): void {
  const records = getAllRecords();
  const idx = records.findIndex(
    (r) => r.equipmentId === record.equipmentId && r.month === record.month
  );
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m)}月`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
