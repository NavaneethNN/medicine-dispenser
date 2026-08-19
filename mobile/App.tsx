import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import ContainersScreen from './src/screens/ContainersScreen';
import MedicinesScreen, { Medicine } from './src/screens/MedicinesScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import UpcomingSchedulesScreen from './src/screens/UpcomingSchedulesScreen';
import ManualDispenseScreen from './src/screens/ManualDispenseScreen';
import Preloader from './src/components/Preloader';
import { AuthUser, getSession, clearSession } from './src/services/auth';
import { deviceApi, medicineApi, scheduleApi, ApiDevice, ApiSchedule, AuthError } from './src/services/api';

// Re-export the API types under the names the screens already use
export type Device   = ApiDevice;
export type Schedule = ApiSchedule;

type Screen =
  | 'login' | 'register' | 'home'
  | 'devices' | 'containers' | 'medicines'
  | 'schedules' | 'upcoming_schedules'
  | 'manual_dispense';

export default function App() {
  const [screen, setScreen]         = useState<Screen>('login');
  const [user, setUser]             = useState<AuthUser | null>(null);

  // Global data state — single source of truth
  const [devices, setDevices]       = useState<Device[]>([]);
  const [medicines, setMedicines]   = useState<Medicine[]>([]);
  const [schedules, setSchedules]   = useState<Schedule[]>([]);

  // Preloader state
  const [bootDone, setBootDone]     = useState(false);  // signals Preloader to fade out
  const [showLoader, setShowLoader] = useState(true);   // unmounts Preloader after fade

  // Boot loading vs screen-level operation loading
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError]   = useState<string | null>(null);

  // ── Boot: restore session ─────────────────────────────────────────────────
  useEffect(() => {
    getSession().then(saved => {
      if (saved) {
        setUser(saved);
        setScreen('home');
      }
      // Signal preloader to begin fade-out (minimum 1.2 s so bar looks smooth)
      setTimeout(() => setBootDone(true), 1200);
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
      // 401/403 means the stored token is missing or expired — force re-login
      if (e instanceof AuthError) {
        await clearSession();
        setUser(null);
        setScreen('login');
        setDataError('Your session has expired. Please log in again.');
        return;
      }
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
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: '#F8FAFC' }]}>
      <StatusBar style="dark" />
      
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
          medicines={medicines}
          schedules={schedules}
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

      {screen === 'manual_dispense' && (
        <ManualDispenseScreen
          medicines={medicines}
          devices={devices}
          onBack={() => setScreen('home')}
        />
      )}

      {/* Preloader overlay — sits on top, fades away after boot */}
      {showLoader && (
        <Preloader
          done={bootDone}
          onFinished={() => setShowLoader(false)}
          duration={1400}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
});
