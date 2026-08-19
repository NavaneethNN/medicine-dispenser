import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  SafeAreaView,
} from 'react-native';
import { medicineApi, scheduleApi } from '../services/api';
import { Schedule } from '../services/storage';
import Icon from '../components/Icon';

const PRIMARY    = '#0D9488';
const BG         = '#F8FAFC';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER     = '#E2E8F0';
const MAX_QUANTITY = 8;

const MEDICINE_COLORS = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#8B5CF6','#14B8A6'];
function medicineColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return MEDICINE_COLORS[h % MEDICINE_COLORS.length];
}

export interface Medicine {
  id: string;
  deviceId: string;
  cartridgeSlot: number;
  name: string;
  quantity: number;
}

interface Device {
  id: string; name: string; deviceUid: string; cartridgeCount: number;
}

interface MedicinesScreenProps {
  devices: Device[];
  medicines: Medicine[];
  schedules: Schedule[];
  onMedicinesChange: (m: Medicine[]) => void;
  onSchedulesChange: (s: Schedule[]) => void;
  onBack: () => void;
  onRefresh: () => Promise<void>;
}

function ErrorBanner({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <View style={s.errorBanner}>
      <Text style={s.errorBannerText} numberOfLines={3}>{msg}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={s.errorBannerDismiss}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function QuantityStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const atMin = value <= 1, atMax = value >= MAX_QUANTITY;
  return (
    <View>
      <View style={s.stepperRow}>
        <TouchableOpacity style={[s.stepBtn, atMin && s.stepBtnDisabled]} activeOpacity={atMin ? 1 : 0.7}
          onPress={() => !atMin && onChange(value - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.stepBtnText, atMin && s.stepBtnTextDisabled]}>−</Text>
        </TouchableOpacity>
        <TextInput style={s.stepInput} keyboardType="numeric" value={String(value)}
          onChangeText={v => { const n = parseInt(v, 10); if (!isNaN(n) && n >= 1 && n <= MAX_QUANTITY) onChange(n); }} />
        <TouchableOpacity style={[s.stepBtn, atMax && s.stepBtnDisabled]} activeOpacity={atMax ? 1 : 0.7}
          onPress={() => !atMax && onChange(value + 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.stepBtnText, atMax && s.stepBtnTextDisabled]}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.stepperHint}>Max {MAX_QUANTITY} tablets per cartridge</Text>
    </View>
  );
}

