import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import { EquipmentDetailClient } from "./EquipmentDetailClient";

export async function generateStaticParams() {
  return EQUIPMENT_LIST.map((eq) => ({ id: eq.id }));
}

export default function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <EquipmentDetailClient params={params} />;
}
