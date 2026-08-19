/**
 * api.ts
 *
 * Single source of truth for all HTTP calls to the Spring Boot backend.
 * Replaces AsyncStorage for devices, medicines and schedules.
 *
 * Base URL is read from EXPO_PUBLIC_API_BASE_URL (mobile/.env).
 * Falls back to the Expo LAN host so physical devices work out of the box.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── Base URL ─────────────────────────────────────────────────────────────────
function resolveBase(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) return envUrl;

  // Auto-detect Expo LAN host so a physical phone can reach the dev machine
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:8080`;
  }

  return Platform.select({
    android: 'http://10.0.2.2:8080',
    ios:     'http://localhost:8080',
    default: 'http://localhost:8080',
  }) as string;
}

export const API_BASE = resolveBase();

// Log the API base URL for debugging
console.log('[API] Base URL:', API_BASE);

// ─── Auth error (token missing / expired) ─────────────────────────────────────
/** Thrown on 401/403. Screens should catch this and navigate to login. */
export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name  = 'AuthError';
    this.status = status;
  }
}

// ─── Types (mirror the mobile data model exactly) ─────────────────────────────
export type RepeatType = 'daily' | 'specific_days' | 'one_time';
export type WeekDay    = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface ApiDevice {
  id: string;
  name: string;
  deviceUid: string;
  cartridgeCount: number;
  firmwareVersion: string;
  status: 'online' | 'offline';
  lastSync: string;
}

export interface ApiMedicine {
  id: string;
  deviceId: string;
  cartridgeSlot: number;
  name: string;
  quantity: number;
  lowStockThreshold: number;
}

export interface ApiSchedule {
  id: string;
  deviceId: string;
  medicineId: string;
  time: string;
  repeatType: RepeatType;
  specificDays: WeekDay[];
  oneTimeDate: string;
  quantityPerDose: number;
  alarmEnabled: boolean;
}

// ─── Core fetch helper ────────────────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);
  
  // Get JWT token from AsyncStorage
  const { getSession } = await import('./auth');
  const session = await getSession();
  const token = session?.token;

  if (!token) {
    console.warn(`[API] No token in session — request to ${path} will be rejected`);
  }
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });

    if (res.status === 204) return undefined as unknown as T; // No Content

    const text = await res.text();
    const body = text ? JSON.parse(text) : {};

    if (!res.ok) {
      // 401 / 403 means the token is missing or expired — surface a clear message
      if (res.status === 401 || res.status === 403) {
        const msg = token
          ? `Session expired. Please log in again. (${res.status})`
          : `Not authenticated. Please log in. (${res.status})`;
        console.error(`[API] Auth error on ${path}:`, msg);
        throw new AuthError(msg, res.status);
      }
      const msg = body?.message ?? `HTTP ${res.status} on ${url}`;
      console.error(`[API] Error: ${msg}`);
      throw new Error(msg);
    }
    
    console.log(`[API] Success: ${options.method || 'GET'} ${path}`);
    return body as T;
  } catch (e: any) {
    // Don't rewrap AuthError — let it bubble as-is so screens can handle it
    if (e instanceof AuthError) throw e;
    console.error(`[API] Request failed:`, e);
    throw new Error(`Failed to fetch: ${e.message || 'Network error'}`);
  }
}

// ─── Devices ──────────────────────────────────────────────────────────────────
export const deviceApi = {
  list:   ()                          => request<ApiDevice[]>('/api/devices'),
  get:    (id: string)                => request<ApiDevice>(`/api/devices/${id}`),
  create: (body: Omit<ApiDevice,'id'|'createdAt'|'updatedAt'>) =>
    request<ApiDevice>('/api/devices', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<ApiDevice>) =>
    request<ApiDevice>(`/api/devices/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<void>(`/api/devices/${id}`, { method: 'DELETE' }),
};

// ─── Medicines ────────────────────────────────────────────────────────────────
export interface CreateMedicineBody {
  deviceId: string;
  name: string;
  quantity: number;
  cartridgeSlot: number;
  lowStockThreshold?: number;
}

export const medicineApi = {
  list:        (deviceId?: string) =>
    request<ApiMedicine[]>(deviceId ? `/api/medicines?deviceId=${deviceId}` : '/api/medicines'),
  get:         (id: string)        => request<ApiMedicine>(`/api/medicines/${id}`),
  create:      (body: CreateMedicineBody) =>
    request<ApiMedicine>('/api/medicines', { method: 'POST', body: JSON.stringify(body) }),
  update:      (id: string, body: Partial<CreateMedicineBody>) =>
    request<ApiMedicine>(`/api/medicines/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete:      (id: string) =>
    request<void>(`/api/medicines/${id}`, { method: 'DELETE' }),
};

// ─── Schedules ────────────────────────────────────────────────────────────────
export interface CreateScheduleBody {
  deviceId: string;
  medicineId: string;
  time: string;
  repeatType: RepeatType;
  specificDays: WeekDay[];
  oneTimeDate: string;
  quantityPerDose: number;
  alarmEnabled: boolean;
}

export const scheduleApi = {
  list:   (deviceId?: string) =>
    request<ApiSchedule[]>(deviceId ? `/api/schedules?deviceId=${deviceId}` : '/api/schedules'),
  get:    (id: string)        => request<ApiSchedule>(`/api/schedules/${id}`),
  create: (body: CreateScheduleBody) =>
    request<ApiSchedule>('/api/schedules', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<CreateScheduleBody>) =>
    request<ApiSchedule>(`/api/schedules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<void>(`/api/schedules/${id}`, { method: 'DELETE' }),
};

// ─── Dispense ─────────────────────────────────────────────────────────────────
export interface DispenseResponse {
  status: 'success' | 'error';
  message: string;
}

export interface DispenseStatusResponse {
  status: 'success' | 'error';
  C1?: { running: boolean; pending: number };
  C2?: { running: boolean; pending: number };
  C3?: { running: boolean; pending: number };
  [key: string]: any;
}

// Dedicated fetch that NEVER throws — always returns a DispenseResponse.
// The dispense loop in ManualDispenseScreen checks res.status directly.
async function dispenseRequest(
  path: string,
  options: RequestInit = {},
): Promise<DispenseResponse> {
  const url = `${API_BASE}${path}`;
  
  // Get JWT token from AsyncStorage
  const { getSession } = await import('./auth');
  const session = await getSession();
  const token = session?.token;
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};
    // Spring Boot always returns 200 for dispense — body has status field
    return body as DispenseResponse;
  } catch (e: any) {
    return { status: 'error', message: e?.message ?? 'Network error' };
  }
}

export const dispenseApi = {
  bySchedule: (scheduleId: string) =>
    dispenseRequest('/api/dispense', {
      method: 'POST',
      body: JSON.stringify({ scheduleId }),
    }),

  byCartridge: (cartridgeId: string, quantity: number) =>
    dispenseRequest('/api/dispense', {
      method: 'POST',
      body: JSON.stringify({ cartridgeId, quantity }),
    }),

  status: () =>
    dispenseRequest('/api/dispense/status') as Promise<DispenseStatusResponse>,

  reset: () =>
    dispenseRequest('/api/dispense/reset', {
      method: 'POST',
    }),

  resetCartridge: (cartridgeId: string) =>
    dispenseRequest('/api/dispense/reset', {
      method: 'POST',
      body: JSON.stringify({ cartridgeId }),
    }),
};
