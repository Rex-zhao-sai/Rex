"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EquipmentDetailClientWrapper } from "./EquipmentDetailClientWrapper";

function EquipmentContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const month = searchParams.get("month");

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">未指定设备 ID</p>
      </div>
    );
  }

  return <EquipmentDetailClientWrapper equipmentId={id} month={month || undefined} />;
}

export default function EquipmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      }
    >
      <EquipmentContent />
    </Suspense>
  );
}
