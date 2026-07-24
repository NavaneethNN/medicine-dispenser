import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface DashboardScreenProps {
  userName: string;
  onLogout: () => void;
  onNavigate: (screen: string) => void;
}

const menuItems = [
  { key: 'devices', label: 'Devices', desc: 'Manage your dispenser devices', icon: 'D' },
  { key: 'medicines', label: 'Medicines', desc: 'View and manage medicine library', icon: 'M' },
  { key: 'schedules', label: 'Schedule', desc: 'Create and view dispensing schedules', icon: 'S' },
  { key: 'containers', label: 'Configured', desc: 'Configure medicine containers', icon: 'C' },
];

export default function DashboardScreen({ userName, onLogout, onNavigate }: DashboardScreenProps) {
  const handleNavigate = (key: string) => {
    onNavigate(key);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <View>
            <Text style={styles.appName}>Medi Dispenser</Text>
            <Text style={styles.greeting}>Welcome, {userName || 'Caregiver'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onLogout} activeOpacity={0.7} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.menuCard}
            activeOpacity={0.7}
            onPress={() => handleNavigate(item.key)}
          >
            <View style={styles.menuIconBox}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <View style={styles.menuBody}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const PRIMARY = '#0D9488';
const BG = '#F0FDFA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#111827';
const TEXT_MUTED = '#6B7280';
const BORDER = '#E5E7EB';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  greeting: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  menuContainer: {
    gap: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY,
  },
  menuBody: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  chevron: {
    fontSize: 24,
    color: '#D1D5DB',
    fontWeight: '300',
  },
});
