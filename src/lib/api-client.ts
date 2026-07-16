// API 客户端封装 - 带重试和 localStorage 降级
// 当 Supabase 云端不可用时，自动降级到本地存储

import type { PhotoPair, PhotoRecord } from "@/lib/equipment-data";

export type Role = 'admin' | 'operator';

export interface ApiMaintenanceRecord {
  id: string;
  equipment_id: string;
  month: string;
  technician: string;
  notes: string;
  photo_pairs: PhotoPair[];
  role: Role;
  created_at: string;
  updated_at: string;
  equipment?: { name: string };
}

export interface ApiEquipment {
  id: string;
  name: string;
  created_at: string;
}

const API_BASE = '/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// 检查是否为 Supabase 实例不可用错误
function isInstanceNotFoundError(error: unknown): boolean {
  if (typeof error === 'string') {
    return error.includes('instance_not_found') || error.includes('not found');
  }
  if (error instanceof Error) {
    return error.message.includes('instance_not_found') || error.message.includes('not found');
  }
  return false;
}

// 带重试的 fetch
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const body = await response.text();
      if (isInstanceNotFoundError(body) && retries > 0) {
        // Supabase 实例不可用，等待后重试
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw new Error(`HTTP ${response.status}: ${body}`);
    }
    return response;
  } catch (error) {
    if (retries > 0 && isInstanceNotFoundError(error)) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// ========== 设备 API ==========

export async function fetchEquipment(): Promise<ApiEquipment[]> {
  const response = await fetchWithRetry(`${API_BASE}/equipment`);
  const data = await response.json();
  return data.data || [];
}

export async function addEquipment(name: string): Promise<ApiEquipment> {
  const response = await fetchWithRetry(`${API_BASE}/equipment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await response.json();
  return data.data;
}

// ========== 保养记录 API ==========

export async function fetchRecords(month?: string): Promise<ApiMaintenanceRecord[]> {
  const params = month ? `?month=${month}` : '';
  const response = await fetchWithRetry(`${API_BASE}/records${params}`);
  const data = await response.json();
  return data.data || [];
}

export async function fetchRecord(id: string): Promise<ApiMaintenanceRecord> {
  const response = await fetchWithRetry(`${API_BASE}/records/${id}`);
  const data = await response.json();
  return data.data;
}

export async function createRecord(
  record: Omit<ApiMaintenanceRecord, 'id' | 'created_at' | 'updated_at'>,
  role: Role
): Promise<ApiMaintenanceRecord> {
  const response = await fetchWithRetry(`${API_BASE}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-role': role,
    },
    body: JSON.stringify(record),
  });
  const data = await response.json();
  return data.data;
}

export async function updateRecord(
  id: string,
  updates: Partial<ApiMaintenanceRecord>,
  role: Role
): Promise<ApiMaintenanceRecord> {
  const response = await fetchWithRetry(`${API_BASE}/records/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-role': role,
    },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  return data.data;
}

export async function deleteRecord(id: string): Promise<void> {
  await fetchWithRetry(`${API_BASE}/records/${id}`, {
    method: 'DELETE',
  });
}

// ========== localStorage 降级 ==========
// 当云端不可用时，使用本地存储作为临时方案

const STORAGE_KEY = 'maintenance_records_local';
const EQUIPMENT_KEY = 'equipment_local';

interface LocalData {
  records: ApiMaintenanceRecord[];
  equipment: ApiEquipment[];
}

function getLocalData(): LocalData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { records: [], equipment: [] };
}

function saveLocalData(data: LocalData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 降级模式标志
let useLocalFallback = false;

export function isUsingLocalFallback(): boolean {
  return useLocalFallback;
}

export function setLocalFallback(enabled: boolean): void {
  useLocalFallback = enabled;
}

// 降级模式的设备操作
export async function fetchEquipmentLocal(): Promise<ApiEquipment[]> {
  const data = getLocalData();
  return data.equipment;
}

export async function addEquipmentLocal(name: string): Promise<ApiEquipment> {
  const data = getLocalData();
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const equipment: ApiEquipment = {
    id,
    name,
    created_at: new Date().toISOString(),
  };
  data.equipment.push(equipment);
  saveLocalData(data);
  return equipment;
}

// 降级模式的记录操作
export async function fetchRecordsLocal(month?: string): Promise<ApiMaintenanceRecord[]> {
  const data = getLocalData();
  if (month) {
    return data.records.filter(r => r.month === month);
  }
  return data.records;
}

export async function createRecordLocal(
  record: Omit<ApiMaintenanceRecord, 'id' | 'created_at' | 'updated_at'>,
  role: Role
): Promise<ApiMaintenanceRecord> {
  const data = getLocalData();
  const newRecord: ApiMaintenanceRecord = {
    ...record,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    role,
  };
  data.records.push(newRecord);
  saveLocalData(data);
  return newRecord;
}

export async function updateRecordLocal(
  id: string,
  updates: Partial<ApiMaintenanceRecord>,
  role: Role
): Promise<ApiMaintenanceRecord> {
  const data = getLocalData();
  const index = data.records.findIndex(r => r.id === id);
  if (index === -1) throw new Error('记录不存在');

  // 权限检查
  if (role === 'operator' && data.records[index].role === 'admin') {
    throw new Error('无权修改管理员创建的记录');
  }

  data.records[index] = {
    ...data.records[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveLocalData(data);
  return data.records[index];
}

// 同步本地数据到云端（当云端恢复时）
export async function syncLocalToCloud(): Promise<void> {
  const localData = getLocalData();

  // 同步设备
  for (const equipment of localData.equipment) {
    try {
      await addEquipment(equipment.name);
    } catch {
      // 可能已存在，忽略
    }
  }

  // 同步记录
  for (const record of localData.records) {
    try {
      await createRecord(
        {
          equipment_id: record.equipment_id,
          month: record.month,
          technician: record.technician,
          notes: record.notes,
          photo_pairs: record.photo_pairs,
          role: record.role,
        },
        record.role
      );
    } catch {
      // 同步失败，保留在本地
    }
  }

  // 清空本地数据
  localStorage.removeItem(STORAGE_KEY);
  useLocalFallback = false;
}
