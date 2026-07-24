import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE = Platform.OS === 'web' ? 'http://localhost:8080' : 'http://10.0.2.2:8080';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

const SESSION_KEY = '@auth_session';

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
};

export const loginUser = async (credentials: LoginCredentials): Promise<AuthUser> => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const user = await handleResponse(res);
  await saveSession(user);
  return user;
};

export const registerUser = async (credentials: RegisterCredentials): Promise<AuthUser> => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const user = await handleResponse(res);
  await saveSession(user);
  return user;
};

export const saveSession = async (user: AuthUser): Promise<void> => {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const getSession = async (): Promise<AuthUser | null> => {
  const data = await AsyncStorage.getItem(SESSION_KEY);
  if (data) {
    return JSON.parse(data) as AuthUser;
  }
  return null;
};

export const clearSession = async (): Promise<void> => {
  await AsyncStorage.removeItem(SESSION_KEY);
};

