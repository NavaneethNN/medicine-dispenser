import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';

interface DashboardScreenProps {
  userName: string;
  onLogout: () => void;
}

interface ScheduleItem {
  id: string;
  medicineName: string;
  time: string;
  quantity: number;
  beforeFood: boolean;
  status: 'pending' | 'dispensed' | 'missed';
}

const mockSchedules: ScheduleItem[] = [
  { id: '1', medicineName: 'Metformin', time: '08:00 AM', quantity: 1, beforeFood: false, status: 'dispensed' },
  { id: '2', medicineName: 'Atorvastatin', time: '10:00 AM', quantity: 1, beforeFood: true, status: 'pending' },
  { id: '3', medicineName: 'Omeprazole', time: '01:00 PM', quantity: 1, beforeFood: true, status: 'pending' },
  { id: '4', medicineName: 'Vitamin D3', time: '06:00 PM', quantity: 2, beforeFood: false, status: 'pending' },
  { id: '5', medicineName: 'Aspirin', time: '09:00 PM', quantity: 1, beforeFood: false, status: 'pending' },
];

const statusColors: Record<ScheduleItem['status'], string> = {
  pending: '#F59E0B',
  dispensed: '#10B981',
  missed: '#EF4444',
};

const statusLabels: Record<ScheduleItem['status'], string> = {
  pending: 'Pending',
  dispensed: 'Dispensed',
  missed: 'Missed',
};

const stockData = [
  { name: 'Metformin', stock: 24, max: 30, color: '#10B981' },
  { name: 'Atorvastatin', stock: 8, max: 30, color: '#F59E0B' },
  { name: 'Omeprazole', stock: 3, max: 30, color: '#EF4444' },
  { name: 'Vitamin D3', stock: 15, max: 30, color: '#10B981' },
  { name: 'Aspirin', stock: 20, max: 30, color: '#10B981' },
];

export default function DashboardScreen({ userName, onLogout }: DashboardScreenProps) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const dispensedCount = mockSchedules.filter(s => s.status === 'dispensed').length;
  const pendingCount = mockSchedules.filter(s => s.status === 'pending').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
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

      {/* Device Status Card */}
      <View style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>Living Room Dispenser</Text>
            <Text style={styles.deviceId}>Device ID: MD-2024-001</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>
        <View style={styles.deviceDetails}>
          <View style={styles.deviceDetailItem}>
            <Text style={styles.detailLabel}>Firmware</Text>
            <Text style={styles.detailValue}>v2.1.0</Text>
          </View>
          <View style={styles.deviceDetailItem}>
            <Text style={styles.detailLabel}>Last Sync</Text>
            <Text style={styles.detailValue}>2 min ago</Text>
          </View>
          <View style={styles.deviceDetailItem}>
            <Text style={styles.detailLabel}>Next Dispense</Text>
            <Text style={styles.detailValue}>10:00 AM</Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Total{'\n'}Medicines</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{mockSchedules.length}</Text>
          <Text style={styles.statLabel}>Today's{'\n'}Schedules</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{dispensedCount}</Text>
          <Text style={styles.statLabel}>Dispensed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
      </View>

      {/* Stock Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Remaining Stock</Text>
        <View style={styles.stockCard}>
          {stockData.map((item, index) => (
            <View key={index} style={styles.stockItem}>
              <View style={styles.stockInfo}>
                <Text style={styles.stockName}>{item.name}</Text>
                <Text style={styles.stockCount}>{item.stock}/{item.max} tablets</Text>
              </View>
              <View style={styles.stockBarBg}>
                <View
                  style={[
                    styles.stockBarFill,
                    {
                      width: `${(item.stock / item.max) * 100}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Today's Schedule */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <Text style={styles.scheduleCount}>{mockSchedules.length} items</Text>
        </View>
        {mockSchedules.map((item) => (
          <View key={item.id} style={styles.scheduleCard}>
            <View style={styles.scheduleLeft}>
              <View style={[styles.scheduleTimeIcon, { borderColor: statusColors[item.status] }]}>
                <Text style={[styles.scheduleTimeText, { color: statusColors[item.status] }]}>
                  {item.time}
                </Text>
              </View>
            </View>
            <View style={styles.scheduleBody}>
              <Text style={styles.scheduleMedName}>{item.medicineName}</Text>
              <Text style={styles.scheduleMeta}>
                {item.quantity} tablet(s) - {item.beforeFood ? 'Before Food' : 'After Food'}
              </Text>
            </View>
            <View style={[styles.scheduleStatusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
              <Text style={[styles.scheduleStatusText, { color: statusColors[item.status] }]}>
                {statusLabels[item.status]}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.7}>
            <Text style={styles.quickActionIcon}>+</Text>
            <Text style={styles.quickActionLabel}>Add Device</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.7}>
            <Text style={styles.quickActionIcon}>+</Text>
            <Text style={styles.quickActionLabel}>Add Medicine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.7}>
            <Text style={styles.quickActionIcon}>+</Text>
            <Text style={styles.quickActionLabel}>Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Medi Dispenser - Smart care, right on time.</Text>
      </View>
    </ScrollView>
  );
}

const PRIMARY = '#0D9488';
const PRIMARY_DARK = '#0F766E';
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
    marginBottom: 24,
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
  deviceCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  deviceId: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  deviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 16,
  },
  deviceDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleCount: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  stockCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stockItem: {
    marginBottom: 14,
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stockName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  stockCount: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  stockBarBg: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  stockBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleLeft: {
    marginRight: 14,
  },
  scheduleTimeIcon: {
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  scheduleTimeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleBody: {
    flex: 1,
  },
  scheduleMedName: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  scheduleMeta: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  scheduleStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scheduleStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PRIMARY + '30',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
});
