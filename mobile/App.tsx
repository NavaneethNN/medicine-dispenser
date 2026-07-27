import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import ContainersScreen from './src/screens/ContainersScreen';
import MedicinesScreen, { Medicine } from './src/screens/MedicinesScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import UpcomingSchedulesScreen from './src/screens/UpcomingSchedulesScreen';
import { AuthUser, getSession, clearSession } from './src/services/auth';
import { deviceApi, medicineApi, scheduleApi, ApiDevice, ApiSchedule } from './src/services/api';

// Re-export the API types under the names the screens already use
export type Device   = ApiDevice;
export type Schedule = ApiSchedule;

type Screen =
  | 'login' | 'register' | 'home'
  | 'devices' | 'containers' | 'medicines'
  | 'schedules' | 'upcoming_schedules';

export default function App() {
  const [screen, setScreen]         = useState<Screen>('login');
  const [user, setUser]             = useState<AuthUser | null>(null);

  // Global data state — single source of truth
  const [devices, setDevices]       = useState<Device[]>([]);
  const [medicines, setMedicines]   = useState<Medicine[]>([]);
  const [schedules, setSchedules]   = useState<Schedule[]>([]);

  // Boot loading vs screen-level operation loading
  const [booting, setBooting]       = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError]   = useState<string | null>(null);

  // ── Boot: restore session ─────────────────────────────────────────────────
  useEffect(() => {
    getSession().then(saved => {
      if (saved) {
        setUser(saved);
        setScreen('home');
      }
      setBooting(false);
    });
  }, []);

  // ── Load all data from API whenever we reach the home screen ─────────────
  const refreshAll = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [devs, meds, scheds] = await Promise.all([
        deviceApi.list(),
        medicineApi.list(),
        scheduleApi.list(),
      ]);
      setDevices(devs);
      setMedicines(meds as unknown as Medicine[]);
      setSchedules(scheds);
    } catch (e: any) {
      setDataError(e?.message ?? 'Failed to load data. Is the server running?');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (screen === 'home') refreshAll();
  }, [screen, refreshAll]);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLoginSuccess = (authUser: AuthUser) => {
    setUser(authUser);
    setScreen('home');
  };

  const handleLogout = async () => {
    await clearSession();
    setUser(null);
    setDevices([]);
    setMedicines([]);
    setSchedules([]);
    setScreen('login');
  };

  // ── Device CRUD ───────────────────────────────────────────────────────────
  const handleDevicesChange = useCallback(async (next: Device[]) => {
    // App.tsx receives the already-mutated array from DevicesScreen after
    // the screen calls the API itself. We just sync state + refresh to be safe.
    setDevices(next);
  }, []);

  const handleMedicinesChange = useCallback(async (next: Medicine[]) => {
    setMedicines(next);
  }, []);

  const handleSchedulesChange = useCallback(async (next: Schedule[]) => {
    setSchedules(next);
  }, []);

  // ── Boot splash ───────────────────────────────────────────────────────────
  if (booting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <>
      {screen === 'login' && (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onNavigateToRegister={() => setScreen('register')}
        />
      )}

      {screen === 'register' && (
        <SignupScreen
          onRegisterSuccess={handleLoginSuccess}
          onNavigateToLogin={() => setScreen('login')}
        />
      )}

      {screen === 'home' && user && (
        <DashboardScreen
          userName={user.name}
          onLogout={handleLogout}
          onNavigate={(target) => setScreen(target as Screen)}
          dataLoading={dataLoading}
          dataError={dataError}
        />
      )}

      {screen === 'devices' && (
        <DevicesScreen
          devices={devices}
          medicines={medicines}
          schedules={schedules}
          onDevicesChange={handleDevicesChange}
          onMedicinesChange={handleMedicinesChange}
          onSchedulesChange={handleSchedulesChange}
          onBack={() => { setScreen('home'); }}
          onRefresh={refreshAll}
        />
      )}

      {screen === 'containers' && (
        <ContainersScreen
          devices={devices}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'medicines' && (
        <MedicinesScreen
          devices={devices}
          medicines={medicines}
          schedules={schedules}
          onMedicinesChange={handleMedicinesChange}
          onSchedulesChange={handleSchedulesChange}
          onBack={() => { setScreen('home'); }}
          onRefresh={refreshAll}
        />
      )}

      {screen === 'schedules' && (
        <ScheduleScreen
          devices={devices}
          medicines={medicines}
          schedules={schedules}
          onSchedulesChange={handleSchedulesChange}
          onMedicinesChange={handleMedicinesChange}
          onBack={() => { setScreen('home'); }}
          onViewUpcoming={() => setScreen('upcoming_schedules')}
          onRefresh={refreshAll}
        />
      )}

      {screen === 'upcoming_schedules' && (
        <UpcomingSchedulesScreen
          devices={devices}
          medicines={medicines}
          schedules={schedules}
          onBack={() => setScreen('schedules')}
        />
      )}

      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0FDFA' },
});
