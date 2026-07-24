import { Platform } from 'react-native';

const API_BASE = Platform.OS === 'web' ? 'http://localhost:8080' : 'http://10.0.2.2:8080';

export interface Device {
  id: string;
  name: string;
  deviceUid: string;
  firmwareVersion: string;
  status: string;
  lastSync: string | null;
  userId: string | null;
}

export interface DeviceRequest {
  name: string;
  deviceUid: string;
}

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) {
    return null;
  }
  return res.json();
};

export const fetchDevices = async (): Promise<Device[]> => {
  const res = await fetch(`${API_BASE}/api/devices`);
  return handleResponse(res);
};

export const createDevice = async (data: DeviceRequest): Promise<Device> => {
  const res = await fetch(`${API_BASE}/api/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const renameDevice = async (id: string, name: string): Promise<Device> => {
  const res = await fetch(`${API_BASE}/api/devices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
};

export const deleteDevice = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/api/devices/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
};
