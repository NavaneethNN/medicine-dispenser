import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Schedule } from '../services/storage';

interface Device {
  id: string;
  name: string;
  deviceUid: string;
  cartridgeCount: number;
  firmwareVersion: string;
  status: 'online' | 'offline';
  lastSync: string;
}

interface Medicine {
  id: string;
  deviceId: string;
  cartridgeSlot: number;
  name: string;
  quantity: number;
}

interface DevicesScreenProps {
  devices: Device[];
  medicines: Medicine[];
  schedules: Schedule[];
  onDevicesChange: (devices: Device[]) => void;
  onMedicinesChange: (medicines: Medicine[]) => void;
  onSchedulesChange: (schedules: Schedule[]) => void;
  onBack: () => void;
}

export default function DevicesScreen({
  devices,
  medicines,
  schedules,
  onDevicesChange,
  onMedicinesChange,
  onSchedulesChange,
  onBack,
}: DevicesScreenProps) {
  const setDevices = onDevicesChange;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Device | null>(null);
  const [newName, setNewName] = useState('');
  const [newUid, setNewUid] = useState('');
  const [newCartridgeCount, setNewCartridgeCount] = useState(4);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null);

  const handleAddDevice = () => {
    if (!newName.trim() || !newUid.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setShowAddConfirm(true);
  };

  const confirmAddDevice = () => {
    const device: Device = {
      id: Date.now().toString(),
      name: newName.trim(),
      deviceUid: newUid.trim(),
      cartridgeCount: newCartridgeCount,
      firmwareVersion: 'v2.1.0',
      status: 'online',
      lastSync: 'Just now',
    };
    setDevices([...devices, device]);
    setNewName('');
    setNewUid('');
    setNewCartridgeCount(4);
    setShowAddConfirm(false);
    setShowAddModal(false);
  };

  const handleRename = (device: Device) => {
    setRenameTarget(device);
    setRenameName(device.name);
    setShowRenameModal(true);
  };

  const confirmRename = () => {
    if (!renameName.trim()) {
      Alert.alert('Error', 'Please enter a device name');
      return;
    }
    setDevices(devices.map(d =>
      d.id === renameTarget?.id ? { ...d, name: renameName.trim() } : d
    ));
    setShowRenameModal(false);
    setRenameTarget(null);
    setRenameName('');
  };

  const handleRemove = (device: Device) => {
    setDeleteTarget(device);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const device = deleteTarget;
    const linkedMedicines = medicines.filter(m => m.deviceId === device.id);
    const linkedMedicineIds = new Set(linkedMedicines.map(m => m.id));
    const linkedSchedules = schedules.filter(
      s => s.deviceId === device.id || linkedMedicineIds.has(s.medicineId)
    );
    onDevicesChange(devices.filter(d => d.id !== device.id));
    onMedicinesChange(medicines.filter(m => m.deviceId !== device.id));
    onSchedulesChange(
      schedules.filter(s => s.deviceId !== device.id && !linkedMedicineIds.has(s.medicineId))
    );
    setDeleteTarget(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

      {/* Device List */}
      {devices.length === 0 ? (
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
                  <Text style={styles.detailValue}>{device.lastSync}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Cartridges</Text>
                  <Text style={styles.detailValue}>{device.cartridgeCount}</Text>
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
      <Modal visible={showAddModal && !showAddConfirm} transparent animationType="fade" onRequestClose={() => { setShowAddModal(false); setNewCartridgeCount(4); }}>
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

            <Text style={styles.inputLabel}>Number of Cartridges</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[styles.stepperBtn, newCartridgeCount <= 3 && styles.stepperBtnDisabled]}
                activeOpacity={newCartridgeCount <= 3 ? 1 : 0.7}
                onPress={() => newCartridgeCount > 3 && setNewCartridgeCount(c => c - 1)}
              >
                <Text style={[styles.stepperBtnText, newCartridgeCount <= 3 && styles.stepperBtnTextDisabled]}>−</Text>
              </TouchableOpacity>
              <View style={styles.stepperValue}>
                <Text style={styles.stepperValueText}>{newCartridgeCount}</Text>
              </View>
              <TouchableOpacity
                style={[styles.stepperBtn, newCartridgeCount >= 9 && styles.stepperBtnDisabled]}
                activeOpacity={newCartridgeCount >= 9 ? 1 : 0.7}
                onPress={() => newCartridgeCount < 9 && setNewCartridgeCount(c => c + 1)}
              >
                <Text style={[styles.stepperBtnText, newCartridgeCount >= 6 && styles.stepperBtnTextDisabled]}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.stepperHelper}>Select how many medicine cartridges this dispenser has (3–9). This cannot be changed later.</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} activeOpacity={0.7} onPress={() => { setShowAddModal(false); setNewCartridgeCount(4); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} activeOpacity={0.7} onPress={handleAddDevice}>
                <Text style={styles.modalConfirmText}>Add Device</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Device Modal */}
      <Modal visible={showAddConfirm} transparent animationType="fade" onRequestClose={() => setShowAddConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.confirmIconBox}>
              <Text style={styles.confirmIcon}>✓</Text>
            </View>
            <Text style={styles.modalTitleCenter}>Confirm Device Setup</Text>
            <Text style={styles.confirmMessage}>
              You're about to add a device with <Text style={styles.confirmHighlight}>{newCartridgeCount} medicine cartridges</Text>.
            </Text>
            <View style={styles.confirmWarningBox}>
              <Text style={styles.confirmWarningIcon}>⚠️</Text>
              <Text style={styles.confirmWarningText}>
                The number of cartridges cannot be changed after creation.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} activeOpacity={0.7} onPress={() => setShowAddConfirm(false)}>
                <Text style={styles.modalCancelText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} activeOpacity={0.7} onPress={confirmAddDevice}>
                <Text style={styles.modalConfirmText}>Confirm & Add</Text>
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
              <TouchableOpacity style={styles.modalConfirmBtn} activeOpacity={0.7} onPress={confirmRename}>
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.deleteIconBox}>
              <Text style={styles.deleteIconEmoji}>🗑</Text>
            </View>

            <Text style={styles.modalTitleCenter}>Delete Device?</Text>
            <Text style={styles.deleteMessage}>
              This will permanently remove{' '}
              <Text style={styles.deleteHighlight}>{deleteTarget?.name}</Text>.
            </Text>

            {deleteTarget && (() => {
              const linkedMeds = medicines.filter(m => m.deviceId === deleteTarget.id);
              const linkedMedIds = new Set(linkedMeds.map(m => m.id));
              const linkedScheds = schedules.filter(
                s => s.deviceId === deleteTarget.id || linkedMedIds.has(s.medicineId)
              );
              if (linkedMeds.length === 0 && linkedScheds.length === 0) return null;
              return (
                <View style={styles.deleteWarningBox}>
                  <Text style={styles.deleteWarningIcon}>⚠️</Text>
                  <View>
                    <Text style={styles.deleteWarningTitle}>This will also delete:</Text>
                    {linkedMeds.length > 0 && (
                      <Text style={styles.deleteWarningItem}>
                        • {linkedMeds.length} medicine{linkedMeds.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                    {linkedScheds.length > 0 && (
                      <Text style={styles.deleteWarningItem}>
                        • {linkedScheds.length} schedule{linkedScheds.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })()}

            <Text style={styles.deleteUndoneText}>This action cannot be undone.</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                activeOpacity={0.7}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
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
  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 52,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
  },
  stepperBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  stepperBtnText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  stepperBtnTextDisabled: {
    color: '#9CA3AF',
  },
  stepperValue: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  stepperValueText: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  stepperHelper: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 20,
    lineHeight: 18,
  },
  // Confirmation step
  confirmIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PRIMARY + '20',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  confirmIcon: {
    fontSize: 32,
    color: PRIMARY,
    fontWeight: '700',
  },
  modalTitleCenter: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  confirmHighlight: {
    color: PRIMARY,
    fontWeight: '700',
  },
  confirmWarningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  confirmWarningIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 1,
  },
  confirmWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '500',
  },
  // ── Delete modal ─────────────────────────────────────────────────────────
  deleteIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  deleteIconEmoji: {
    fontSize: 28,
  },
  deleteMessage: {
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 14,
  },
  deleteHighlight: {
    color: TEXT_DARK,
    fontWeight: '700',
  },
  deleteWarningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  deleteWarningIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  deleteWarningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  deleteWarningItem: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },
  deleteUndoneText: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
