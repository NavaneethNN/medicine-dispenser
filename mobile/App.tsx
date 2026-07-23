import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { AuthUser } from './src/services/auth';

type Screen = 'login' | 'register' | 'home';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<AuthUser | null>(null);

  const handleLoginSuccess = (authUser: AuthUser) => {
    setUser(authUser);
    setScreen('home');
  };

  const handleRegisterSuccess = (authUser: AuthUser) => {
    setUser(authUser);
    setScreen('home');
  };

  const handleLogout = () => {
    setUser(null);
    setScreen('login');
  };

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
        <DashboardScreen userName={user.name} onLogout={handleLogout} />
      )}
      <StatusBar style="dark" />
    </>
  );
}
