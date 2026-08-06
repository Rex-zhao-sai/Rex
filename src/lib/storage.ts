import type { MaintenanceRecord } from "./equipment-data";

const STORAGE_KEY = "maintenance_records";

// S3 配置
const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET || "maintenance-photos";
const S3_REGION = process.env.NEXT_PUBLIC_S3_REGION || "us-east-1";
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
