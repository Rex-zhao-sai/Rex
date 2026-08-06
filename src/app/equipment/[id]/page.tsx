import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import { EquipmentDetailClient } from "./EquipmentDetailClient";

export function generateStaticParams() {
  return EQUIPMENT_LIST.map((eq) => ({ id: eq.id }));
}

export default function EquipmentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ month?: string }> }) {
  return <EquipmentDetailClient params={params} searchParams={searchParams} />;
}
