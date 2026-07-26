import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Schedule } from '../services/storage';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY    = '#0D9488';
const BG         = '#F0FDFA';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#111827';
const TEXT_MUTED = '#6B7280';
const BORDER     = '#E5E7EB';

const MEDICINE_COLORS = [
  '#6366F1', '#EC4899', '#F59E0B', '#10B981',
  '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6',
];

function medicineColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return MEDICINE_COLORS[h % MEDICINE_COLORS.length];
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Medicine {
  id: string;
  deviceId: string;
  cartridgeSlot: number;
  name: string;
  quantity: number;
}

interface Device {
  id: string;
  name: string;
  deviceUid: string;
  cartridgeCount: number;
}

interface MedicinesScreenProps {
  devices: Device[];
  medicines: Medicine[];
  schedules: Schedule[];
  onMedicinesChange: (medicines: Medicine[]) => void;
  onSchedulesChange: (schedules: Schedule[]) => void;
  onBack: () => void;
}

const MAX_QUANTITY = 8;

// ─── Quantity Stepper ─────────────────────────────────────────────────────────
function QuantityStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const atMin = value <= 1;
  const atMax = value >= MAX_QUANTITY;
  return (
    <View>
      <View style={s.stepperRow}>
        <TouchableOpacity
          style={[s.stepBtn, atMin && s.stepBtnDisabled]}
          activeOpacity={atMin ? 1 : 0.7}
          onPress={() => !atMin && onChange(value - 1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[s.stepBtnText, atMin && s.stepBtnTextDisabled]}>−</Text>
        </TouchableOpacity>

        <TextInput
          style={s.stepInput}
          keyboardType="numeric"
          value={String(value)}
          onChangeText={v => {
            const n = parseInt(v, 10);
            if (!isNaN(n) && n >= 1 && n <= MAX_QUANTITY) onChange(n);
          }}
        />

        <TouchableOpacity
          style={[s.stepBtn, atMax && s.stepBtnDisabled]}
          activeOpacity={atMax ? 1 : 0.7}
          onPress={() => !atMax && onChange(value + 1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[s.stepBtnText, atMax && s.stepBtnTextDisabled]}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.stepperHint}>Max {MAX_QUANTITY} tablets per cartridge</Text>
    </View>
  );
}

