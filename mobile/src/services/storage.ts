/**
 * storage.ts
 *
 * Source of truth: AsyncStorage (on-device persistent storage).
 * Devices and medicines are saved here on every change and reloaded on app
 * start. Data survives app restarts, Expo reloads, and re-mounts.
 *
 * Keys:
 *   @devices   — Device[]
 *   @medicines — Medicine[]
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medicine } from '../screens/MedicinesScreen';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Device {
  id: string;
  name: string;
  deviceUid: string;
  cartridgeCount: number;
  firmwareVersion: string;
  status: 'online' | 'offline';
  lastSync: string;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────
const DEVICES_KEY   = '@devices';
const MEDICINES_KEY = '@medicines';

// ─── Seed data (used only when no saved data exists yet) ──────────────────────
export const SEED_DEVICES: Device[] = [
  {
    id: '1',
    name: 'Living Room Dispenser',
    deviceUid: 'MD-2024-001',
    cartridgeCount: 4,
    firmwareVersion: 'v2.1.0',
    status: 'online',
    lastSync: '2 min ago',
  },
  {
    id: '2',
    name: 'Bedroom Dispenser',
    deviceUid: 'MD-2024-002',
    cartridgeCount: 6,
    firmwareVersion: 'v2.0.5',
    status: 'offline',
    lastSync: '3 hours ago',
  },
];

export const SEED_MEDICINES: Medicine[] = [
  { id: 'm1', deviceId: '1', cartridgeSlot: 1, name: 'Metformin 500mg',   quantity: 42 },
  { id: 'm2', deviceId: '1', cartridgeSlot: 3, name: 'Lisinopril 10mg',   quantity: 7  },
  { id: 'm3', deviceId: '2', cartridgeSlot: 2, name: 'Atorvastatin 20mg', quantity: 28 },
];

// ─── Devices ──────────────────────────────────────────────────────────────────
export const loadDevices = async (): Promise<Device[]> => {
  try {
    const raw = await AsyncStorage.getItem(DEVICES_KEY);
    if (raw) {
      console.log('[storage] Loaded devices from AsyncStorage');
      return JSON.parse(raw) as Device[];
    }
    // First launch — persist seed data so future loads come from storage
    console.log('[storage] No saved devices found — seeding defaults');
    await saveDevices(SEED_DEVICES);
    return SEED_DEVICES;
  } catch (e) {
    console.error('[storage] loadDevices error:', e);
    return SEED_DEVICES;
  }
};

export const saveDevices = async (devices: Device[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
    console.log(`[storage] Saved ${devices.length} device(s) to AsyncStorage`);
  } catch (e) {
    console.error('[storage] saveDevices error:', e);
  }
};

// ─── Medicines ────────────────────────────────────────────────────────────────
export const loadMedicines = async (): Promise<Medicine[]> => {
  try {
    const raw = await AsyncStorage.getItem(MEDICINES_KEY);
    if (raw) {
      console.log('[storage] Loaded medicines from AsyncStorage');
      return JSON.parse(raw) as Medicine[];
    }
    console.log('[storage] No saved medicines found — seeding defaults');
    await saveMedicines(SEED_MEDICINES);
    return SEED_MEDICINES;
  } catch (e) {
    console.error('[storage] loadMedicines error:', e);
    return SEED_MEDICINES;
  }
};

export const saveMedicines = async (medicines: Medicine[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
    console.log(`[storage] Saved ${medicines.length} medicine(s) to AsyncStorage`);
  } catch (e) {
    console.error('[storage] saveMedicines error:', e);
  }
};