function MedicineCard({ med, onEdit, onDelete }: { med: Medicine; onEdit: (m: Medicine) => void; onDelete: (m: Medicine) => void }) {
  const color = medicineColor(med.id);
  const isLow = med.quantity < 3;
  return (
    <View style={s.medCard}>
      <View style={s.medCardTop}>
        <View style={[s.medIcon, { backgroundColor: color + '22' }]}>
          <View style={[s.medIconDot, { backgroundColor: color }]} />
        </View>
        <View style={s.medInfo}>
          <Text style={s.medName} numberOfLines={2}>{med.name}</Text>
          <View style={s.medBadgeRow}>
            <View style={s.cartridgeBadge}><Text style={s.cartridgeBadgeText}>Cartridge {med.cartridgeSlot}</Text></View>
            {isLow && <View style={s.lowStockBadge}><Text style={s.lowStockText}>Low Stock</Text></View>}
          </View>
          <Text style={[s.medQty, isLow && s.medQtyLow]}>{med.quantity} tablets left</Text>
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

export default function MedicinesScreen({
  devices, medicines, schedules,
  onMedicinesChange, onSchedulesChange, onBack, onRefresh,
}: MedicinesScreenProps) {

  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);

  // Add state
  const [showAdd, setShowAdd]         = useState(false);
  const [addDeviceId, setAddDeviceId] = useState('');
  const [addSlot, setAddSlot]         = useState<number | null>(null);
  const [addName, setAddName]         = useState('');
  const [addQty, setAddQty]           = useState(8);
  const [addDevicePicker, setAddDevicePicker] = useState(false);
  const [addSlotPicker, setAddSlotPicker]     = useState(false);

  // Edit state
  const [editTarget, setEditTarget]       = useState<Medicine | null>(null);
  const [editDeviceId, setEditDeviceId]   = useState('');
  const [editSlot, setEditSlot]           = useState<number | null>(null);
  const [editName, setEditName]           = useState('');
  const [editQty, setEditQty]             = useState(0);
  const [editDevicePicker, setEditDevicePicker] = useState(false);
  const [editSlotPicker, setEditSlotPicker]     = useState(false);

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e: any) { setError(e?.message ?? 'Something went wrong'); } finally { setBusy(false); }
  };

  const occupiedSlots = (deviceId: string, excludeId?: string) =>
    medicines.filter(m => m.deviceId === deviceId && m.id !== excludeId)
      .reduce<Record<number, Medicine>>((acc, m) => { acc[m.cartridgeSlot] = m; return acc; }, {});

  const deviceById = (id: string) => devices.find(d => d.id === id);

  const openAdd = () => {
    setAddDeviceId(devices[0]?.id ?? ''); setAddSlot(null); setAddName(''); setAddQty(8);
    setAddDevicePicker(false); setAddSlotPicker(false); setShowAdd(true);
  };
  const closeAdd = () => { setShowAdd(false); setAddDevicePicker(false); setAddSlotPicker(false); };

  const handleAdd = () => withBusy(async () => {
    if (!addDeviceId || addSlot === null || !addName.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.'); return;
    }
    await medicineApi.create({ deviceId: addDeviceId, name: addName.trim(), quantity: addQty, cartridgeSlot: addSlot });
    closeAdd();
    await onRefresh();
  });

  const openEdit = (med: Medicine) => {
    setEditTarget(med); setEditDeviceId(med.deviceId); setEditSlot(med.cartridgeSlot);
    setEditName(med.name); setEditQty(med.quantity);
    setEditDevicePicker(false); setEditSlotPicker(false);
  };
  const closeEdit = () => { setEditTarget(null); setEditDevicePicker(false); setEditSlotPicker(false); };

  const handleEdit = () => withBusy(async () => {
    if (!editTarget || !editDeviceId || editSlot === null || !editName.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.'); return;
    }
    await medicineApi.update(editTarget.id, {
      deviceId: editDeviceId, name: editName.trim(), quantity: editQty, cartridgeSlot: editSlot,
    });
    closeEdit();
    await onRefresh();
  });

  const confirmDelete = () => withBusy(async () => {
    await medicineApi.delete(deleteTarget!.id);
    setDeleteTarget(null);
    await onRefresh();
  });

  return (
    <SafeAreaView style={s.safe}>
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={s.backBtn}>
          <Icon name="chevron-back" size={22} color={PRIMARY} />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Medicines</Text>
        <TouchableOpacity onPress={openAdd} activeOpacity={0.7} style={s.addBtn}>
          <Icon name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {error && <ErrorBanner msg={error} onDismiss={() => setError(null)} />}
      {busy && <View style={s.busyRow}><ActivityIndicator color={PRIMARY} size="small" /><Text style={s.busyText}>Saving…</Text></View>}

      {devices.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconBox}><Icon name="hardware-chip-outline" size={34} color={PRIMARY} /></View>
          <Text style={s.emptyTitle}>No devices yet</Text>
          <Text style={s.emptyDesc}>Add a device first, then assign medicines to its cartridges.</Text>
        </View>
      ) : medicines.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconBox}><Icon name="medkit-outline" size={34} color={PRIMARY} /></View>
          <Text style={s.emptyTitle}>No medicines added</Text>
          <Text style={s.emptyDesc}>Tap "+ Add" to assign a medicine to a cartridge.</Text>
          <TouchableOpacity onPress={openAdd} activeOpacity={0.7} style={s.emptyBtn}><Text style={s.emptyBtnText}>+ Add First Medicine</Text></TouchableOpacity>
        </View>
      ) : (
        <View style={s.sections}>
          {devices.map(device => {
            const devMeds = medicines.filter(m => m.deviceId === device.id).sort((a, b) => a.cartridgeSlot - b.cartridgeSlot);
            return (
              <View key={device.id} style={s.section}>
                <View style={s.sectionHeader}>
                  <View style={s.sectionIconBox}><Icon name="hardware-chip-outline" size={18} color={PRIMARY} /></View>
                  <View style={s.sectionMeta}>
                    <Text style={s.sectionTitle} numberOfLines={1}>{device.name}</Text>
                    <Text style={s.sectionUid}>{device.deviceUid}</Text>
                  </View>
                </View>
                {devMeds.length === 0
                  ? <Text style={s.sectionEmpty}>No medicines added to this device yet.</Text>
                  : <View style={s.medList}>{devMeds.map(med => <MedicineCard key={med.id} med={med} onEdit={openEdit} onDelete={m => setDeleteTarget(m)} />)}</View>
                }
              </View>
            );
          })}
        </View>
      )}

      {/* ADD MODAL */}
      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={closeAdd}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.overlay}>
            <View style={s.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                <Text style={s.modalTitle}>Add Medicine</Text>
                <Text style={s.modalSubtitle}>Assign a medicine to a device cartridge</Text>

                <Text style={s.inputLabel}>Select Device</Text>
                <TouchableOpacity style={s.picker} activeOpacity={0.7}
                  onPress={() => { setAddDevicePicker(v => !v); setAddSlotPicker(false); }}>
                  <Text style={addDeviceId ? s.pickerText : s.pickerPlaceholder} numberOfLines={1}>
                    {addDeviceId ? (() => { const d = deviceById(addDeviceId); return d ? `${d.name} · ${d.deviceUid}` : 'Select…'; })() : 'Select a device…'}
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

                <Text style={s.inputLabel}>Select Cartridge</Text>
                <TouchableOpacity style={[s.picker, !addDeviceId && s.pickerDisabled]} activeOpacity={addDeviceId ? 0.7 : 1}
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
                          <TouchableOpacity key={slot} style={[s.dropdownItem, !!taken && s.dropdownItemDisabled]}
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

                <Text style={s.inputLabel}>Medicine Name</Text>
                <TextInput style={s.input} placeholder="e.g. Metformin 500mg" placeholderTextColor="#9CA3AF"
                  value={addName} onChangeText={setAddName} />

                <Text style={s.inputLabel}>Quantity (tablets)</Text>
                <QuantityStepper value={addQty} onChange={setAddQty} />

                <View style={s.modalActions}>
                  <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={closeAdd}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.confirmBtn, busy && s.btnDisabled]} activeOpacity={busy ? 1 : 0.7} onPress={handleAdd}>
                    {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmBtnText}>Add Medicine</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={!!editTarget} transparent animationType="fade" onRequestClose={closeEdit}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.overlay}>
            <View style={s.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                <Text style={s.modalTitle}>Edit Medicine</Text>
                <Text style={s.modalSubtitle}>Update details for this cartridge</Text>

                <Text style={s.inputLabel}>Select Device</Text>
                <TouchableOpacity style={s.picker} activeOpacity={0.7}
                  onPress={() => { setEditDevicePicker(v => !v); setEditSlotPicker(false); }}>
                  <Text style={editDeviceId ? s.pickerText : s.pickerPlaceholder} numberOfLines={1}>
                    {editDeviceId ? (() => { const d = deviceById(editDeviceId); return d ? `${d.name} · ${d.deviceUid}` : 'Select…'; })() : 'Select…'}
                  </Text>
                  <Text style={s.pickerChevron}>{editDevicePicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {editDevicePicker && (
                  <View style={s.dropdown}>
                    {devices.map(d => (
                      <TouchableOpacity key={d.id} style={s.dropdownItem} activeOpacity={0.7}
                        onPress={() => { setEditDeviceId(d.id); setEditSlot(null); setEditDevicePicker(false); }}>
                        <Text style={s.dropdownItemText}>{d.name}</Text>
                        <Text style={s.dropdownItemSub}>{d.deviceUid}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={s.inputLabel}>Select Cartridge</Text>
                <TouchableOpacity style={[s.picker, !editDeviceId && s.pickerDisabled]} activeOpacity={editDeviceId ? 0.7 : 1}
                  onPress={() => { if (editDeviceId) { setEditSlotPicker(v => !v); setEditDevicePicker(false); } }}>
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
                          <TouchableOpacity key={slot} style={[s.dropdownItem, !!taken && s.dropdownItemOccupied]}
                            activeOpacity={0.7} onPress={() => { setEditSlot(slot); setEditSlotPicker(false); }}>
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

                <Text style={s.inputLabel}>Medicine Name</Text>
                <TextInput style={s.input} placeholder="e.g. Metformin 500mg" placeholderTextColor="#9CA3AF"
                  value={editName} onChangeText={setEditName} />

                <Text style={s.inputLabel}>Quantity (tablets)</Text>
                <QuantityStepper value={editQty} onChange={setEditQty} />

                <View style={s.modalActions}>
                  <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={closeEdit}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.confirmBtn, busy && s.btnDisabled]} activeOpacity={busy ? 1 : 0.7} onPress={handleEdit}>
                    {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmBtnText}>Save Changes</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* DELETE MODAL */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.deleteIconBox}><Icon name="trash-outline" size={28} color="#DC2626" /></View>
            <Text style={s.deleteTitleCenter}>Delete Medicine?</Text>
            <Text style={s.deleteMessage}>
              Permanently remove <Text style={s.deleteHighlight}>{deleteTarget?.name}</Text>
              {deleteTarget ? ` from Cartridge ${deleteTarget.cartridgeSlot}` : ''}.
            </Text>
            {deleteTarget && (() => {
              const ls = schedules.filter(sc => sc.medicineId === deleteTarget.id);
              if (!ls.length) return null;
              return (
                <View style={s.deleteWarningBox}>
                  <Icon name="warning-outline" size={15} color="#D97706" />
                  <View>
                    <Text style={s.deleteWarningTitle}>This will also delete:</Text>
                    <Text style={s.deleteWarningItem}>• {ls.length} schedule{ls.length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
              );
            })()}
            <Text style={s.deleteUndoneText}>This action cannot be undone.</Text>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={() => setDeleteTarget(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.deleteConfirmBtn, busy && s.btnDisabled]} activeOpacity={busy ? 1 : 0.7} onPress={confirmDelete}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.deleteConfirmText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe:      { flex: 1, backgroundColor: BG },
  content:   { padding: 16, paddingBottom: 48 },
  header:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingRight: 8, minWidth: 70 },
  backText:  { fontSize: 15, color: PRIMARY, fontWeight: '600', marginLeft: 2 },
  title:     { flex: 1, fontSize: 20, fontWeight: '700', color: TEXT_DARK, textAlign: 'center' },
  addBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: 70, justifyContent: 'center' },
  addBtnText:{ color: '#fff', fontSize: 14, fontWeight: '600' },
  errorBanner:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 12, gap: 8 },
  errorBannerText:    { flex: 1, fontSize: 13, color: '#DC2626', fontWeight: '500' },
  errorBannerDismiss: { fontSize: 14, color: '#DC2626', fontWeight: '700', paddingHorizontal: 4 },
  busyRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  busyText:  { fontSize: 13, color: TEXT_MUTED },
  emptyState:   { alignItems: 'center', paddingVertical: 64 },
  emptyIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
  emptyDesc:    { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24, marginBottom: 24 },
  emptyBtn:     { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sections:     { gap: 24 },
  section:      {},
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIconBox:{ width: 38, height: 38, borderRadius: 10, backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  sectionMeta:  { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  sectionUid:   { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  sectionEmpty: { fontSize: 13, color: TEXT_MUTED, paddingLeft: 48, fontStyle: 'italic' },
  medList:      { gap: 10 },
  medCard:      { backgroundColor: CARD_BG, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  medCardTop:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  medIcon:      { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  medIconDot:   { width: 14, height: 14, borderRadius: 7 },
  medInfo:      { flex: 1 },
  medName:      { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 6, lineHeight: 20 },
  medBadgeRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 5 },
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
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  modalCard:     { backgroundColor: CARD_BG, borderRadius: 20, padding: 20, maxHeight: '92%' },
  modalTitle:    { fontSize: 19, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: TEXT_MUTED, marginBottom: 20 },
  inputLabel:    { fontSize: 13, fontWeight: '600', color: TEXT_DARK, marginBottom: 6, marginTop: 12 },
  input:         { borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: TEXT_DARK, backgroundColor: '#F9FAFB' },
  picker:            { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#F9FAFB' },
  pickerDisabled:    { opacity: 0.45 },
  pickerText:        { flex: 1, fontSize: 14, color: TEXT_DARK },
  pickerPlaceholder: { flex: 1, fontSize: 14, color: '#9CA3AF' },
  pickerChevron:     { fontSize: 10, color: TEXT_MUTED, marginLeft: 6 },
  dropdown:             { borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, backgroundColor: CARD_BG, marginTop: 4, marginBottom: 4, overflow: 'hidden' },
  dropdownItem:         { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemDisabled: { backgroundColor: '#F9FAFB', opacity: 0.6 },
  dropdownItemOccupied: { backgroundColor: '#FFFBEB' },
  dropdownItemText:         { fontSize: 14, fontWeight: '600', color: TEXT_DARK },
  dropdownItemTextDisabled: { color: TEXT_MUTED },
  dropdownItemTextOccupied: { color: '#92400E' },
  dropdownItemSub:          { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, backgroundColor: '#F9FAFB', marginTop: 2 },
  stepBtn:    { flexShrink: 0, width: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY, borderRadius: 9, margin: 3 },
  stepBtnDisabled:    { backgroundColor: '#D1D5DB' },
  stepBtnText:        { fontSize: 20, fontWeight: '700', color: '#fff', lineHeight: 24, textAlign: 'center' },
  stepBtnTextDisabled:{ color: '#9CA3AF' },
  stepInput:   { flex: 1, minWidth: 40, textAlign: 'center', fontSize: 17, fontWeight: '700', color: TEXT_DARK, paddingVertical: 12, paddingHorizontal: 4 },
  stepperHint: { fontSize: 12, color: TEXT_MUTED, marginTop: 5, marginLeft: 2 },
  modalActions:   { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 4 },
  cancelBtn:      { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelBtnText:  { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  confirmBtn:     { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: PRIMARY },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnDisabled:    { opacity: 0.65 },
  deleteIconBox:    { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  deleteTitleCenter:{ fontSize: 19, fontWeight: '700', color: TEXT_DARK, textAlign: 'center', marginBottom: 10 },
  deleteMessage:    { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 21, marginBottom: 14 },
  deleteHighlight:  { color: TEXT_DARK, fontWeight: '700' },
  deleteWarningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderLeftWidth: 3, borderLeftColor: '#F59E0B', borderRadius: 10, padding: 12, marginBottom: 12 },
  deleteWarningTitle:{ fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 3 },
  deleteWarningItem: { fontSize: 13, color: '#92400E', lineHeight: 19 },
  deleteUndoneText: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
  deleteConfirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: '#DC2626' },
  deleteConfirmText:{ fontSize: 14, fontWeight: '600', color: '#fff' },
});
