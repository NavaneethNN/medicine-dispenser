import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import ContainersScreen from './src/screens/ContainersScreen';
import MedicinesScreen, { Medicine } from './src/screens/MedicinesScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import UpcomingSchedulesScreen from './src/screens/UpcomingSchedulesScreen';
import { AuthUser, getSession, clearSession } from './src/services/auth';
import {
  Device,
  Schedule,
  loadDevices,  saveDevices,
  loadMedicines, saveMedicines,
  loadSchedules, saveSchedules,
} from './src/services/storage';

type Screen = 'login' | 'register' | 'home' | 'devices' | 'containers' | 'medicines' | 'schedules' | 'upcoming_schedules';

export default function App() {
  const [screen, setScreen]           = useState<Screen>('login');
  const [user, setUser]               = useState<AuthUser | null>(null);
  const [loading, setLoading]         = useState(true);
  const [devices, setDevicesRaw]      = useState<Device[]>([]);
  const [medicines, setMedicinesRaw]  = useState<Medicine[]>([]);
  const [schedules, setSchedulesRaw]  = useState<Schedule[]>([]);

  // ── Boot: restore session + load all persisted data ───────────────────────
  useEffect(() => {
    (async () => {
      const [savedUser, savedDevices, savedMedicines, savedSchedules] = await Promise.all([
        getSession(),
        loadDevices(),
        loadMedicines(),
        loadSchedules(),
      ]);

      setDevicesRaw(savedDevices);
      setMedicinesRaw(savedMedicines);
      setSchedulesRaw(savedSchedules);

      if (savedUser) {
        setUser(savedUser);
        setScreen('home');
      }
      setLoading(false);
    })();
  }, []);

  // ── Persisting wrappers ───────────────────────────────────────────────────
  const setDevices = useCallback((next: Device[]) => {
    setDevicesRaw(next);
    saveDevices(next);
  }, []);

  const setMedicines = useCallback((next: Medicine[]) => {
    setMedicinesRaw(next);
    saveMedicines(next);
  }, []);

  const setSchedules = useCallback((next: Schedule[]) => {
    setSchedulesRaw(next);
    saveSchedules(next);
  }, []);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLoginSuccess = (authUser: AuthUser) => {
    setUser(authUser);
    setScreen('home');
  };

  const handleRegisterSuccess = (authUser: AuthUser) => {
    setUser(authUser);
    setScreen('home');
  };

  const handleLogout = async () => {
    await clearSession();
    setUser(null);
    setScreen('login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
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
          onRegisterSuccess={handleRegisterSuccess}
          onNavigateToLogin={() => setScreen('login')}
        />
      )}
      {screen === 'home' && user && (
        <DashboardScreen
          userName={user.name}
          onLogout={handleLogout}
          onNavigate={(target) => setScreen(target as Screen)}
        />
      )}
      {screen === 'devices' && (
        <DevicesScreen
          devices={devices}
          medicines={medicines}
          schedules={schedules}
          onDevicesChange={setDevices}
          onMedicinesChange={setMedicines}
          onSchedulesChange={setSchedules}
          onBack={() => setScreen('home')}
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
          onMedicinesChange={setMedicines}
          onSchedulesChange={setSchedules}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'schedules' && (
        <ScheduleScreen
          devices={devices}
          medicines={medicines}
          schedules={schedules}
          onSchedulesChange={setSchedules}
          onMedicinesChange={setMedicines}
          onBack={() => setScreen('home')}
          onViewUpcoming={() => setScreen('upcoming_schedules')}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
  },
});
