import { EQUIPMENT_LIST } from "@/lib/equipment-data";
import { EquipmentDetailClientWrapper } from "../EquipmentDetailClientWrapper";

export function generateStaticParams() {
  return EQUIPMENT_LIST.map((eq) => ({ id: eq.id }));
}

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EquipmentDetailClientWrapper equipmentId={id} />;
}
