import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, Switch, KeyboardAvoidingView,
  Platform, Alert, Dimensions,
} from 'react-native';
import { Schedule, WeekDay, RepeatType } from '../services/storage';
import { Medicine } from './MedicinesScreen';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY    = '#0D9488';
const BG         = '#F0FDFA';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#111827';
const TEXT_MUTED = '#6B7280';
const BORDER     = '#E5E7EB';
const { width: SCREEN_W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface Device {
  id: string;
  name: string;
  deviceUid: string;
  cartridgeCount: number;
}

interface ScheduleScreenProps {
  devices: Device[];
  medicines: Medicine[];
  schedules: Schedule[];
  onSchedulesChange: (s: Schedule[]) => void;
  onMedicinesChange: (m: Medicine[]) => void;
  onBack: () => void;
  onViewUpcoming: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ALL_DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Convert "HH:MM" 24h to "H:MM AM/PM" */
function fmt24to12(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${ampm}`;
}

/** Today's YYYY-MM-DD without timezone drift */
function localISODate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function todayStr(): string { return localISODate(new Date()); }

/** Friendly date label e.g. "26 Jul" */
function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, mo, da] = iso.split('-').map(Number);
  const d = new Date(y, mo - 1, da);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Repeat badge text */
function repeatLabel(sc: Schedule): string {
  if (sc.repeatType === 'daily') return 'Daily';
  if (sc.repeatType === 'specific_days') return sc.specificDays.join(', ') || 'No days';
  return `One-time · ${fmtDate(sc.oneTimeDate)}`;
}

/** Minutes since midnight */
function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ─── TimePicker ───────────────────────────────────────────────────────────────
function TimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [h, m] = value.split(':').map(Number);
  const setH = (n: number) => onChange(`${String(n).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  const setM = (n: number) => onChange(`${String(h).padStart(2, '0')}:${String(n).padStart(2, '0')}`);

  return (
    <View style={ts.timeRow}>
      <View style={ts.timeUnit}>
        <TouchableOpacity style={ts.timeBtn} onPress={() => setH((h + 1) % 24)} activeOpacity={0.7}>
          <Text style={ts.timeBtnText}>▲</Text>
        </TouchableOpacity>
        <View style={ts.timeDisplay}>
          <Text style={ts.timeValue}>{String(h).padStart(2, '0')}</Text>
          <Text style={ts.timeLabel}>HH</Text>
        </View>
        <TouchableOpacity style={ts.timeBtn} onPress={() => setH((h - 1 + 24) % 24)} activeOpacity={0.7}>
          <Text style={ts.timeBtnText}>▼</Text>
        </TouchableOpacity>
      </View>

      <Text style={ts.timeSep}>:</Text>

      <View style={ts.timeUnit}>
        <TouchableOpacity style={ts.timeBtn} onPress={() => setM((m + 5) % 60)} activeOpacity={0.7}>
          <Text style={ts.timeBtnText}>▲</Text>
        </TouchableOpacity>
        <View style={ts.timeDisplay}>
          <Text style={ts.timeValue}>{String(m).padStart(2, '00')}</Text>
          <Text style={ts.timeLabel}>MM</Text>
        </View>
        <TouchableOpacity style={ts.timeBtn} onPress={() => setM((m - 5 + 60) % 60)} activeOpacity={0.7}>
          <Text style={ts.timeBtnText}>▼</Text>
        </TouchableOpacity>
      </View>

      <View style={ts.timeAmPm}>
        <Text style={ts.timeAmPmText}>{h < 12 ? 'AM' : 'PM'}</Text>
      </View>
    </View>
  );
}

// ─── QuantityStepper ──────────────────────────────────────────────────────────
const MAX_DOSE = 8;

function QuantityStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const atMin = value <= 1;
  const atMax = value >= MAX_DOSE;
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
          onChangeText={v => { const n = parseInt(v, 10); if (!isNaN(n) && n >= 1 && n <= MAX_DOSE) onChange(n); }}
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
      <Text style={s.stepperHint}>Max {MAX_DOSE} tablets per dose</Text>
    </View>
  );
}

// ─── DayPicker ────────────────────────────────────────────────────────────────
function DayPicker({ value, onChange }: { value: WeekDay[]; onChange: (d: WeekDay[]) => void }) {
  return (
    <View style={s.dayRow}>
      {ALL_DAYS.map(day => {
        const active = value.includes(day);
        return (
          <TouchableOpacity
            key={day}
            style={[s.dayChip, active && s.dayChipActive]}
            activeOpacity={0.7}
            onPress={() => onChange(active ? value.filter(d => d !== day) : [...value, day])}
          >
            <Text style={[s.dayChipText, active && s.dayChipTextActive]}>{day}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── DatePicker — fixed: uses local date parts to avoid UTC drift ─────────────
function DatePicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = todayStr();

  /** Shift by ±days without UTC conversion artifacts */
  const shift = (days: number) => {
    const base = value || today;
    const [y, mo, da] = base.split('-').map(Number);
    const d = new Date(y, mo - 1, da); // local midnight — no UTC offset issue
    d.setDate(d.getDate() + days);
    onChange(localISODate(d));
  };

  const isPast = (value || today) < today;

  return (
    <View style={s.dateRow}>
      <TouchableOpacity style={s.dateBtn} onPress={() => shift(-1)} activeOpacity={0.7}>
        <Text style={s.dateBtnText}>‹</Text>
      </TouchableOpacity>
      <View style={s.dateMid}>
        <Text style={[s.dateValue, isPast && s.dateValuePast]}>
          {fmtDate(value || today)}
        </Text>
        {isPast && <Text style={s.datePastHint}>Past date</Text>}
      </View>
      <TouchableOpacity style={s.dateBtn} onPress={() => shift(1)} activeOpacity={0.7}>
        <Text style={s.dateBtnText}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── ScheduleCard ─────────────────────────────────────────────────────────────
function ScheduleCard({
  sc, medicines, onEdit, onDelete,
}: {
  sc: Schedule;
  medicines: Medicine[];
  onEdit: (s: Schedule) => void;
  onDelete: (s: Schedule) => void;
}) {
  const med = medicines.find(m => m.id === sc.medicineId);
  const isLow = med ? med.quantity < 10 : false;
  const dosesLeft = med && sc.quantityPerDose > 0 ? Math.floor(med.quantity / sc.quantityPerDose) : null;

  return (
    <View style={s.schedCard}>
      <View style={s.schedCardTop}>
        <View style={s.schedTimeBlock}>
          <Text style={s.schedTime}>{fmt24to12(sc.time)}</Text>
        </View>

        <View style={s.schedInfo}>
          <Text style={s.schedMedName} numberOfLines={1}>
            {med ? med.name : '—'}
            <Text style={s.schedDose}>{' · '}{sc.quantityPerDose} tablet{sc.quantityPerDose !== 1 ? 's' : ''}</Text>
          </Text>
          <View style={s.schedBadgeRow}>
            <View style={s.repeatBadge}>
              <Text style={s.repeatBadgeText}>{repeatLabel(sc)}</Text>
            </View>
            {isLow && (
              <View style={s.lowBadge}>
                <Text style={s.lowBadgeText}>Low Stock</Text>
              </View>
            )}
          </View>
          {isLow && dosesLeft !== null && (
            <Text style={s.dosesLeft}>~{dosesLeft} dose{dosesLeft !== 1 ? 's' : ''} left</Text>
          )}
        </View>

        <Text style={[s.alarmIcon, !sc.alarmEnabled && s.alarmIconOff]}>
          {sc.alarmEnabled ? '🔔' : '🔕'}
        </Text>
      </View>

      <View style={s.schedActions}>
        <TouchableOpacity style={s.editBtn} activeOpacity={0.7} onPress={() => onEdit(sc)}>
          <Text style={s.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.deleteBtn} activeOpacity={0.7} onPress={() => onDelete(sc)}>
          <Text style={s.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ScheduleScreen({
  devices, medicines, schedules, onSchedulesChange, onMedicinesChange, onBack, onViewUpcoming,
}: ScheduleScreenProps) {

  // ── Add modal state ──────────────────────────────────────────────────────
  const [showAdd, setShowAdd]       = useState(false);
  const [aDeviceId, setADeviceId]   = useState('');
  const [aMedId, setAMedId]         = useState('');
  const [aTime, setATime]           = useState('08:00');
  const [aRepeat, setARepeat]       = useState<RepeatType>('daily');
  const [aDays, setADays]           = useState<WeekDay[]>([]);
  const [aDate, setADate]           = useState(todayStr);
  const [aQty, setAQty]             = useState(1);
  const [aAlarm, setAAlarm]         = useState(true);
  const [aDevPicker, setADevPicker] = useState(false);
  const [aMedPicker, setAMedPicker] = useState(false);
  const [aWarn, setAWarn]           = useState('');

  // ── Edit modal state ─────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [eDeviceId, setEDeviceId]   = useState('');
  const [eMedId, setEMedId]         = useState('');
  const [eTime, setETime]           = useState('08:00');
  const [eRepeat, setERepeat]       = useState<RepeatType>('daily');
  const [eDays, setEDays]           = useState<WeekDay[]>([]);
  const [eDate, setEDate]           = useState(todayStr);
  const [eQty, setEQty]             = useState(1);
  const [eAlarm, setEAlarm]         = useState(true);
  const [eDevPicker, setEDevPicker] = useState(false);
  const [eMedPicker, setEMedPicker] = useState(false);
  const [eWarn, setEWarn]           = useState('');

  // ── Delete ───────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const deviceMeds = (deviceId: string) =>
    medicines.filter(m => m.deviceId === deviceId && m.quantity > 0);

  const validateStock = (medId: string, qty: number): { blocked: boolean; warn: string } => {
    const med = medicines.find(m => m.id === medId);
    if (!med) return { blocked: false, warn: '' };
    if (qty > med.quantity) {
      return { blocked: true, warn: `Not enough stock. Only ${med.quantity} tablet${med.quantity !== 1 ? 's' : ''} remaining.` };
    }
    const dosesLeft = Math.floor(med.quantity / qty);
    if (dosesLeft < 5) {
      return { blocked: false, warn: `${med.name} may run out in ~${dosesLeft} dose${dosesLeft !== 1 ? 's' : ''}. Consider refilling soon.` };
    }
    return { blocked: false, warn: '' };
  };

  // ── Open/close add ───────────────────────────────────────────────────────
  const openAdd = () => {
    setADeviceId(devices[0]?.id ?? '');
    setAMedId(''); setATime('08:00'); setARepeat('daily');
    setADays([]); setADate(todayStr()); setAQty(1); setAAlarm(true);
    setADevPicker(false); setAMedPicker(false); setAWarn('');
    setShowAdd(true);
  };
  const closeAdd = () => { setShowAdd(false); setADevPicker(false); setAMedPicker(false); setAWarn(''); };

  const handleAdd = () => {
    if (!aDeviceId || !aMedId) { Alert.alert('Missing fields', 'Please select a device and medicine.'); return; }
    if (aRepeat === 'specific_days' && aDays.length === 0) { Alert.alert('Missing days', 'Please select at least one day.'); return; }
    const { blocked, warn } = validateStock(aMedId, aQty);
    if (blocked) { Alert.alert('Not enough stock', warn); return; }
    const sc: Schedule = {
      id: Date.now().toString(), deviceId: aDeviceId, medicineId: aMedId,
      time: aTime, repeatType: aRepeat,
      specificDays: aRepeat === 'specific_days' ? aDays : [],
      oneTimeDate: aRepeat === 'one_time' ? aDate : '',
      quantityPerDose: aQty, alarmEnabled: aAlarm,
    };
    onSchedulesChange([...schedules, sc]);
    if (warn) setAWarn(warn); else closeAdd();
  };
  const confirmAddWithWarn = () => { setAWarn(''); closeAdd(); };

  // ── Open/close edit ──────────────────────────────────────────────────────
  const openEdit = (sc: Schedule) => {
    setEditTarget(sc); setEDeviceId(sc.deviceId); setEMedId(sc.medicineId);
    setETime(sc.time); setERepeat(sc.repeatType); setEDays(sc.specificDays);
    setEDate(sc.oneTimeDate || todayStr()); setEQty(sc.quantityPerDose);
    setEAlarm(sc.alarmEnabled); setEDevPicker(false); setEMedPicker(false); setEWarn('');
  };
  const closeEdit = () => { setEditTarget(null); setEDevPicker(false); setEMedPicker(false); setEWarn(''); };

  const handleEdit = () => {
    if (!editTarget || !eDeviceId || !eMedId) { Alert.alert('Missing fields', 'Please select a device and medicine.'); return; }
    if (eRepeat === 'specific_days' && eDays.length === 0) { Alert.alert('Missing days', 'Please select at least one day.'); return; }
    const { blocked, warn } = validateStock(eMedId, eQty);
    if (blocked) { Alert.alert('Not enough stock', warn); return; }
    const updated: Schedule = {
      ...editTarget, deviceId: eDeviceId, medicineId: eMedId,
      time: eTime, repeatType: eRepeat,
      specificDays: eRepeat === 'specific_days' ? eDays : [],
      oneTimeDate: eRepeat === 'one_time' ? eDate : '',
      quantityPerDose: eQty, alarmEnabled: eAlarm,
    };
    onSchedulesChange(schedules.map(x => x.id === editTarget.id ? updated : x));
    if (warn) setEWarn(warn); else closeEdit();
  };
  const confirmEditWithWarn = () => { setEWarn(''); closeEdit(); };

  // ── Delete ───────────────────────────────────────────────────────────────
  const confirmDelete = () => {
    if (!deleteTarget) return;
    onSchedulesChange(schedules.filter(x => x.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  // ── Upcoming count for button badge ─────────────────────────────────────
  const upcomingCount = schedules.length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Schedule</Text>
        <TouchableOpacity onPress={openAdd} activeOpacity={0.7} style={s.addBtn}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Upcoming Schedules Button ── */}
      <TouchableOpacity
        style={s.upcomingBtn}
        activeOpacity={0.85}
        onPress={onViewUpcoming}
      >
        <View style={s.upcomingBtnLeft}>
          <Text style={s.upcomingBtnIcon}>📅</Text>
          <View>
            <Text style={s.upcomingBtnTitle}>View Upcoming Schedules</Text>
            <Text style={s.upcomingBtnSub}>See tablets for the next 14 days</Text>
          </View>
        </View>
        <Text style={s.upcomingBtnArrow}>›</Text>
      </TouchableOpacity>

      {/* ── Body ── */}
      {devices.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconBox}><Text style={s.emptyIcon}>🗓</Text></View>
          <Text style={s.emptyTitle}>No devices yet</Text>
          <Text style={s.emptyDesc}>Add a device and medicines first, then create schedules.</Text>
        </View>
      ) : schedules.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconBox}><Text style={s.emptyIcon}>🗓</Text></View>
          <Text style={s.emptyTitle}>No schedules yet</Text>
          <Text style={s.emptyDesc}>Tap "+ Add" to create your first dispensing schedule.</Text>
          <TouchableOpacity onPress={openAdd} activeOpacity={0.7} style={s.emptyBtn}>
            <Text style={s.emptyBtnText}>+ Add First Schedule</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.sections}>
          {devices.map(device => {
            const devScheds = schedules
              .filter(sc => sc.deviceId === device.id)
              .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
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
                {devScheds.length === 0 ? (
                  <Text style={s.sectionEmpty}>No schedules set for this device yet.</Text>
                ) : (
                  <View style={s.schedList}>
                    {devScheds.map(sc => (
                      <ScheduleCard
                        key={sc.id} sc={sc} medicines={medicines}
                        onEdit={openEdit} onDelete={d => setDeleteTarget(d)}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ── ADD MODAL ──────────────────────────────────────────────────────── */}
      <Modal visible={showAdd && !aWarn} transparent animationType="fade" onRequestClose={closeAdd}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.overlay}>
            <View style={s.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                <Text style={s.modalTitle}>Add Schedule</Text>
                <Text style={s.modalSubtitle}>Set a dispensing schedule for a medicine</Text>

                <Text style={s.inputLabel}>Select Device</Text>
                <TouchableOpacity style={s.picker} activeOpacity={0.7}
                  onPress={() => { setADevPicker(v => !v); setAMedPicker(false); }}>
                  <Text style={aDeviceId ? s.pickerText : s.pickerPlaceholder} numberOfLines={1}>
                    {aDeviceId ? (() => { const d = devices.find(x => x.id === aDeviceId); return d ? `${d.name} · ${d.deviceUid}` : 'Select…'; })() : 'Select a device…'}
                  </Text>
                  <Text style={s.pickerChevron}>{aDevPicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {aDevPicker && (
                  <View style={s.dropdown}>
                    {devices.map(d => (
                      <TouchableOpacity key={d.id} style={s.dropdownItem} activeOpacity={0.7}
                        onPress={() => { setADeviceId(d.id); setAMedId(''); setADevPicker(false); }}>
                        <Text style={s.dropdownItemText}>{d.name}</Text>
                        <Text style={s.dropdownItemSub}>{d.deviceUid}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={s.inputLabel}>Select Medicine</Text>
                <TouchableOpacity style={[s.picker, !aDeviceId && s.pickerDisabled]}
                  activeOpacity={aDeviceId ? 0.7 : 1}
                  onPress={() => { if (aDeviceId) { setAMedPicker(v => !v); setADevPicker(false); } }}>
                  <Text style={aMedId ? s.pickerText : s.pickerPlaceholder} numberOfLines={1}>
                    {aMedId ? (() => { const m = medicines.find(x => x.id === aMedId); return m ? `${m.name} — Cartridge ${m.cartridgeSlot}` : 'Select…'; })() : 'Select a medicine…'}
                  </Text>
                  <Text style={s.pickerChevron}>{aMedPicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {aMedPicker && aDeviceId && (
                  <View style={s.dropdown}>
                    {deviceMeds(aDeviceId).length === 0
                      ? <View style={s.dropdownItem}><Text style={s.dropdownItemSub}>No medicines with stock on this device.</Text></View>
                      : deviceMeds(aDeviceId).map(m => (
                        <TouchableOpacity key={m.id} style={s.dropdownItem} activeOpacity={0.7}
                          onPress={() => { setAMedId(m.id); setAMedPicker(false); }}>
                          <Text style={s.dropdownItemText}>{m.name}</Text>
                          <Text style={s.dropdownItemSub}>Cartridge {m.cartridgeSlot} · {m.quantity} tablets left</Text>
                        </TouchableOpacity>
                      ))
                    }
                  </View>
                )}

                <Text style={s.inputLabel}>Time</Text>
                <TimePicker value={aTime} onChange={setATime} />

                <Text style={s.inputLabel}>Repeat</Text>
                <View style={s.repeatRow}>
                  {(['daily', 'specific_days', 'one_time'] as RepeatType[]).map(r => (
                    <TouchableOpacity key={r} style={[s.repeatChip, aRepeat === r && s.repeatChipActive]}
                      activeOpacity={0.7} onPress={() => setARepeat(r)}>
                      <Text style={[s.repeatChipText, aRepeat === r && s.repeatChipTextActive]}>
                        {r === 'daily' ? 'Daily' : r === 'specific_days' ? 'Specific' : 'One-time'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {aRepeat === 'specific_days' && <DayPicker value={aDays} onChange={setADays} />}
                {aRepeat === 'one_time' && <DatePicker value={aDate} onChange={setADate} />}

                <Text style={s.inputLabel}>Quantity per Dose</Text>
                <QuantityStepper value={aQty} onChange={setAQty} />

                <View style={s.alarmRow}>
                  <Text style={s.alarmLabel}>Alarm / Reminder</Text>
                  <Switch value={aAlarm} onValueChange={setAAlarm}
                    trackColor={{ false: BORDER, true: PRIMARY + '80' }}
                    thumbColor={aAlarm ? PRIMARY : '#9CA3AF'} />
                </View>

                <View style={s.modalActions}>
                  <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={closeAdd}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.confirmBtn} activeOpacity={0.7} onPress={handleAdd}>
                    <Text style={s.confirmBtnText}>Add Schedule</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add low-stock warning */}
      <Modal visible={!!aWarn} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.warnIconBox}><Text style={s.warnIcon}>⚠️</Text></View>
            <Text style={s.modalTitle}>Low Stock Warning</Text>
            <Text style={s.warnMsg}>{aWarn}</Text>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={() => setAWarn('')}>
                <Text style={s.cancelBtnText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} activeOpacity={0.7} onPress={confirmAddWithWarn}>
                <Text style={s.confirmBtnText}>Add Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── EDIT MODAL ──────────────────────────────────────────────────────── */}
      <Modal visible={!!editTarget && !eWarn} transparent animationType="fade" onRequestClose={closeEdit}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.overlay}>
            <View style={s.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                <Text style={s.modalTitle}>Edit Schedule</Text>
                <Text style={s.modalSubtitle}>Update this dispensing schedule</Text>

                <Text style={s.inputLabel}>Select Device</Text>
                <TouchableOpacity style={s.picker} activeOpacity={0.7}
                  onPress={() => { setEDevPicker(v => !v); setEMedPicker(false); }}>
                  <Text style={eDeviceId ? s.pickerText : s.pickerPlaceholder} numberOfLines={1}>
                    {eDeviceId ? (() => { const d = devices.find(x => x.id === eDeviceId); return d ? `${d.name} · ${d.deviceUid}` : 'Select…'; })() : 'Select a device…'}
                  </Text>
                  <Text style={s.pickerChevron}>{eDevPicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {eDevPicker && (
                  <View style={s.dropdown}>
                    {devices.map(d => (
                      <TouchableOpacity key={d.id} style={s.dropdownItem} activeOpacity={0.7}
                        onPress={() => { setEDeviceId(d.id); setEMedId(''); setEDevPicker(false); }}>
                        <Text style={s.dropdownItemText}>{d.name}</Text>
                        <Text style={s.dropdownItemSub}>{d.deviceUid}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={s.inputLabel}>Select Medicine</Text>
                <TouchableOpacity style={[s.picker, !eDeviceId && s.pickerDisabled]}
                  activeOpacity={eDeviceId ? 0.7 : 1}
                  onPress={() => { if (eDeviceId) { setEMedPicker(v => !v); setEDevPicker(false); } }}>
                  <Text style={eMedId ? s.pickerText : s.pickerPlaceholder} numberOfLines={1}>
                    {eMedId ? (() => { const m = medicines.find(x => x.id === eMedId); return m ? `${m.name} — Cartridge ${m.cartridgeSlot}` : 'Select…'; })() : 'Select a medicine…'}
                  </Text>
                  <Text style={s.pickerChevron}>{eMedPicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {eMedPicker && eDeviceId && (
                  <View style={s.dropdown}>
                    {deviceMeds(eDeviceId).length === 0
                      ? <View style={s.dropdownItem}><Text style={s.dropdownItemSub}>No medicines with stock on this device.</Text></View>
                      : deviceMeds(eDeviceId).map(m => (
                        <TouchableOpacity key={m.id} style={s.dropdownItem} activeOpacity={0.7}
                          onPress={() => { setEMedId(m.id); setEMedPicker(false); }}>
                          <Text style={s.dropdownItemText}>{m.name}</Text>
                          <Text style={s.dropdownItemSub}>Cartridge {m.cartridgeSlot} · {m.quantity} tablets left</Text>
                        </TouchableOpacity>
                      ))
                    }
                  </View>
                )}

                <Text style={s.inputLabel}>Time</Text>
                <TimePicker value={eTime} onChange={setETime} />

                <Text style={s.inputLabel}>Repeat</Text>
                <View style={s.repeatRow}>
                  {(['daily', 'specific_days', 'one_time'] as RepeatType[]).map(r => (
                    <TouchableOpacity key={r} style={[s.repeatChip, eRepeat === r && s.repeatChipActive]}
                      activeOpacity={0.7} onPress={() => setERepeat(r)}>
                      <Text style={[s.repeatChipText, eRepeat === r && s.repeatChipTextActive]}>
                        {r === 'daily' ? 'Daily' : r === 'specific_days' ? 'Specific' : 'One-time'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {eRepeat === 'specific_days' && <DayPicker value={eDays} onChange={setEDays} />}
                {eRepeat === 'one_time' && <DatePicker value={eDate} onChange={setEDate} />}

                <Text style={s.inputLabel}>Quantity per Dose</Text>
                <QuantityStepper value={eQty} onChange={setEQty} />

                <View style={s.alarmRow}>
                  <Text style={s.alarmLabel}>Alarm / Reminder</Text>
                  <Switch value={eAlarm} onValueChange={setEAlarm}
                    trackColor={{ false: BORDER, true: PRIMARY + '80' }}
                    thumbColor={eAlarm ? PRIMARY : '#9CA3AF'} />
                </View>

                <View style={s.modalActions}>
                  <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={closeEdit}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.confirmBtn} activeOpacity={0.7} onPress={handleEdit}>
                    <Text style={s.confirmBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit low-stock warning */}
      <Modal visible={!!eWarn} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.warnIconBox}><Text style={s.warnIcon}>⚠️</Text></View>
            <Text style={s.modalTitle}>Low Stock Warning</Text>
            <Text style={s.warnMsg}>{eWarn}</Text>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={() => setEWarn('')}>
                <Text style={s.cancelBtnText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} activeOpacity={0.7} onPress={confirmEditWithWarn}>
                <Text style={s.confirmBtnText}>Save Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DELETE MODAL ──────────────────────────────────────────────────── */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.deleteIconBox}><Text style={s.deleteIconEmoji}>🗑</Text></View>
            <Text style={s.deleteTitleCenter}>Delete Schedule?</Text>
            <Text style={s.deleteMessage}>
              This will permanently remove the{' '}
              <Text style={s.deleteHighlight}>{deleteTarget ? fmt24to12(deleteTarget.time) : ''}</Text>
              {' '}schedule for{' '}
              <Text style={s.deleteHighlight}>
                {deleteTarget ? (medicines.find(m => m.id === deleteTarget.medicineId)?.name ?? 'this medicine') : ''}
              </Text>.
            </Text>
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
  content:   { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 56 },

  // Header — three-column with fixed-width sides so title stays centred
  header:     {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backBtn:    { width: 64, paddingVertical: 6 },
  backText:   { fontSize: 16, color: PRIMARY, fontWeight: '600' },
  title:      { flex: 1, fontSize: 20, fontWeight: '700', color: TEXT_DARK, textAlign: 'center' },
  addBtn:     {
    width: 64, alignItems: 'flex-end',
    backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Upcoming button — full-width tappable card
  upcomingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: CARD_BG, borderRadius: 14, padding: 16, marginBottom: 24,
    borderWidth: 1.5, borderColor: PRIMARY + '40',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  upcomingBtnLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  upcomingBtnIcon:  { fontSize: 26, marginRight: 12 },
  upcomingBtnTitle: { fontSize: 15, fontWeight: '700', color: PRIMARY, marginBottom: 2 },
  upcomingBtnSub:   { fontSize: 12, color: TEXT_MUTED },
  upcomingBtnArrow: { fontSize: 22, color: PRIMARY, fontWeight: '700', marginLeft: 8 },

  // Empty state
  emptyState:   { alignItems: 'center', paddingVertical: 64 },
  emptyIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyIcon:    { fontSize: 32 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
  emptyDesc:    { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24, marginBottom: 24 },
  emptyBtn:     { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  // Device sections
  sections:      { gap: 24 },
  section:       {},
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIconBox:{ width: 38, height: 38, borderRadius: 10, backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  sectionIcon:   { fontSize: 15, fontWeight: '700', color: PRIMARY },
  sectionMeta:   { flex: 1 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  sectionUid:    { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  sectionEmpty:  { fontSize: 13, color: TEXT_MUTED, paddingLeft: 48, fontStyle: 'italic' },
  schedList:     { gap: 10 },

  // Schedule card
  schedCard:     { backgroundColor: CARD_BG, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  schedCardTop:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  schedTimeBlock:{ marginRight: 12, alignItems: 'flex-start', paddingTop: 2, minWidth: 72, flexShrink: 0 },
  schedTime:     { fontSize: 17, fontWeight: '800', color: PRIMARY, letterSpacing: -0.5 },
  schedInfo:     { flex: 1, minWidth: 0 },
  schedMedName:  { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 6, lineHeight: 19 },
  schedDose:     { fontWeight: '400', color: TEXT_MUTED },
  schedBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 4 },
  repeatBadge:   { backgroundColor: PRIMARY + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  repeatBadgeText:{ fontSize: 11, fontWeight: '600', color: PRIMARY },
  lowBadge:      { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  lowBadgeText:  { fontSize: 11, fontWeight: '600', color: '#D97706' },
  dosesLeft:     { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  alarmIcon:     { fontSize: 18, marginLeft: 6, marginTop: 2, flexShrink: 0 },
  alarmIconOff:  { opacity: 0.4 },
  schedActions:  { flexDirection: 'row', gap: 8 },
  editBtn:       { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: '#F3F4F6' },
  editBtnText:   { fontSize: 13, fontWeight: '600', color: TEXT_DARK },
  deleteBtn:     { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: '#FEE2E2' },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },

  // Modal
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  modalCard:     { backgroundColor: CARD_BG, borderRadius: 20, padding: 20, maxHeight: '92%' },
  modalTitle:    { fontSize: 19, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: TEXT_MUTED, marginBottom: 20 },

  // Form
  inputLabel: { fontSize: 13, fontWeight: '600', color: TEXT_DARK, marginBottom: 6, marginTop: 14 },

  // Picker
  picker:            { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#F9FAFB' },
  pickerDisabled:    { opacity: 0.45 },
  pickerText:        { flex: 1, fontSize: 14, color: TEXT_DARK },
  pickerPlaceholder: { flex: 1, fontSize: 14, color: '#9CA3AF' },
  pickerChevron:     { fontSize: 10, color: TEXT_MUTED, marginLeft: 6 },

  // Dropdown
  dropdown:         { borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, backgroundColor: CARD_BG, marginTop: 4, marginBottom: 4, overflow: 'hidden' },
  dropdownItem:     { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemText: { fontSize: 14, fontWeight: '600', color: TEXT_DARK },
  dropdownItemSub:  { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

  // Repeat chips — 3 equal chips on one row
  repeatRow:           { flexDirection: 'row', gap: 6, marginBottom: 10 },
  repeatChip:          { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#F9FAFB' },
  repeatChipActive:    { backgroundColor: PRIMARY, borderColor: PRIMARY },
  repeatChipText:      { fontSize: 12, fontWeight: '600', color: TEXT_MUTED },
  repeatChipTextActive:{ color: '#FFF' },

  // Day chips
  dayRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  dayChip:          { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#F9FAFB' },
  dayChipActive:    { backgroundColor: PRIMARY, borderColor: PRIMARY },
  dayChipText:      { fontSize: 12, fontWeight: '600', color: TEXT_MUTED },
  dayChipTextActive:{ color: '#FFF' },

  // Date picker — left/right arrows flush with card edge
  dateRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, backgroundColor: '#F9FAFB', overflow: 'hidden', marginBottom: 4 },
  dateBtn:     { paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY },
  dateBtnText: { fontSize: 22, color: '#FFF', fontWeight: '700', lineHeight: 26 },
  dateMid:     { flex: 1, alignItems: 'center' },
  dateValue:      { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  dateValuePast:  { color: '#EF4444' },
  datePastHint:   { fontSize: 11, color: '#EF4444', marginTop: 2 },

  // Stepper
  stepperRow:        { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, backgroundColor: '#F9FAFB', marginTop: 2 },
  stepBtn:           { flexShrink: 0, width: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY, borderRadius: 9, margin: 3 },
  stepBtnDisabled:   { backgroundColor: '#D1D5DB' },
  stepBtnText:       { fontSize: 20, fontWeight: '700', color: '#FFF', lineHeight: 24, textAlign: 'center' },
  stepBtnTextDisabled:{ color: '#9CA3AF' },
  stepInput:         { flex: 1, minWidth: 40, textAlign: 'center', fontSize: 17, fontWeight: '700', color: TEXT_DARK, paddingVertical: 12, paddingHorizontal: 4 },
  stepperHint:       { fontSize: 12, color: TEXT_MUTED, marginTop: 5, marginLeft: 2 },

  // Alarm row
  alarmRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 4, paddingHorizontal: 2 },
  alarmLabel: { fontSize: 13, fontWeight: '600', color: TEXT_DARK },

  // Modal actions
  modalActions:   { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 4 },
  cancelBtn:      { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelBtnText:  { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  confirmBtn:     { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: PRIMARY },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  // Warning modal
  warnIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  warnIcon:    { fontSize: 26 },
  warnMsg:     { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 21, marginBottom: 8 },

  // Delete modal
  deleteIconBox:     { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  deleteIconEmoji:   { fontSize: 28 },
  deleteTitleCenter: { fontSize: 19, fontWeight: '700', color: TEXT_DARK, textAlign: 'center', marginBottom: 10 },
  deleteMessage:     { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 21, marginBottom: 12 },
  deleteHighlight:   { color: TEXT_DARK, fontWeight: '700' },
  deleteUndoneText:  { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
  deleteConfirmBtn:  { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: '#DC2626' },
  deleteConfirmText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});

// ─── TimePicker styles ────────────────────────────────────────────────────────
const ts = StyleSheet.create({
  timeRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 12 },
  timeUnit:    { alignItems: 'center', width: 68 },
  timeBtn:     { paddingVertical: 4, paddingHorizontal: 16 },
  timeBtnText: { fontSize: 16, color: PRIMARY, fontWeight: '700' },
  timeDisplay: { alignItems: 'center', paddingVertical: 4 },
  timeValue:   { fontSize: 28, fontWeight: '800', color: TEXT_DARK, letterSpacing: 1 },
  timeLabel:   { fontSize: 10, color: TEXT_MUTED, fontWeight: '600', marginTop: 2 },
  timeSep:     { fontSize: 28, fontWeight: '800', color: TEXT_DARK, marginHorizontal: 4, marginBottom: 16 },
  timeAmPm:    { marginLeft: 12, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: PRIMARY + '18', borderRadius: 8 },
  timeAmPmText:{ fontSize: 14, fontWeight: '700', color: PRIMARY },
});
