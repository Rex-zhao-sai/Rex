import { EquipmentDetailClient } from "./EquipmentDetailClient";

export const dynamic = "force-dynamic";

export default function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <EquipmentDetailClient params={params} />;
}
