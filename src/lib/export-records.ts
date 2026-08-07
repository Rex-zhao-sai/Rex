import JSZip from "jszip";
import { saveAs } from "file-saver";
import { getRecordByEquipmentAndMonth } from "@/lib/turso-api";
import type { MaintenanceRecord as TursoMaintenanceRecord } from "@/lib/turso-api";

interface PhotoRecord {
  id: string;
  type: "before" | "after";
  dataUrl: string;
  s3Key?: string;
  s3Url?: string;
  timestamp: string;
  fileName: string;
}

interface PhotoPair {
  id: string;
  before: PhotoRecord | null;
  after: PhotoRecord | null;
  beforeKey?: string;
  afterKey?: string;
}

interface ExportProgress {
  current: number;
  total: number;
  message: string;
}

type ProgressCallback = (progress: ExportProgress) => void;

/**
 * 导出保养记录为 ZIP 文件（包含 CSV 和图片）
 */
export async function exportRecordsToZip(
  records: TursoMaintenanceRecord[],
  month: string,
  getEquipmentName: (id: string) => string,
  onProgress?: ProgressCallback
): Promise<void> {
  const zip = new JSZip();
  const folderName = `保养记录_${month}`;
  const rootFolder = zip.folder(folderName);

  if (!rootFolder) {
    throw new Error("创建 ZIP 文件夹失败");
  }

  // CSV 数据
  const csvHeaders = [
    "设备 ID",
    "设备名称",
    "月份",
    "技术员",
    "照片组数",
    "备注",
    "创建时间",
    "更新时间",
    "图片路径",
  ];
  const csvRows: string[][] = [csvHeaders];

  // 图片文件夹
  const imagesFolder = rootFolder.folder("images");
  if (!imagesFolder) {
    throw new Error("创建图片文件夹失败");
  }

  const totalRecords = records.length;
  let processedCount = 0;

  for (const record of records) {
    processedCount++;
    const equipmentName = getEquipmentName(record.equipment_id);
    const safeName = equipmentName.replace(/[/\\?%*:|"<>]/g, "-"); // 清理文件名

    // 更新进度
    if (onProgress) {
      onProgress({
        current: processedCount,
        total: totalRecords,
        message: `正在获取完整记录：${equipmentName}`,
      });
    }

    // 获取完整记录（包含 photo_pairs）
    let fullRecord: TursoMaintenanceRecord | null = null;
    try {
      fullRecord = await getRecordByEquipmentAndMonth(record.equipment_id, month);
    } catch (e) {
      console.error(`Failed to fetch full record for ${equipmentName}:`, e);
    }

    if (!fullRecord || !fullRecord.photo_pairs || fullRecord.photo_pairs.length === 0) {
      // 没有照片记录，跳过图片导出
      csvRows.push([
        record.equipment_id,
        equipmentName,
        record.month,
        record.technician || "",
        "0",
        record.notes || "",
        new Date(record.created_at).toLocaleString("zh-CN"),
        new Date(record.updated_at).toLocaleString("zh-CN"),
        "",
      ]);
      continue;
    }

    const completedPairs = (fullRecord.photo_pairs as PhotoPair[]).filter(
      (p) => p.before && p.after
    );

    // 为每个设备创建子文件夹
    const deviceFolder = imagesFolder.folder(safeName);
    if (!deviceFolder) continue;

    const imagePaths: string[] = [];

    // 处理每组照片
    for (let i = 0; i < completedPairs.length; i++) {
      const pair = completedPairs[i];
      const pairNum = i + 1;

      // 处理 Before 照片
      if (pair.before) {
        const beforeFileName = `pair-${pairNum}-before.jpg`;
        const beforePath = `images/${safeName}/${beforeFileName}`;
        imagePaths.push(beforePath);

        try {
          const beforeBlob = await getPhotoBlob(pair.before);
          deviceFolder.file(beforeFileName, beforeBlob);
        } catch (e) {
          console.error(`Failed to process before image for ${equipmentName}:`, e);
        }
      }

      // 处理 After 照片
      if (pair.after) {
        const afterFileName = `pair-${pairNum}-after.jpg`;
        const afterPath = `images/${safeName}/${afterFileName}`;
        imagePaths.push(afterPath);

        try {
          const afterBlob = await getPhotoBlob(pair.after);
          deviceFolder.file(afterFileName, afterBlob);
        } catch (e) {
          console.error(`Failed to process after image for ${equipmentName}:`, e);
        }
      }
    }

    // 添加 CSV 行
    csvRows.push([
      record.equipment_id,
      equipmentName,
      record.month,
      record.technician || "",
      String(completedPairs.length),
      record.notes || "",
      new Date(record.created_at).toLocaleString("zh-CN"),
      new Date(record.updated_at).toLocaleString("zh-CN"),
      imagePaths.join("; "),
    ]);
  }

  // 生成 CSV 内容
  const csvContent = csvRows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  // 添加 CSV 文件到 ZIP
  rootFolder.file(`保养记录_${month}.csv`, "\ufeff" + csvContent);

  // 添加 README 文件
  const readmeContent = `设备月度保养记录存档
生成时间：${new Date().toLocaleString("zh-CN")}
月份：${month}

文件结构：
- 保养记录_${month}.csv：详细数据（包含设备信息、技术员、照片路径等）
- images/：图片文件夹
  - 按设备名称分子文件夹
  - 每组照片包含 before（保养前）和 after（保养后）两张图片
  - 命名格式：pair-{序号}-before.jpg / pair-{序号}-after.jpg

使用说明：
1. 打开 CSV 文件可查看完整保养数据
2. 图片路径列指向对应的图片文件
3. 可直接打印 CSV 或导入 Excel 进行分析
`;
  rootFolder.file("README.txt", readmeContent);

  // 更新进度：正在生成 ZIP
  if (onProgress) {
    onProgress({
      current: totalRecords,
      total: totalRecords,
      message: "正在生成 ZIP 文件...",
    });
  }

  // 生成 ZIP 文件
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // 下载 ZIP 文件
  saveAs(zipBlob, `${folderName}.zip`);

  // 完成
  if (onProgress) {
    onProgress({
      current: totalRecords,
      total: totalRecords,
      message: "导出完成！",
    });
  }
}

/**
 * 将 Data URL 转换为 Blob
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  // 如果是 base64 data URL
  if (dataUrl.startsWith("data:")) {
    const response = await fetch(dataUrl);
    return await response.blob();
  }

  // 如果是普通 URL，尝试 fetch
  try {
    const response = await fetch(dataUrl);
    return await response.blob();
  } catch (e) {
    console.error("Failed to fetch image:", dataUrl);
    throw e;
  }
}

/**
 * 从 PhotoRecord 获取图片 Blob（支持 dataUrl、s3Url、s3Key）
 */
async function getPhotoBlob(photo: PhotoRecord): Promise<Blob> {
  // 优先使用 dataUrl（base64）
  if (photo.dataUrl && photo.dataUrl.startsWith("data:")) {
    return await dataUrlToBlob(photo.dataUrl);
  }

  // 使用 s3Url（预签名 URL）
  if (photo.s3Url) {
    try {
      const response = await fetch(photo.s3Url);
      return await response.blob();
    } catch (e) {
      console.error("Failed to fetch from s3Url:", photo.s3Url);
      throw e;
    }
  }

  // 使用 s3Key（需要动态获取预签名 URL）
  if (photo.s3Key) {
    try {
      const { getS3PhotoUrl } = await import("@/lib/s3");
      const signedUrl = await getS3PhotoUrl(photo.s3Key);
      const response = await fetch(signedUrl);
      return await response.blob();
    } catch (e) {
      console.error("Failed to fetch from s3Key:", photo.s3Key);
      throw e;
    }
  }

  // 最后尝试 dataUrl（可能是普通 URL）
  if (photo.dataUrl) {
    return await dataUrlToBlob(photo.dataUrl);
  }

  throw new Error("No photo source available");
}
