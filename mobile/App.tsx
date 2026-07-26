import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import ContainersScreen from './src/screens/ContainersScreen';
import MedicinesScreen, { Medicine } from './src/screens/MedicinesScreen';
import { AuthUser, getSession, clearSession } from './src/services/auth';
import {
  Device,
  loadDevices,
  saveDevices,
  loadMedicines,
  saveMedicines,
} from './src/services/storage';

type Screen = 'login' | 'register' | 'home' | 'devices' | 'containers' | 'medicines';

export default function App() {
  const [screen, setScreen]     = useState<Screen>('login');
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [loading, setLoading]   = useState(true);
  const [devices, setDevicesRaw]     = useState<Device[]>([]);
  const [medicines, setMedicinesRaw] = useState<Medicine[]>([]);

  // ── Boot: restore session + load persisted data ──────────────────────────
  useEffect(() => {
    (async () => {
      const [savedUser, savedDevices, savedMedicines] = await Promise.all([
        getSession(),
        loadDevices(),
        loadMedicines(),
      ]);

      setDevicesRaw(savedDevices);
      setMedicinesRaw(savedMedicines);

      if (savedUser) {
        setUser(savedUser);
        setScreen('home');
      }

      setLoading(false);
    })();
  }, []);

  // ── Wrappers that update state AND persist to AsyncStorage ───────────────
  const setDevices = useCallback((next: Device[]) => {
    setDevicesRaw(next);
    saveDevices(next);          // fire-and-forget; errors logged inside saveDevices
  }, []);

  const setMedicines = useCallback((next: Medicine[]) => {
    setMedicinesRaw(next);
    saveMedicines(next);
  }, []);

  // ── Auth handlers ────────────────────────────────────────────────────────
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

  // ── Loading splash ───────────────────────────────────────────────────────
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
          onDevicesChange={setDevices}
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
          onMedicinesChange={setMedicines}
          onBack={() => setScreen('home')}
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
