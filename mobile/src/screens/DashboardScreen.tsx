import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface DashboardScreenProps {
  userName: string;
  onLogout: () => void;
}

export default function DashboardScreen({ userName, onLogout }: DashboardScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>Medi Dispenser</Text>
        <Text style={styles.greeting}>Welcome, {userName || 'Caregiver'}</Text>
        <Text style={styles.subtitle}>
          Your dashboard is being prepared. Manage devices, medicines and schedules here soon.
        </Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={onLogout} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const PRIMARY = '#0D9488';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 12,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#E11D48',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
