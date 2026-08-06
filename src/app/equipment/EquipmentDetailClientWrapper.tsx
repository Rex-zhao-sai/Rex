import { Suspense } from "react";
import { EquipmentDetailClient } from "./[id]/EquipmentDetailClient";

interface EquipmentDetailClientWrapperProps {
  equipmentId: string;
  month?: string;
}

export function EquipmentDetailClientWrapper({ equipmentId, month }: EquipmentDetailClientWrapperProps) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}>
      <EquipmentDetailClient equipmentId={equipmentId} initialMonth={month} />
    </Suspense>
  );
}
