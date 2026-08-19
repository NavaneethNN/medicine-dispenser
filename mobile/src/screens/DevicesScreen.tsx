import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { deviceApi, medicineApi, scheduleApi, ApiDevice } from '../services/api';
import { Schedule } from '../services/storage';
import Icon from '../components/Icon';

// ─── Types ────────────────────────────────────────────────────────────────────
type Device = ApiDevice;

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
  onDevicesChange: (d: Device[]) => void;
  onMedicinesChange: (m: Medicine[]) => void;
  onSchedulesChange: (s: Schedule[]) => void;
  onBack: () => void;
  onRefresh: () => Promise<void>;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY    = '#0D9488';
const BG         = '#F8FAFC';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER     = '#E2E8F0';

// ─── Error Banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText} numberOfLines={3}>{msg}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.errorBannerDismiss}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DevicesScreen({
  devices, medicines, schedules,
  onDevicesChange, onMedicinesChange, onSchedulesChange,
  onBack, onRefresh,
}: DevicesScreenProps) {

  const [busy, setBusy]                   = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const [showAddModal, setShowAddModal]   = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [newName, setNewName]             = useState('');
  const [newUid, setNewUid]               = useState('');
  const [newCartridgeCount, setNewCartridgeCount] = useState(4);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget]   = useState<Device | null>(null);
  const [renameName, setRenameName]       = useState('');

  const [deleteTarget, setDeleteTarget]   = useState<Device | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  // ── Add ──────────────────────────────────────────────────────────────────
  const handleAddDevice = () => {
    if (!newName.trim() || !newUid.trim()) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    setShowAddConfirm(true);
  };

  const confirmAddDevice = () => withBusy(async () => {
    await deviceApi.create({
      name: newName.trim(),
      deviceUid: newUid.trim(),
      cartridgeCount: newCartridgeCount,
      firmwareVersion: 'v2.1.0',
      status: 'online',
      lastSync: 'Just now',
    });
    setNewName(''); setNewUid(''); setNewCartridgeCount(4);
    setShowAddConfirm(false); setShowAddModal(false);
    await onRefresh();
  });

  // ── Rename ───────────────────────────────────────────────────────────────
  const handleRename = (device: Device) => {
    setRenameTarget(device);
    setRenameName(device.name);
    setShowRenameModal(true);
  };

  const confirmRename = () => withBusy(async () => {
    if (!renameName.trim()) { Alert.alert('Error', 'Please enter a device name'); return; }
    await deviceApi.update(renameTarget!.id, { name: renameName.trim() });
    setShowRenameModal(false); setRenameTarget(null); setRenameName('');
    await onRefresh();
  });

  // ── Delete ───────────────────────────────────────────────────────────────
  const confirmDelete = () => withBusy(async () => {
    await deviceApi.delete(deleteTarget!.id);
    setDeleteTarget(null);
    await onRefresh();
  });

  return (
    <SafeAreaView style={styles.safe}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={PRIMARY} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Devices</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} activeOpacity={0.7} style={styles.addBtn}>
          <Icon name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Error banner */}
      {error && <ErrorBanner msg={error} onDismiss={() => setError(null)} />}

      {/* Global busy overlay */}
      {busy && (
        <View style={styles.busyRow}>
          <ActivityIndicator color={PRIMARY} size="small" />
          <Text style={styles.busyText}>Saving…</Text>
        </View>
      )}

      {/* Device list */}
      {devices.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No devices yet</Text>
          <Text style={styles.emptyDesc}>Tap "+ Add" to pair your first dispenser</Text>
        </View>
      ) : (
        <View style={styles.deviceList}>
          {devices.map(device => {
            const linkedMeds = medicines.filter(m => m.deviceId === device.id);
            const linkedMedIds = new Set(linkedMeds.map(m => m.id));
            const linkedScheds = schedules.filter(
              s => s.deviceId === device.id || linkedMedIds.has(s.medicineId)
            );
            return (
              <View key={device.id} style={styles.deviceCard}>
                <View style={styles.deviceCardHeader}>
                  <View style={styles.deviceCardLeft}>
                    <View style={styles.deviceIconBox}>
                      <Icon name="hardware-chip-outline" size={20} color={PRIMARY} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deviceName} numberOfLines={1}>{device.name}</Text>
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
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} activeOpacity={0.7} onPress={() => setDeleteTarget(device)}>
                    <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── ADD MODAL ────────────────────────────────────────────────────── */}
      <Modal visible={showAddModal && !showAddConfirm} transparent animationType="fade"
        onRequestClose={() => { setShowAddModal(false); setNewCartridgeCount(4); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Device</Text>
            <Text style={styles.modalSubtitle}>Pair a new dispenser to your account</Text>

            <Text style={styles.inputLabel}>Device Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Kitchen Dispenser"
              placeholderTextColor="#9CA3AF" value={newName} onChangeText={setNewName} />

            <Text style={styles.inputLabel}>Device UID</Text>
            <TextInput style={styles.input} placeholder="e.g. MD-2024-003"
              placeholderTextColor="#9CA3AF" value={newUid} onChangeText={setNewUid}
              autoCapitalize="characters" />

            <Text style={styles.inputLabel}>Number of Cartridges</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[styles.stepperBtn, newCartridgeCount <= 3 && styles.stepperBtnDisabled]}
                activeOpacity={newCartridgeCount <= 3 ? 1 : 0.7}
                onPress={() => newCartridgeCount > 3 && setNewCartridgeCount(c => c - 1)}>
                <Text style={[styles.stepperBtnText, newCartridgeCount <= 3 && styles.stepperBtnTextDisabled]}>−</Text>
              </TouchableOpacity>
              <View style={styles.stepperValue}>
                <Text style={styles.stepperValueText}>{newCartridgeCount}</Text>
              </View>
              <TouchableOpacity
                style={[styles.stepperBtn, newCartridgeCount >= 9 && styles.stepperBtnDisabled]}
                activeOpacity={newCartridgeCount >= 9 ? 1 : 0.7}
                onPress={() => newCartridgeCount < 9 && setNewCartridgeCount(c => c + 1)}>
                <Text style={[styles.stepperBtnText, newCartridgeCount >= 9 && styles.stepperBtnTextDisabled]}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.stepperHelper}>Select how many cartridges (3–9). Cannot be changed later.</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} activeOpacity={0.7}
                onPress={() => { setShowAddModal(false); setNewCartridgeCount(4); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} activeOpacity={0.7} onPress={handleAddDevice}>
                <Text style={styles.modalConfirmText}>Add Device</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── CONFIRM ADD ───────────────────────────────────────────────────── */}
      <Modal visible={showAddConfirm} transparent animationType="fade"
        onRequestClose={() => setShowAddConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.confirmIconBox}>
              <Icon name="checkmark-circle" size={32} color={PRIMARY} />
            </View>
            <Text style={styles.modalTitleCenter}>Confirm Device Setup</Text>
            <Text style={styles.confirmMessage}>
              You're about to add a device with{' '}
              <Text style={styles.confirmHighlight}>{newCartridgeCount} medicine cartridges</Text>.
            </Text>
            <View style={styles.confirmWarningBox}>
              <Icon name="warning-outline" size={16} color="#D97706" />
              <Text style={styles.confirmWarningText}>The number of cartridges cannot be changed after creation.</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} activeOpacity={0.7} onPress={() => setShowAddConfirm(false)}>
                <Text style={styles.modalCancelText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, busy && styles.btnDisabled]}
                activeOpacity={busy ? 1 : 0.7} onPress={confirmAddDevice}>
                {busy
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalConfirmText}>Confirm & Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── RENAME MODAL ─────────────────────────────────────────────────── */}
      <Modal visible={showRenameModal} transparent animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Device</Text>
            <Text style={styles.modalSubtitle}>Enter a new name for "{renameTarget?.name}"</Text>
            <Text style={styles.inputLabel}>New Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Bedroom Dispenser"
              placeholderTextColor="#9CA3AF" value={renameName} onChangeText={setRenameName} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} activeOpacity={0.7} onPress={() => setShowRenameModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, busy && styles.btnDisabled]}
                activeOpacity={busy ? 1 : 0.7} onPress={confirmRename}>
                {busy
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalConfirmText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DELETE MODAL ─────────────────────────────────────────────────── */}
      <Modal visible={!!deleteTarget} transparent animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.deleteIconBox}>
              <Icon name="trash-outline" size={28} color="#DC2626" />
            </View>
            <Text style={styles.modalTitleCenter}>Delete Device?</Text>
            <Text style={styles.deleteMessage}>
              This will permanently remove{' '}
              <Text style={styles.deleteHighlight}>{deleteTarget?.name}</Text>.
            </Text>
            {deleteTarget && (() => {
              const lm = medicines.filter(m => m.deviceId === deleteTarget.id);
              const lmIds = new Set(lm.map(m => m.id));
              const ls = schedules.filter(s => s.deviceId === deleteTarget.id || lmIds.has(s.medicineId));
              if (!lm.length && !ls.length) return null;
              return (
                <View style={styles.deleteWarningBox}>
                  <Icon name="warning-outline" size={15} color="#D97706" />
                  <View>
                    <Text style={styles.deleteWarningTitle}>This will also delete:</Text>
                    {lm.length > 0 && <Text style={styles.deleteWarningItem}>• {lm.length} medicine{lm.length !== 1 ? 's' : ''}</Text>}
                    {ls.length > 0 && <Text style={styles.deleteWarningItem}>• {ls.length} schedule{ls.length !== 1 ? 's' : ''}</Text>}
                  </View>
                </View>
              );
            })()}
            <Text style={styles.deleteUndoneText}>This action cannot be undone.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} activeOpacity={0.7} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteConfirmBtn, busy && styles.btnDisabled]}
                activeOpacity={busy ? 1 : 0.7} onPress={confirmDelete}>
                {busy
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.deleteConfirmText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BG },
  safe:        { flex: 1, backgroundColor: BG },
  content:     { padding: 20, paddingBottom: 40 },
  header:      { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingRight: 8, minWidth: 70 },
  backText:    { fontSize: 15, color: PRIMARY, fontWeight: '600', marginLeft: 2 },
  title:       { flex: 1, fontSize: 20, fontWeight: '700', color: TEXT_DARK, textAlign: 'center' },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: 70, justifyContent: 'center' },
  addBtnText:  { color: '#fff', fontSize: 14, fontWeight: '600' },

  errorBanner:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 12, gap: 8 },
  errorBannerText:    { flex: 1, fontSize: 13, color: '#DC2626', fontWeight: '500' },
  errorBannerDismiss: { fontSize: 14, color: '#DC2626', fontWeight: '700', paddingHorizontal: 4 },

  busyRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  busyText:  { fontSize: 13, color: TEXT_MUTED },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: TEXT_DARK, marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: TEXT_MUTED, textAlign: 'center' },

  deviceList: { gap: 14 },
  deviceCard: { backgroundColor: CARD_BG, borderRadius: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  deviceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  deviceCardLeft:   { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  deviceIconBox:    { width: 44, height: 44, borderRadius: 12, backgroundColor: PRIMARY + '15', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 },
  deviceName:       { fontSize: 16, fontWeight: '600', color: TEXT_DARK },
  deviceUid:        { fontSize: 13, color: TEXT_MUTED, marginTop: 2 },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexShrink: 0 },
  statusOnline:     { backgroundColor: '#D1FAE5' },
  statusOffline:    { backgroundColor: '#FEE2E2' },
  statusDot:        { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  dotOnline:        { backgroundColor: '#10B981' },
  dotOffline:       { backgroundColor: '#EF4444' },
  statusText:       { fontSize: 12, fontWeight: '600' },
  statusTextOnline: { color: '#059669' },
  statusTextOffline:{ color: '#DC2626' },
  deviceDetails:    { flexDirection: 'row', gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 14 },
  detailItem:       { flex: 1 },
  detailLabel:      { fontSize: 11, color: TEXT_MUTED, marginBottom: 3 },
  detailValue:      { fontSize: 13, fontWeight: '600', color: TEXT_DARK },
  deviceActions:    { flexDirection: 'row', gap: 10 },
  actionBtn:        { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#F3F4F6' },
  actionBtnDanger:  { backgroundColor: '#FEE2E2' },
  actionBtnText:    { fontSize: 14, fontWeight: '600', color: TEXT_DARK },
  actionBtnTextDanger: { color: '#DC2626' },

  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalCard:        { backgroundColor: CARD_BG, borderRadius: 20, padding: 22 },
  modalTitle:       { fontSize: 19, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  modalSubtitle:    { fontSize: 13, color: TEXT_MUTED, marginBottom: 18 },
  modalTitleCenter: { fontSize: 19, fontWeight: '700', color: TEXT_DARK, textAlign: 'center', marginBottom: 10 },
  inputLabel:       { fontSize: 13, fontWeight: '600', color: TEXT_DARK, marginBottom: 6, marginTop: 8 },
  input:            { borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: TEXT_DARK, backgroundColor: '#F9FAFB', marginBottom: 4 },
  modalActions:     { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: '#F3F4F6' },
  modalCancelText:  { fontSize: 15, fontWeight: '600', color: TEXT_MUTED },
  modalConfirmBtn:  { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: PRIMARY },
  modalConfirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  btnDisabled:      { opacity: 0.65 },

  stepperRow:           { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, backgroundColor: '#F9FAFB', overflow: 'hidden', marginBottom: 6 },
  stepperBtn:           { width: 52, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY },
  stepperBtnDisabled:   { backgroundColor: '#E5E7EB' },
  stepperBtnText:       { fontSize: 22, fontWeight: '600', color: '#fff', lineHeight: 26 },
  stepperBtnTextDisabled:{ color: '#9CA3AF' },
  stepperValue:         { flex: 1, alignItems: 'center', paddingVertical: 13 },
  stepperValueText:     { fontSize: 20, fontWeight: '700', color: TEXT_DARK },
  stepperHelper:        { fontSize: 12, color: TEXT_MUTED, marginBottom: 14, lineHeight: 17 },

  confirmIconBox:     { width: 60, height: 60, borderRadius: 30, backgroundColor: PRIMARY + '20', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  confirmMessage:     { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 21, marginBottom: 14 },
  confirmHighlight:   { color: PRIMARY, fontWeight: '700' },
  confirmWarningBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderLeftWidth: 3, borderLeftColor: '#F59E0B', borderRadius: 10, padding: 12, marginBottom: 18 },
  confirmWarningText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17, fontWeight: '500' },

  deleteIconBox:     { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  deleteMessage:     { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 21, marginBottom: 12 },
  deleteHighlight:   { color: TEXT_DARK, fontWeight: '700' },
  deleteWarningBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderLeftWidth: 3, borderLeftColor: '#F59E0B', borderRadius: 10, padding: 11, marginBottom: 10 },
  deleteWarningTitle:{ fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 3 },
  deleteWarningItem: { fontSize: 12, color: '#92400E', lineHeight: 18 },
  deleteUndoneText:  { fontSize: 12, color: TEXT_MUTED, textAlign: 'center', marginBottom: 16, fontStyle: 'italic' },
  deleteConfirmBtn:  { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: '#DC2626' },
  deleteConfirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
