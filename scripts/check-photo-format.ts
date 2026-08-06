import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const turso = createClient({
  url: process.env.NEXT_PUBLIC_TURSO_URL!,
  authToken: process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN,
});

async function main() {
  console.log("查询 photo_pairs 数据格式...\n");

  const result = await turso.execute({
    sql: "SELECT equipment_id, month, photo_pairs FROM maintenance_records WHERE month = '2026-07' LIMIT 1",
  });

  if (result.rows.length === 0) {
    console.log("没有找到 7 月记录");
    return;
  }

  const row = result.rows[0];
  console.log("设备 ID:", row.equipment_id);
  console.log("月份:", row.month);
  
  const photoPairsStr = row.photo_pairs as string;
  console.log("photo_pairs 长度:", photoPairsStr.length);
  console.log("photo_pairs 前 500 字符:", photoPairsStr.substring(0, 500));
  
  try {
    const photoPairs = JSON.parse(photoPairsStr);
    console.log("\n解析后的 photo_pairs 结构:");
    console.log("类型:", Array.isArray(photoPairs) ? "数组" : typeof photoPairs);
    console.log("数量:", photoPairs.length);
    
    if (photoPairs.length > 0) {
      const firstPair = photoPairs[0];
      console.log("\n第一组照片:");
      console.log("ID:", firstPair.id);
      console.log("before:", firstPair.before ? {
        id: firstPair.before.id,
        type: firstPair.before.type,
        dataUrlPrefix: firstPair.before.dataUrl?.substring(0, 100),
        s3Url: firstPair.before.s3Url || "无"
      } : "null");
      console.log("after:", firstPair.after ? {
        id: firstPair.after.id,
        type: firstPair.after.type,
        dataUrlPrefix: firstPair.after.dataUrl?.substring(0, 100),
        s3Url: firstPair.after.s3Url || "无"
      } : "null");
    }
  } catch (e) {
    console.error("解析 JSON 失败:", e);
  }
}

main().catch(console.error);
