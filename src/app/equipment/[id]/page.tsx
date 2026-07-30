import { notFound } from "next/navigation";
import { EquipmentDetailClient } from "./EquipmentDetailClient";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";

// 静态导出时生成所有已知设备的页面
export async function generateStaticParams() {
  return EQUIPMENT_LIST.map((eq) => ({
    id: eq.id,
  }));
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 验证设备是否存在
  const equipment = EQUIPMENT_LIST.find((eq) => eq.id === id);
  if (!equipment) {
    notFound();
  }

  return <EquipmentDetailClient params={params} />;
}
