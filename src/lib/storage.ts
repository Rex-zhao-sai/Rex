import type { MaintenanceRecord } from "./equipment-data";

const STORAGE_KEY = "maintenance_records";

export function getAllRecords(): MaintenanceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MaintenanceRecord[];
  } catch {
    return [];
  }
}

export function getRecord(equipmentId: string, month: string): MaintenanceRecord | null {
  const records = getAllRecords();
  return records.find((r) => r.equipmentId === equipmentId && r.month === month) ?? null;
}

export function saveRecord(record: MaintenanceRecord): void {
  const records = getAllRecords();
  const idx = records.findIndex(
    (r) => r.equipmentId === record.equipmentId && r.month === record.month
  );
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m)}月`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
