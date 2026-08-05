"use client";

import { EquipmentDetailClient } from "./[id]/EquipmentDetailClient";

export function EquipmentDetailClientWrapper({ equipmentId }: { equipmentId: string }) {
  return <EquipmentDetailClient params={Promise.resolve({ id: equipmentId })} />;
}
