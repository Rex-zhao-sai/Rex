"use client";

import { EquipmentDetailClient } from "./[id]/EquipmentDetailClient";

export function EquipmentDetailClientWrapper({ equipmentId, month }: { equipmentId: string; month?: string }) {
  return <EquipmentDetailClient params={Promise.resolve({ id: equipmentId })} searchParams={Promise.resolve({ month })} />;
}
