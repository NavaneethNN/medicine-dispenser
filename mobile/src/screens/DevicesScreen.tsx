import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  fetchDevices,
  createDevice,
  renameDevice,
  deleteDevice,
  Device as DeviceType,
} from '../services/device';

interface DevicesScreenProps {
  onBack: () => void;
}

const formatLastSync = (iso: string | null): string => {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export default function DevicesScreen({ onBack }: DevicesScreenProps) {
  const [devices, setDevices] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DeviceType | null>(null);
  const [newName, setNewName] = useState('');
  const [newUid, setNewUid] = useState('');
  const [renameName, setRenameName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const data = await fetchDevices();
      setDevices(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load devices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDevices();
  };

  const handleAddDevice = async () => {
    if (!newName.trim() || !newUid.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      const device = await createDevice({ name: newName.trim(), deviceUid: newUid.trim() });
      setDevices([...devices, device]);
      setNewName('');
      setNewUid('');
      setShowAddModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRename = (device: DeviceType) => {
    setRenameTarget(device);
    setRenameName(device.name);
    setShowRenameModal(true);
  };

  const confirmRename = async () => {
    if (!renameName.trim()) {
      Alert.alert('Error', 'Please enter a device name');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await renameDevice(renameTarget!.id, renameName.trim());
      setDevices(devices.map(d => d.id === updated.id ? updated : d));
      setShowRenameModal(false);
      setRenameTarget(null);
      setRenameName('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to rename device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = (device: DeviceType) => {
    Alert.alert(
      'Remove Device',
      `Are you sure you want to remove "${device.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDevice(device.id);
              setDevices(devices.filter(d => d.id !== device.id));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove device');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Devices</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} activeOpacity={0.7} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : devices.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No devices yet</Text>
          <Text style={styles.emptyDesc}>Tap "Add" to pair your first dispenser</Text>
        </View>
      ) : (
        <View style={styles.deviceList}>
          {devices.map((device) => (
            <View key={device.id} style={styles.deviceCard}>
              <View style={styles.deviceCardHeader}>
                <View style={styles.deviceCardLeft}>
                  <View style={styles.deviceIconBox}>
                    <Text style={styles.deviceIcon}>D</Text>
                  </View>
                  <View>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceUid}>{device.deviceUid}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, device.status === 'online' ? styles.statusOnline : styles.statusOffline]}>
                  <View style={[styles.statusDot, device.status === 'online' ? styles.dotOnline : styles.dotOffline]} />
                  <Text style={[styles.statusText, device.status === 'online' ? styles.statusTextOnline : styles.statusTextOffline]}>
                    {device.status === 'online' ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>

              <View style={styles.deviceDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Firmware</Text>
                  <Text style={styles.detailValue}>{device.firmwareVersion}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Last Sync</Text>
                  <Text style={styles.detailValue}>{formatLastSync(device.lastSync)}</Text>
                </View>
              </View>

              <View style={styles.deviceActions}>
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => handleRename(device)}>
                  <Text style={styles.actionBtnText}>Rename</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} activeOpacity={0.7} onPress={() => handleRemove(device)}>
                  <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add Device Modal */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Device</Text>
            <Text style={styles.modalSubtitle}>Pair a new dispenser to your account</Text>

            <Text style={styles.inputLabel}>Device Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kitchen Dispenser"
              placeholderTextColor="#9CA3AF"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.inputLabel}>Device UID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. MD-2024-003"
              placeholderTextColor="#9CA3AF"
              value={newUid}
              onChangeText={setNewUid}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} activeOpacity={0.7} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} activeOpacity={0.7} onPress={handleAddDevice} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalConfirmText}>Add Device</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Device</Text>
            <Text style={styles.modalSubtitle}>Enter a new name for "{renameTarget?.name}"</Text>

            <Text style={styles.inputLabel}>New Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Bedroom Dispenser"
              placeholderTextColor="#9CA3AF"
              value={renameName}
              onChangeText={setRenameName}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} activeOpacity={0.7} onPress={() => setShowRenameModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} activeOpacity={0.7} onPress={confirmRename} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalConfirmText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 24,
  },
  backBtn: {
    paddingVertical: 6,
  },
  backText: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  addBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  deviceList: {
    gap: 14,
 },
  deviceCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  deviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deviceIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIMARY,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  deviceUid: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusOnline: {
    backgroundColor: '#D1FAE5',
  },
  statusOffline: {
    backgroundColor: '#FEE2E2',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusTextOnline: {
    color: '#059669',
  },
  statusTextOffline: {
    color: '#DC2626',
  },
  deviceDetails: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 16,
  },
  detailItem: {
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
  deviceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  actionBtnDanger: {
    backgroundColor: '#FEE2E2',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  actionBtnTextDanger: {
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_DARK,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: TEXT_DARK,
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: PRIMARY,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