// ─── Medicine Card ────────────────────────────────────────────────────────────
function MedicineCard({ med, onEdit, onDelete }: {
  med: Medicine;
  onEdit: (m: Medicine) => void;
  onDelete: (m: Medicine) => void;
}) {
  const color = medicineColor(med.id);
  const isLow = med.quantity < 10;

  return (
    <View style={s.medCard}>
      <View style={s.medCardTop}>
        <View style={[s.medIcon, { backgroundColor: color + '22' }]}>
          <View style={[s.medIconDot, { backgroundColor: color }]} />
        </View>
        <View style={s.medInfo}>
          <Text style={s.medName} numberOfLines={2}>{med.name}</Text>
          <View style={s.medBadgeRow}>
            <View style={s.cartridgeBadge}>
              <Text style={s.cartridgeBadgeText}>Cartridge {med.cartridgeSlot}</Text>
            </View>
            {isLow && (
              <View style={s.lowStockBadge}>
                <Text style={s.lowStockText}>Low Stock</Text>
              </View>
            )}
          </View>
          <Text style={[s.medQty, isLow && s.medQtyLow]}>
            {med.quantity} tablets left
          </Text>
        </View>
      </View>
      <View style={s.medActions}>
        <TouchableOpacity style={s.editBtn} activeOpacity={0.7} onPress={() => onEdit(med)}>
          <Text style={s.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.deleteBtn} activeOpacity={0.7} onPress={() => onDelete(med)}>
          <Text style={s.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MedicinesScreen({
  devices,
  medicines,
  schedules,
  onMedicinesChange,
  onSchedulesChange,
  onBack,
}: MedicinesScreenProps) {

  const [deleteTarget, setDeleteTarget]       = useState<Medicine | null>(null);
  const [showAdd, setShowAdd]             = useState(false);
  const [addDeviceId, setAddDeviceId]     = useState('');
  const [addSlot, setAddSlot]             = useState<number | null>(null);
  const [addName, setAddName]             = useState('');
  const [addQty, setAddQty]               = useState(8);
  const [addDevicePicker, setAddDevicePicker] = useState(false);
  const [addSlotPicker, setAddSlotPicker]     = useState(false);

  const [editTarget, setEditTarget]           = useState<Medicine | null>(null);
  const [editDeviceId, setEditDeviceId]       = useState('');
  const [editSlot, setEditSlot]               = useState<number | null>(null);
  const [editName, setEditName]               = useState('');
  const [editQty, setEditQty]                 = useState(0);
  const [editDevicePicker, setEditDevicePicker] = useState(false);
  const [editSlotPicker, setEditSlotPicker]     = useState(false);
  const [editConflict, setEditConflict]         = useState<Medicine | null>(null);
  const [editConfirmPending, setEditConfirmPending] = useState(false);

  const occupiedSlots = (deviceId: string, excludeId?: string) =>
    medicines
      .filter(m => m.deviceId === deviceId && m.id !== excludeId)
      .reduce<Record<number, Medicine>>((acc, m) => { acc[m.cartridgeSlot] = m; return acc; }, {});

  const deviceById = (id: string) => devices.find(d => d.id === id);

  const openAdd = () => {
    setAddDeviceId(devices[0]?.id ?? '');
    setAddSlot(null);
    setAddName('');
    setAddQty(30);
    setAddDevicePicker(false);
    setAddSlotPicker(false);
    setShowAdd(true);
  };

  const closeAdd = () => {
    setShowAdd(false);
    setAddDevicePicker(false);
    setAddSlotPicker(false);
  };

  const handleAdd = () => {
    if (!addDeviceId || addSlot === null || !addName.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    onMedicinesChange([...medicines, {
      id: Date.now().toString(),
      deviceId: addDeviceId,
      cartridgeSlot: addSlot,
      name: addName.trim(),
      quantity: addQty,
    }]);
    closeAdd();
  };

  const openEdit = (med: Medicine) => {
    setEditTarget(med);
    setEditDeviceId(med.deviceId);
    setEditSlot(med.cartridgeSlot);
    setEditName(med.name);
    setEditQty(med.quantity);
    setEditConflict(null);
    setEditConfirmPending(false);
    setEditDevicePicker(false);
    setEditSlotPicker(false);
  };

  const closeEdit = () => {
    setEditTarget(null);
    setEditDevicePicker(false);
    setEditSlotPicker(false);
    setEditConflict(null);
    setEditConfirmPending(false);
  };

  const handleEdit = () => {
    if (!editTarget || !editDeviceId || editSlot === null || !editName.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    const occ = occupiedSlots(editDeviceId, editTarget.id);
    const conflict = occ[editSlot] ?? null;
    if (conflict && !editConfirmPending) {
      setEditConflict(conflict);
      setEditConfirmPending(true);
      return;
    }
    const base = conflict
      ? medicines.filter(m => m.id !== conflict.id && m.id !== editTarget.id)
      : medicines.filter(m => m.id !== editTarget.id);
    onMedicinesChange([...base, {
      ...editTarget,
      deviceId: editDeviceId,
      cartridgeSlot: editSlot,
      name: editName.trim(),
      quantity: editQty,
    }]);
    closeEdit();
  };

  const handleDelete = (med: Medicine) => {
    setDeleteTarget(med);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onMedicinesChange(medicines.filter(m => m.id !== deleteTarget.id));
    onSchedulesChange(schedules.filter(s => s.medicineId !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Medicines</Text>
        <TouchableOpacity onPress={openAdd} activeOpacity={0.7} style={s.addBtn}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Empty states */}
      {devices.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconBox}><Text style={s.emptyIcon}>💊</Text></View>
          <Text style={s.emptyTitle}>No devices yet</Text>
          <Text style={s.emptyDesc}>Add a device first, then assign medicines to its cartridges.</Text>
        </View>
      ) : medicines.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconBox}><Text style={s.emptyIcon}>💊</Text></View>
          <Text style={s.emptyTitle}>No medicines added</Text>
          <Text style={s.emptyDesc}>Tap "+ Add" to assign a medicine to a cartridge.</Text>
          <TouchableOpacity onPress={openAdd} activeOpacity={0.7} style={s.emptyBtn}>
            <Text style={s.emptyBtnText}>+ Add First Medicine</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.sections}>
          {devices.map(device => {
            const devMeds = medicines
              .filter(m => m.deviceId === device.id)
              .sort((a, b) => a.cartridgeSlot - b.cartridgeSlot);
            return (
              <View key={device.id} style={s.section}>
                <View style={s.sectionHeader}>
                  <View style={s.sectionIconBox}>
                    <Text style={s.sectionIcon}>D</Text>
                  </View>
                  <View style={s.sectionMeta}>
                    <Text style={s.sectionTitle} numberOfLines={1}>{device.name}</Text>
                    <Text style={s.sectionUid}>{device.deviceUid}</Text>
                  </View>
                </View>
                {devMeds.length === 0 ? (
                  <Text style={s.sectionEmpty}>No medicines added to this device yet.</Text>
                ) : (
                  <View style={s.medList}>
                    {devMeds.map(med => (
                      <MedicineCard key={med.id} med={med} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ── ADD MODAL ──────────────────────────────────────────────────── */}
      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={closeAdd}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.overlay}>
            <View style={s.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>

                <Text style={s.modalTitle}>Add Medicine</Text>
                <Text style={s.modalSubtitle}>Assign a medicine to a device cartridge</Text>

                {/* Device picker */}
                <Text style={s.inputLabel}>Select Device</Text>
                <TouchableOpacity style={s.picker} activeOpacity={0.7}
                  onPress={() => { setAddDevicePicker(v => !v); setAddSlotPicker(false); }}>
                  <Text style={addDeviceId ? s.pickerText : s.pickerPlaceholder} numberOfLines={1}>
                    {addDeviceId
                      ? (() => { const d = deviceById(addDeviceId); return d ? `${d.name} · ${d.deviceUid}` : 'Select…'; })()
                      : 'Select a device…'}
                  </Text>
                  <Text style={s.pickerChevron}>{addDevicePicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {addDevicePicker && (
                  <View style={s.dropdown}>
                    {devices.map(d => (
                      <TouchableOpacity key={d.id} style={s.dropdownItem} activeOpacity={0.7}
                        onPress={() => { setAddDeviceId(d.id); setAddSlot(null); setAddDevicePicker(false); }}>
                        <Text style={s.dropdownItemText}>{d.name}</Text>
                        <Text style={s.dropdownItemSub}>{d.deviceUid}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Cartridge picker */}
                <Text style={s.inputLabel}>Select Cartridge</Text>
                <TouchableOpacity
                  style={[s.picker, !addDeviceId && s.pickerDisabled]}
                  activeOpacity={addDeviceId ? 0.7 : 1}
                  onPress={() => { if (addDeviceId) { setAddSlotPicker(v => !v); setAddDevicePicker(false); } }}>
                  <Text style={addSlot !== null ? s.pickerText : s.pickerPlaceholder}>
                    {addSlot !== null ? `Cartridge ${addSlot}` : 'Select a cartridge…'}
                  </Text>
                  <Text style={s.pickerChevron}>{addSlotPicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {addSlotPicker && addDeviceId && (() => {
                  const dev = deviceById(addDeviceId)!;
                  const occ = occupiedSlots(addDeviceId);
                  return (
                    <View style={s.dropdown}>
                      {Array.from({ length: dev.cartridgeCount }, (_, i) => i + 1).map(slot => {
                        const taken = occ[slot];
                        return (
                          <TouchableOpacity key={slot}
                            style={[s.dropdownItem, !!taken && s.dropdownItemDisabled]}
                            activeOpacity={taken ? 1 : 0.7}
                            onPress={() => { if (!taken) { setAddSlot(slot); setAddSlotPicker(false); } }}>
                            <Text style={[s.dropdownItemText, !!taken && s.dropdownItemTextDisabled]}>
                              {taken ? `Cartridge ${slot} (occupied)` : `Cartridge ${slot}`}
                            </Text>
                            {taken && <Text style={s.dropdownItemSub}>{taken.name}</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })()}

                {/* Name */}
                <Text style={s.inputLabel}>Medicine Name</Text>
                <TextInput style={s.input} placeholder="e.g. Metformin 500mg"
                  placeholderTextColor="#9CA3AF" value={addName} onChangeText={setAddName} />

                {/* Quantity */}
                <Text style={s.inputLabel}>Quantity (tablets)</Text>
                <QuantityStepper value={addQty} onChange={setAddQty} />

                <View style={s.modalActions}>
                  <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={closeAdd}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.confirmBtn} activeOpacity={0.7} onPress={handleAdd}>
                    <Text style={s.confirmBtnText}>Add Medicine</Text>
                  </TouchableOpacity>
                </View>

              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT MODAL ─────────────────────────────────────────────────── */}
      <Modal visible={!!editTarget} transparent animationType="fade" onRequestClose={closeEdit}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.overlay}>
            <View style={s.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>

                <Text style={s.modalTitle}>Edit Medicine</Text>
                <Text style={s.modalSubtitle}>Update details for this cartridge</Text>

                {editConflict && (
                  <View style={s.conflictBox}>
                    <Text style={s.conflictIcon}>⚠️</Text>
                    <Text style={s.conflictText}>
                      This cartridge already contains{' '}
                      <Text style={s.conflictHighlight}>{editConflict.name}</Text>.
                      {' '}Saving will replace it.
                    </Text>
                  </View>
                )}

                {/* Device picker */}
                <Text style={s.inputLabel}>Select Device</Text>
                <TouchableOpacity style={s.picker} activeOpacity={0.7}
                  onPress={() => { setEditDevicePicker(v => !v); setEditSlotPicker(false); setEditConflict(null); setEditConfirmPending(false); }}>
                  <Text style={editDeviceId ? s.pickerText : s.pickerPlaceholder} numberOfLines={1}>
                    {editDeviceId
                      ? (() => { const d = deviceById(editDeviceId); return d ? `${d.name} · ${d.deviceUid}` : 'Select…'; })()
                      : 'Select a device…'}
                  </Text>
                  <Text style={s.pickerChevron}>{editDevicePicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {editDevicePicker && (
                  <View style={s.dropdown}>
                    {devices.map(d => (
                      <TouchableOpacity key={d.id} style={s.dropdownItem} activeOpacity={0.7}
                        onPress={() => { setEditDeviceId(d.id); setEditSlot(null); setEditDevicePicker(false); setEditConflict(null); setEditConfirmPending(false); }}>
                        <Text style={s.dropdownItemText}>{d.name}</Text>
                        <Text style={s.dropdownItemSub}>{d.deviceUid}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Cartridge picker */}
                <Text style={s.inputLabel}>Select Cartridge</Text>
                <TouchableOpacity
                  style={[s.picker, !editDeviceId && s.pickerDisabled]}
                  activeOpacity={editDeviceId ? 0.7 : 1}
                  onPress={() => { if (editDeviceId) { setEditSlotPicker(v => !v); setEditDevicePicker(false); setEditConflict(null); setEditConfirmPending(false); } }}>
                  <Text style={editSlot !== null ? s.pickerText : s.pickerPlaceholder}>
                    {editSlot !== null ? `Cartridge ${editSlot}` : 'Select a cartridge…'}
                  </Text>
                  <Text style={s.pickerChevron}>{editSlotPicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {editSlotPicker && editDeviceId && (() => {
                  const dev = deviceById(editDeviceId)!;
                  const occ = occupiedSlots(editDeviceId, editTarget?.id);
                  return (
                    <View style={s.dropdown}>
                      {Array.from({ length: dev.cartridgeCount }, (_, i) => i + 1).map(slot => {
                        const taken = occ[slot];
                        return (
                          <TouchableOpacity key={slot}
                            style={[s.dropdownItem, !!taken && s.dropdownItemOccupied]}
                            activeOpacity={0.7}
                            onPress={() => { setEditSlot(slot); setEditSlotPicker(false); setEditConflict(null); setEditConfirmPending(false); }}>
                            <Text style={[s.dropdownItemText, !!taken && s.dropdownItemTextOccupied]}>
                              {taken ? `Cartridge ${slot} (occupied)` : `Cartridge ${slot}`}
                            </Text>
                            {taken && <Text style={s.dropdownItemSub}>{taken.name}</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })()}

                {/* Name */}
                <Text style={s.inputLabel}>Medicine Name</Text>
                <TextInput style={s.input} placeholder="e.g. Metformin 500mg"
                  placeholderTextColor="#9CA3AF" value={editName}
                  onChangeText={v => { setEditName(v); setEditConflict(null); setEditConfirmPending(false); }} />

                {/* Quantity */}
                <Text style={s.inputLabel}>Quantity (tablets)</Text>
                <QuantityStepper value={editQty} onChange={setEditQty} />

                <View style={s.modalActions}>
                  <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={closeEdit}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.confirmBtn} activeOpacity={0.7} onPress={handleEdit}>
                    <Text style={s.confirmBtnText}>
                      {editConfirmPending ? 'Confirm & Save' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                </View>

              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────────── */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.deleteIconBox}>
              <Text style={s.deleteIconEmoji}>🗑</Text>
            </View>

            <Text style={s.deleteTitleCenter}>Delete Medicine?</Text>
            <Text style={s.deleteMessage}>
              This will permanently remove{' '}
              <Text style={s.deleteHighlight}>{deleteTarget?.name}</Text>
              {deleteTarget ? ` from Cartridge ${deleteTarget.cartridgeSlot}` : ''}.
            </Text>

            {deleteTarget && (() => {
              const linkedScheds = schedules.filter(s => s.medicineId === deleteTarget.id);
              if (linkedScheds.length === 0) return null;
              return (
                <View style={s.deleteWarningBox}>
                  <Text style={s.deleteWarningIcon}>⚠️</Text>
                  <View>
                    <Text style={s.deleteWarningTitle}>This will also delete:</Text>
                    <Text style={s.deleteWarningItem}>
                      • {linkedScheds.length} schedule{linkedScheds.length !== 1 ? 's' : ''} using this medicine
                    </Text>
                  </View>
                </View>
              );
            })()}

            <Text style={s.deleteUndoneText}>This action cannot be undone.</Text>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={() => setDeleteTarget(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteConfirmBtn} activeOpacity={0.7} onPress={confirmDelete}>
                <Text style={s.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content:   { padding: 16, paddingBottom: 48 },

  // Header
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn:    { paddingVertical: 6, paddingRight: 4, minWidth: 60 },
  backText:   { fontSize: 16, color: PRIMARY, fontWeight: '600' },
  title:      { fontSize: 20, fontWeight: '700', color: TEXT_DARK, flex: 1, textAlign: 'center' },
  addBtn:     { backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, minWidth: 60, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Empty state
  emptyState:   { alignItems: 'center', paddingVertical: 64 },
  emptyIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyIcon:    { fontSize: 32 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
  emptyDesc:    { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24, marginBottom: 24 },
  emptyBtn:     { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  // Device sections
  sections:     { gap: 24 },
  section:      {},
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIconBox:{ width: 38, height: 38, borderRadius: 10, backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  sectionIcon:   { fontSize: 15, fontWeight: '700', color: PRIMARY },
  sectionMeta:   { flex: 1 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  sectionUid:    { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  sectionEmpty:  { fontSize: 13, color: TEXT_MUTED, paddingLeft: 48, fontStyle: 'italic' },
  medList:       { gap: 10 },

  // Medicine card
  medCard:    { backgroundColor: CARD_BG, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  medCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  medIcon:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  medIconDot: { width: 14, height: 14, borderRadius: 7 },
  medInfo:    { flex: 1 },
  medName:    { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 6, lineHeight: 20 },
  medBadgeRow:{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 5 },
  cartridgeBadge:     { backgroundColor: PRIMARY + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  cartridgeBadgeText: { fontSize: 11, fontWeight: '600', color: PRIMARY },
  lowStockBadge:      { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  lowStockText:       { fontSize: 11, fontWeight: '600', color: '#D97706' },
  medQty:    { fontSize: 13, color: TEXT_MUTED },
  medQtyLow: { color: '#EF4444', fontWeight: '600' },
  medActions:{ flexDirection: 'row', gap: 8 },
  editBtn:       { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: '#F3F4F6' },
  editBtnText:   { fontSize: 13, fontWeight: '600', color: TEXT_DARK },
  deleteBtn:     { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: '#FEE2E2' },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },

  // Modal
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalCard:     { backgroundColor: CARD_BG, borderRadius: 20, padding: 20, maxHeight: '92%' },
  modalTitle:    { fontSize: 19, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: TEXT_MUTED, marginBottom: 20 },

  // Form inputs
  inputLabel: { fontSize: 13, fontWeight: '600', color: TEXT_DARK, marginBottom: 6, marginTop: 12 },
  input:      { borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: TEXT_DARK, backgroundColor: '#F9FAFB' },

  // Picker
  picker:            { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#F9FAFB' },
  pickerDisabled:    { opacity: 0.45 },
  pickerText:        { flex: 1, fontSize: 14, color: TEXT_DARK },
  pickerPlaceholder: { flex: 1, fontSize: 14, color: '#9CA3AF' },
  pickerChevron:     { fontSize: 10, color: TEXT_MUTED, marginLeft: 6 },

  // Dropdown
  dropdown:             { borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, backgroundColor: CARD_BG, marginTop: 4, marginBottom: 4, overflow: 'hidden' },
  dropdownItem:         { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemDisabled: { backgroundColor: '#F9FAFB', opacity: 0.6 },
  dropdownItemOccupied: { backgroundColor: '#FFFBEB' },
  dropdownItemText:         { fontSize: 14, fontWeight: '600', color: TEXT_DARK },
  dropdownItemTextDisabled: { color: TEXT_MUTED },
  dropdownItemTextOccupied: { color: '#92400E' },
  dropdownItemSub:          { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

  // ── Quantity stepper — KEY FIX ──────────────────────────────────────────────
  // No overflow:hidden, no fixed width on buttons, flexShrink:0 keeps buttons visible
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 11,
    backgroundColor: '#F9FAFB',
    marginTop: 2,
  },
  stepBtn: {
    flexShrink: 0,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 9,
    margin: 3,
  },
  stepBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  stepBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 24,
    textAlign: 'center',
  },
  stepBtnTextDisabled: {
    color: '#9CA3AF',
  },
  stepInput: {
    flex: 1,
    minWidth: 40,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  stepperHint: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 5,
    marginLeft: 2,
  },

  // Modal actions
  modalActions:   { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 4 },
  cancelBtn:      { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelBtnText:  { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  confirmBtn:     { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: PRIMARY },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  // Conflict warning
  conflictBox:       { flexDirection: 'row', backgroundColor: '#FEF3C7', borderLeftWidth: 3, borderLeftColor: '#F59E0B', borderRadius: 10, padding: 12, marginBottom: 8, alignItems: 'flex-start' },
  conflictIcon:      { fontSize: 15, marginRight: 8, marginTop: 1 },
  conflictText:      { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  conflictHighlight: { fontWeight: '700', color: '#78350F' },

  // ── Delete modal ──────────────────────────────────────────────────────────
  deleteIconBox:    { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  deleteIconEmoji:  { fontSize: 28 },
  deleteTitleCenter:{ fontSize: 19, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 10 },
  deleteMessage:    { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 14 },
  deleteHighlight:  { color: '#111827', fontWeight: '700' },
  deleteWarningBox: { flexDirection: 'row', backgroundColor: '#FEF3C7', borderLeftWidth: 3, borderLeftColor: '#F59E0B', borderRadius: 10, padding: 12, marginBottom: 12, alignItems: 'flex-start', gap: 8 },
  deleteWarningIcon:{ fontSize: 15, marginTop: 1 },
  deleteWarningTitle:{ fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 3 },
  deleteWarningItem: { fontSize: 13, color: '#92400E', lineHeight: 19 },
  deleteUndoneText: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
  deleteConfirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: '#DC2626' },
  deleteConfirmText:{ fontSize: 14, fontWeight: '600', color: '#FFF' },
});
