import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Switch, Platform, Alert, ActivityIndicator,
  KeyboardAvoidingView, SafeAreaView,
} from 'react-native';
import { scheduleApi, CreateScheduleBody, ApiSchedule } from '../services/api';
import { Medicine } from './MedicinesScreen';
import Icon from '../components/Icon';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY    = '#0D9488';
const PRIMARY_LT = '#CCFBF1';
const BG         = '#F8FAFC';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER     = '#E2E8F0';
const DANGER     = '#DC2626';
const WARN_BG    = '#FEF3C7';
const WARN_TEXT  = '#92400E';

// ─── Types ────────────────────────────────────────────────────────────────────
type RepeatType = 'daily' | 'weekly' | 'one_time';
type WeekDay    = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
const ALL_DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Device { id: string; name: string; deviceUid: string; cartridgeCount: number; }

interface ScheduleScreenProps {
  devices:           Device[];
  medicines:         Medicine[];
  schedules:         ApiSchedule[];
  onSchedulesChange: (s: ApiSchedule[]) => void;
  onMedicinesChange: (m: Medicine[]) => void;
  onBack:            () => void;
  onViewUpcoming:    () => void;
  onRefresh:         () => Promise<void>;
}

// ─── Form state (shared by add & edit) ───────────────────────────────────────
interface FormState {
  deviceId:       string;
  medicineId:     string;
  hour:           number;   // 1–12
  minute:         number;   // 0–55 step 5
  isPM:           boolean;
  repeatType:     RepeatType;
  specificDays:   WeekDay[];
  oneTimeDate:    string;   // YYYY-MM-DD
  quantityPerDose:number;
  alarmEnabled:   boolean;
}

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const MAX_DOSE = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function to24(h: number, m: number, isPM: boolean): string {
  let h24 = h % 12;
  if (isPM) h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function from24(time: string): { hour: number; minute: number; isPM: boolean } {
  const [hStr, mStr] = time.split(':');
  const h24 = parseInt(hStr, 10);
  const m   = parseInt(mStr, 10);
  const isPM = h24 >= 12;
  const h12  = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour: h12, minute: m, isPM };
}

function fmt12(h: number, m: number, isPM: boolean): string {
  return `${h}:${String(m).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, mo, da] = iso.split('-').map(Number);
  return new Date(y, mo-1, da).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shiftDate(iso: string, days: number): string {
  const [y, mo, da] = iso.split('-').map(Number);
  const d = new Date(y, mo-1, da);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function repeatLabel(sc: ApiSchedule): string {
  if (sc.repeatType === 'daily') return 'Every day';
  if (sc.repeatType === 'specific_days') {
    const days = Array.isArray(sc.specificDays) ? sc.specificDays : [];
    return days.length ? days.join(', ') : 'Specific days';
  }
  return sc.oneTimeDate ? `Once · ${fmtDate(sc.oneTimeDate)}` : 'One-time';
}

function defaultForm(devices: Device[]): FormState {
  return {
    deviceId: devices[0]?.id ?? '',
    medicineId: '',
    hour: 8, minute: 0, isPM: false,
    repeatType: 'daily',
    specificDays: [],
    oneTimeDate: todayISO(),
    quantityPerDose: 1,
    alarmEnabled: true,
  };
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={fd.dotRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[fd.dot, i === current && fd.dotActive, i < current && fd.dotDone]} />
      ))}
    </View>
  );
}

// ─── AM/PM Clock time picker ─────────────────────────────────────────────────
function TimePicker({ hour, minute, isPM, onChange }: {
  hour: number; minute: number; isPM: boolean;
  onChange: (h: number, m: number, isPM: boolean) => void;
}) {
  const cycleH  = (dir: 1 | -1) => onChange(((hour - 1 + dir + 12) % 12) + 1, minute, isPM);
  const cycleM  = (dir: 1 | -1) => {
    const idx = MINUTES.indexOf(minute);
    onChange(hour, MINUTES[(idx + dir + MINUTES.length) % MINUTES.length], isPM);
  };

  return (
    <View style={fd.clockRow}>
      {/* Hour */}
      <View style={fd.clockUnit}>
        <TouchableOpacity style={fd.clockArrow} onPress={() => cycleH(1)} activeOpacity={0.7}>
          <Text style={fd.clockArrowTxt}>▲</Text>
        </TouchableOpacity>
        <View style={fd.clockDisplay}>
          <Text style={fd.clockVal}>{String(hour).padStart(2,'0')}</Text>
          <Text style={fd.clockLbl}>HR</Text>
        </View>
        <TouchableOpacity style={fd.clockArrow} onPress={() => cycleH(-1)} activeOpacity={0.7}>
          <Text style={fd.clockArrowTxt}>▼</Text>
        </TouchableOpacity>
      </View>

      <Text style={fd.clockSep}>:</Text>

      {/* Minute */}
      <View style={fd.clockUnit}>
        <TouchableOpacity style={fd.clockArrow} onPress={() => cycleM(1)} activeOpacity={0.7}>
          <Text style={fd.clockArrowTxt}>▲</Text>
        </TouchableOpacity>
        <View style={fd.clockDisplay}>
          <Text style={fd.clockVal}>{String(minute).padStart(2,'0')}</Text>
          <Text style={fd.clockLbl}>MIN</Text>
        </View>
        <TouchableOpacity style={fd.clockArrow} onPress={() => cycleM(-1)} activeOpacity={0.7}>
          <Text style={fd.clockArrowTxt}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* AM / PM toggle */}
      <View style={fd.ampmBox}>
        <TouchableOpacity
          style={[fd.ampmBtn, !isPM && fd.ampmBtnActive]}
          onPress={() => onChange(hour, minute, false)}
          activeOpacity={0.7}
        >
          <Text style={[fd.ampmTxt, !isPM && fd.ampmTxtActive]}>AM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[fd.ampmBtn, isPM && fd.ampmBtnActive]}
          onPress={() => onChange(hour, minute, true)}
          activeOpacity={0.7}
        >
          <Text style={[fd.ampmTxt, isPM && fd.ampmTxtActive]}>PM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Quantity stepper ─────────────────────────────────────────────────────────
function QuantityStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={fd.qtyRow}>
      <TouchableOpacity
        style={[fd.qtyBtn, value <= 1 && fd.qtyBtnOff]}
        onPress={() => value > 1 && onChange(value - 1)}
        activeOpacity={0.7}
      >
        <Text style={[fd.qtyBtnTxt, value <= 1 && fd.qtyBtnTxtOff]}>−</Text>
      </TouchableOpacity>
      <View style={fd.qtyDisplay}>
        <Text style={fd.qtyVal}>{value}</Text>
        <Text style={fd.qtyLbl}>tablet{value !== 1 ? 's' : ''}</Text>
      </View>
      <TouchableOpacity
        style={[fd.qtyBtn, value >= MAX_DOSE && fd.qtyBtnOff]}
        onPress={() => value < MAX_DOSE && onChange(value + 1)}
        activeOpacity={0.7}
      >
        <Text style={[fd.qtyBtnTxt, value >= MAX_DOSE && fd.qtyBtnTxtOff]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── 4-step Schedule Form ─────────────────────────────────────────────────────
// Step 0 – Pick medicine   Step 1 – Set time   Step 2 – Set repeat   Step 3 – Review & save
function ScheduleForm({
  title, form, setForm, devices, medicines,
  onCancel, onSave, saving,
}: {
  title:    string;
  form:     FormState;
  setForm:  (f: FormState) => void;
  devices:  Device[];
  medicines:Medicine[];
  onCancel: () => void;
  onSave:   () => void;
  saving:   boolean;
}) {
  const [step, setStep] = useState(0);
  const TOTAL = 4;

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm({ ...form, [k]: v }), [form, setForm]);

  const deviceMeds = medicines.filter(m => m.deviceId === form.deviceId && m.quantity > 0);
  const selMed     = medicines.find(m => m.id === form.medicineId);
  const selDevice  = devices.find(d => d.id === form.deviceId);
  const time24     = to24(form.hour, form.minute, form.isPM);

  // Validate before advancing
  const canNext = (): boolean => {
    if (step === 0) return !!form.deviceId && !!form.medicineId;
    if (step === 2 && form.repeatType === 'weekly') return form.specificDays.length > 0;
    return true;
  };

  const next = () => { if (canNext()) setStep(s => Math.min(s + 1, TOTAL - 1)); };
  const back = () => setStep(s => Math.max(s - 1, 0));

  // ── Step 0: Select medicine ─────────────────────────────────────────────
  const renderStep0 = () => (
    <View>
      <Text style={fd.stepHeading}>Which medicine?</Text>
      <Text style={fd.stepSub}>Select the device, then the medicine to dispense.</Text>

      <Text style={fd.lbl}>Dispenser Device</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fd.chipScroll}>
        {devices.map(d => (
          <TouchableOpacity
            key={d.id}
            style={[fd.deviceChip, form.deviceId === d.id && fd.deviceChipActive]}
            onPress={() => setForm({ ...form, deviceId: d.id, medicineId: '' })}
            activeOpacity={0.7}
          >
            <Text style={[fd.deviceChipTxt, form.deviceId === d.id && fd.deviceChipTxtActive]} numberOfLines={1}>
              {d.name}
            </Text>
            <Text style={[fd.deviceChipSub, form.deviceId === d.id && fd.deviceChipSubActive]}>
              {d.deviceUid}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={fd.lbl}>Medicine</Text>
      {deviceMeds.length === 0 ? (
        <View style={fd.emptyMeds}>
          <Text style={fd.emptyMedsTxt}>
            {form.deviceId ? 'No medicines with stock on this device.' : 'Select a device first.'}
          </Text>
        </View>
      ) : (
        <View style={fd.medGrid}>
          {deviceMeds.map(m => {
            const active = form.medicineId === m.id;
            const low    = m.quantity < 10;
            return (
              <TouchableOpacity
                key={m.id}
                style={[fd.medCard, active && fd.medCardActive]}
                onPress={() => set('medicineId', m.id)}
                activeOpacity={0.7}
              >
                <View style={[fd.medDot, { backgroundColor: active ? '#FFF' : PRIMARY }]} />
                <Text style={[fd.medCardName, active && fd.medCardNameActive]} numberOfLines={2}>{m.name}</Text>
                <Text style={[fd.medCardSub, active && fd.medCardSubActive]}>Slot {m.cartridgeSlot}</Text>
                <View style={[fd.stockBar, { width: `${Math.min(100, (m.quantity / 8) * 100)}%` as any }]} />
                <Text style={[fd.stockTxt, low && fd.stockTxtLow, active && { color: '#FFF' }]}>
                  {m.quantity} left{low ? ' !' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  // ── Step 1: Set time ────────────────────────────────────────────────────
  const renderStep1 = () => (
    <View>
      <Text style={fd.stepHeading}>What time?</Text>
      <Text style={fd.stepSub}>Choose when the dispenser should release the dose.</Text>
      <View style={fd.timeWrap}>
        <TimePicker
          hour={form.hour} minute={form.minute} isPM={form.isPM}
          onChange={(h, m, p) => setForm({ ...form, hour: h, minute: m, isPM: p })}
        />
      </View>

      {/* Quick-select presets */}
      <Text style={fd.lbl}>Quick presets</Text>
      <View style={fd.presetRow}>
        {[
          { label: 'Morning',   h: 8,  m: 0,  pm: false },
          { label: 'Noon',      h: 12, m: 0,  pm: false },
          { label: 'Afternoon', h: 3,  m: 0,  pm: true  },
          { label: 'Night',     h: 9,  m: 0,  pm: true  },
        ].map(p => {
          const active = form.hour === p.h && form.minute === p.m && form.isPM === p.pm;
          return (
            <TouchableOpacity
              key={p.label}
              style={[fd.presetChip, active && fd.presetChipActive]}
              onPress={() => setForm({ ...form, hour: p.h, minute: p.m, isPM: p.pm })}
              activeOpacity={0.7}
            >
              <Text style={[fd.presetTxt, active && fd.presetTxtActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={fd.alarmRow}>
        <View>
          <Text style={fd.lbl}>Alarm reminder</Text>
          <Text style={fd.alarmSub}>Notify when it's time to take</Text>
        </View>
        <Switch
          value={form.alarmEnabled}
          onValueChange={v => set('alarmEnabled', v)}
          trackColor={{ false: BORDER, true: PRIMARY + '80' }}
          thumbColor={form.alarmEnabled ? PRIMARY : '#9CA3AF'}
        />
      </View>
    </View>
  );

  // ── Step 2: Repeat ──────────────────────────────────────────────────────
  const renderStep2 = () => (
    <View>
      <Text style={fd.stepHeading}>How often?</Text>
      <Text style={fd.stepSub}>Choose the repeat pattern for this schedule.</Text>

      <View style={fd.repeatCards}>
        {([
          { key: 'daily',    iconName: 'refresh-outline',       label: 'Every Day',     sub: 'Repeats daily at the set time' },
          { key: 'weekly',   iconName: 'calendar-outline',      label: 'Specific Days', sub: 'Pick days of the week' },
          { key: 'one_time', iconName: 'radio-button-on-outline', label: 'Just Once',   sub: 'Dispense on a single date' },
        ] as { key: RepeatType; iconName: string; label: string; sub: string }[]).map(opt => {
          const active = form.repeatType === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[fd.repeatCard, active && fd.repeatCardActive]}
              onPress={() => set('repeatType', opt.key)}
              activeOpacity={0.7}
            >
              <View style={[fd.repeatIconBox, active && fd.repeatIconBoxActive]}>
                <Icon name={opt.iconName as any} size={20} color={active ? '#fff' : PRIMARY} />
              </View>
              <View style={fd.repeatCardBody}>
                <Text style={[fd.repeatLabel, active && fd.repeatLabelActive]}>{opt.label}</Text>
                <Text style={[fd.repeatSub, active && fd.repeatSubActive]}>{opt.sub}</Text>
              </View>
              <View style={[fd.radioOuter, active && fd.radioOuterActive]}>
                {active && <View style={fd.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {form.repeatType === 'weekly' && (
        <>
          <Text style={fd.lbl}>Select days</Text>
          <View style={fd.dayRow}>
            {ALL_DAYS.map(day => {
              const active = form.specificDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[fd.dayChip, active && fd.dayChipActive]}
                  onPress={() => set('specificDays',
                    active ? form.specificDays.filter(d => d !== day) : [...form.specificDays, day]
                  )}
                  activeOpacity={0.7}
                >
                  <Text style={[fd.dayChipTxt, active && fd.dayChipTxtActive]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {form.repeatType === 'one_time' && (
        <>
          <Text style={fd.lbl}>Date</Text>
          <View style={fd.dateRow}>
            <TouchableOpacity style={fd.dateArrow} onPress={() => set('oneTimeDate', shiftDate(form.oneTimeDate, -1))} activeOpacity={0.7}>
              <Text style={fd.dateArrowTxt}>‹</Text>
            </TouchableOpacity>
            <Text style={fd.dateVal}>{fmtDate(form.oneTimeDate)}</Text>
            <TouchableOpacity style={fd.dateArrow} onPress={() => set('oneTimeDate', shiftDate(form.oneTimeDate, 1))} activeOpacity={0.7}>
              <Text style={fd.dateArrowTxt}>›</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Text style={fd.lbl}>Quantity per dose</Text>
      <QuantityStepper value={form.quantityPerDose} onChange={v => set('quantityPerDose', v)} />
    </View>
  );

  // ── Step 3: Review ──────────────────────────────────────────────────────
  const renderStep3 = () => {
    const repeatStr = form.repeatType === 'daily'
      ? 'Every day'
      : form.repeatType === 'weekly'
        ? form.specificDays.join(', ')
        : `Once on ${fmtDate(form.oneTimeDate)}`;

    const rows: { iconName: string; label: string; value: string }[] = [
      { iconName: 'medkit-outline',       label: 'Medicine', value: selMed?.name ?? '—' },
      { iconName: 'hardware-chip-outline',label: 'Device',   value: selDevice?.name ?? '—' },
      { iconName: 'time-outline',         label: 'Time',     value: fmt12(form.hour, form.minute, form.isPM) },
      { iconName: 'refresh-outline',      label: 'Repeat',   value: repeatStr },
      { iconName: 'fitness-outline',      label: 'Dose',     value: `${form.quantityPerDose} tablet${form.quantityPerDose > 1 ? 's' : ''}` },
      { iconName: form.alarmEnabled ? 'notifications-outline' : 'notifications-off-outline', label: 'Alarm', value: form.alarmEnabled ? 'On' : 'Off' },
    ];

    const low = selMed && form.quantityPerDose > 0 && (selMed.quantity / form.quantityPerDose) < 5;

    return (
      <View>
        <Text style={fd.stepHeading}>Review &amp; save</Text>
        <Text style={fd.stepSub}>Confirm the details before saving.</Text>

        <View style={fd.reviewCard}>
          {rows.map((r, i) => (
            <View key={r.label} style={[fd.reviewRow, i > 0 && fd.reviewRowBorder]}>
              <View style={fd.reviewIconBox}>
                <Icon name={r.iconName as any} size={16} color={PRIMARY} />
              </View>
              <Text style={fd.reviewLbl}>{r.label}</Text>
              <Text style={fd.reviewVal} numberOfLines={1}>{r.value}</Text>
            </View>
          ))}
        </View>

        {low && (
          <View style={fd.warnBox}>
            <Icon name="warning-outline" size={15} color="#92400E" />
            <Text style={fd.warnTxt}>
              Low stock — only ~{Math.floor(selMed!.quantity / form.quantityPerDose)} doses left. Refill soon.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const stepContent = [renderStep0, renderStep1, renderStep2, renderStep3];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={fd.backdrop}>
        <View style={fd.sheet}>
          {/* Header */}
          <View style={fd.sheetHeader}>
            <Text style={fd.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7} style={fd.closeBtn}>
              <Text style={fd.closeBtnTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <StepDots current={step} total={TOTAL} />

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={fd.sheetBody}
          >
            {stepContent[step]?.()}
          </ScrollView>

          {/* Footer navigation */}
          <View style={fd.sheetFooter}>
            {step > 0 ? (
              <TouchableOpacity style={fd.backStepBtn} onPress={back} activeOpacity={0.7}>
                <Icon name="chevron-back" size={16} color={TEXT_MUTED} />
                <Text style={fd.backStepTxt}>Back</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={fd.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
                <Text style={fd.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            )}

            {step < TOTAL - 1 ? (
              <TouchableOpacity
                style={[fd.nextBtn, !canNext() && fd.nextBtnOff]}
                onPress={next}
                activeOpacity={0.7}
                disabled={!canNext()}
              >
                <Text style={fd.nextTxt}>Next →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={fd.saveBtn} onPress={onSave} activeOpacity={0.7} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={fd.saveTxt}>Save Schedule</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Schedule Card ────────────────────────────────────────────────────────────
function ScheduleCard({ sc, medicines, onEdit, onDelete }: {
  sc: ApiSchedule; medicines: Medicine[];
  onEdit: (s: ApiSchedule) => void; onDelete: (s: ApiSchedule) => void;
}) {
  const med = medicines.find(m => m.id === sc.medicineId);
  const time24 = sc.time ?? '00:00';
  const { hour, minute, isPM } = from24(time24);

  return (
    <View style={s.card}>
      <View style={s.cardLeft}>
        <Text style={s.cardTime}>{fmt12(hour, minute, isPM)}</Text>
        <Text style={s.cardRepeat}>{repeatLabel(sc)}</Text>
      </View>
      <View style={s.cardMid}>
        <Text style={s.cardMedName} numberOfLines={2}>{med?.name ?? '—'}</Text>
        <View style={s.cardDoseRow}>
          <Text style={s.cardDose}>
            {sc.quantityPerDose} tablet{sc.quantityPerDose !== 1 ? 's' : ''}
          </Text>
          <Icon
            name={sc.alarmEnabled ? 'notifications-outline' : 'notifications-off-outline'}
            size={14}
            color={sc.alarmEnabled ? PRIMARY : '#9CA3AF'}
          />
        </View>
      </View>
      <View style={s.cardActions}>
        <TouchableOpacity style={s.editBtn} onPress={() => onEdit(sc)} activeOpacity={0.7}>
          <Text style={s.editBtnTxt}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.delBtn} onPress={() => onDelete(sc)} activeOpacity={0.7}>
          <Text style={s.delBtnTxt}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ScheduleScreen({
  devices, medicines, schedules,
  onSchedulesChange, onMedicinesChange,
  onBack, onViewUpcoming, onRefresh,
}: ScheduleScreenProps) {

  const [formMode,   setFormMode]   = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<ApiSchedule | null>(null);
  const [form,       setForm]       = useState<FormState>(() => defaultForm(devices));
  const [saving,     setSaving]     = useState(false);
  const [delTarget,  setDelTarget]  = useState<ApiSchedule | null>(null);
  const [deleting,   setDeleting]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const openAdd = () => {
    setForm(defaultForm(devices));
    setEditTarget(null);
    setFormMode('add');
  };

  const openEdit = (sc: ApiSchedule) => {
    const { hour, minute, isPM } = from24(sc.time ?? '08:00');
    // map API repeatType 'specific_days' → 'weekly' for UI
    const repeatType: RepeatType =
      sc.repeatType === 'specific_days' ? 'weekly'
      : sc.repeatType === 'one_time'    ? 'one_time'
      : 'daily';
    setForm({
      deviceId: sc.deviceId,
      medicineId: sc.medicineId,
      hour, minute, isPM,
      repeatType,
      specificDays: Array.isArray(sc.specificDays) ? (sc.specificDays as WeekDay[]) : [],
      oneTimeDate:  sc.oneTimeDate || todayISO(),
      quantityPerDose: sc.quantityPerDose,
      alarmEnabled: sc.alarmEnabled,
    });
    setEditTarget(sc);
    setFormMode('edit');
  };

  const closeForm = () => { setFormMode(null); setEditTarget(null); };

  // map UI repeatType back to API value
  const apiRepeatType = (r: RepeatType): string =>
    r === 'weekly' ? 'specific_days' : r;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: CreateScheduleBody = {
        deviceId:       form.deviceId,
        medicineId:     form.medicineId,
        time:           to24(form.hour, form.minute, form.isPM),
        repeatType:     apiRepeatType(form.repeatType) as CreateScheduleBody['repeatType'],
        specificDays:   form.repeatType === 'weekly' ? form.specificDays : [],
        oneTimeDate:    form.repeatType === 'one_time' ? form.oneTimeDate : '',
        quantityPerDose: form.quantityPerDose,
        alarmEnabled:   form.alarmEnabled,
      };
      if (formMode === 'edit' && editTarget) {
        await scheduleApi.update(editTarget.id, body);
      } else {
        await scheduleApi.create(body);
      }
      closeForm();
      await onRefresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await scheduleApi.delete(delTarget.id);
      setDelTarget(null);
      await onRefresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  // Group schedules by device, sorted by time
  const byDevice = devices.map(d => ({
    device: d,
    items: schedules
      .filter(sc => sc.deviceId === d.id)
      .sort((a, b) => toMinutes(a.time ?? '00:00') - toMinutes(b.time ?? '00:00')),
  })).filter(g => g.items.length > 0);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.7}>
            <Icon name="chevron-back" size={22} color={PRIMARY} />
            <Text style={s.backTxt}>Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Schedule</Text>
          <TouchableOpacity onPress={openAdd} style={s.addBtn} activeOpacity={0.7}>
            <Icon name="add" size={18} color="#fff" />
            <Text style={s.addBtnTxt}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Error banner */}
        {error && (
          <View style={s.errBanner}>
            <Text style={s.errTxt}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Text style={s.errDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming button */}
        <TouchableOpacity style={s.upcomingBtn} onPress={onViewUpcoming} activeOpacity={0.85}>
          <View style={s.upcomingIconBox}>
            <Icon name="calendar-outline" size={22} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.upcomingTitle}>Upcoming Schedules</Text>
            <Text style={s.upcomingSub}>View doses until stock runs out</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={PRIMARY} />
        </TouchableOpacity>

        {/* Empty state */}
        {schedules.length === 0 && (
          <View style={s.empty}>
            <View style={s.emptyIconBox}>
              <Icon name="calendar-outline" size={36} color={PRIMARY} />
            </View>
            <Text style={s.emptyTitle}>No schedules yet</Text>
            <Text style={s.emptySub}>Tap "Add" to set up your first dispensing schedule.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openAdd} activeOpacity={0.7}>
              <Text style={s.emptyBtnTxt}>+ Create Schedule</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Schedule list grouped by device */}
        {byDevice.map(({ device, items }) => (
          <View key={device.id} style={s.group}>
            <View style={s.groupHeader}>
              <View style={s.groupIconBox}><Icon name="hardware-chip-outline" size={18} color={PRIMARY} /></View>
              <View>
                <Text style={s.groupName}>{device.name}</Text>
                <Text style={s.groupUid}>{device.deviceUid}</Text>
              </View>
            </View>
            {items.map(sc => (
              <ScheduleCard
                key={sc.id} sc={sc} medicines={medicines}
                onEdit={openEdit} onDelete={setDelTarget}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Form modal (add / edit) */}
      <Modal visible={formMode !== null} transparent animationType="slide" onRequestClose={closeForm}>
        <ScheduleForm
          title={formMode === 'edit' ? 'Edit Schedule' : 'New Schedule'}
          form={form} setForm={setForm}
          devices={devices} medicines={medicines}
          onCancel={closeForm} onSave={handleSave} saving={saving}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal visible={!!delTarget} transparent animationType="fade" onRequestClose={() => setDelTarget(null)}>
        <View style={s.delOverlay}>
          <View style={s.delCard}>
            <Text style={s.delTitle}>Delete Schedule?</Text>
            <Text style={s.delMsg}>
              Remove the{' '}
              <Text style={s.delBold}>{delTarget ? fmt12(...Object.values(from24(delTarget.time ?? '00:00')) as [number,number,boolean]) : ''}</Text>
              {' '}schedule for{' '}
              <Text style={s.delBold}>{medicines.find(m => m.id === delTarget?.medicineId)?.name ?? '—'}</Text>?
              {'\n'}This cannot be undone.
            </Text>
            <View style={s.delActions}>
              <TouchableOpacity style={s.delCancelBtn} onPress={() => setDelTarget(null)} activeOpacity={0.7}>
                <Text style={s.delCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.delConfirmBtn} onPress={handleDelete} activeOpacity={0.7} disabled={deleting}>
                {deleting
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={s.delConfirmTxt}>Delete</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Main screen styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },
  content:   { padding: 16, paddingBottom: 48 },

  header:   { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingRight: 8, minWidth: 70 },
  backTxt:  { fontSize: 15, color: PRIMARY, fontWeight: '600', marginLeft: 2 },
  title:    { flex: 1, fontSize: 20, fontWeight: '700', color: TEXT_DARK, textAlign: 'center' },
  addBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: 70, justifyContent: 'center' },
  addBtnTxt:{ color: '#FFF', fontSize: 14, fontWeight: '600' },

  errBanner:  { flexDirection: 'row', backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 12, gap: 8 },
  errTxt:     { flex: 1, fontSize: 13, color: DANGER, fontWeight: '500' },
  errDismiss: { fontSize: 14, color: DANGER, fontWeight: '700', paddingHorizontal: 4 },

  upcomingBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1.5, borderColor: PRIMARY + '40', gap: 12 },
  upcomingIconBox:{ width: 40, height: 40, borderRadius: 10, backgroundColor: PRIMARY + '15', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  upcomingTitle:  { fontSize: 14, fontWeight: '700', color: PRIMARY },
  upcomingSub:    { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },

  empty:      { alignItems: 'center', paddingVertical: 56 },
  emptyIconBox:{ width: 72, height: 72, borderRadius: 36, backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', paddingHorizontal: 32, marginBottom: 24, lineHeight: 20 },
  emptyBtn:   { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnTxt:{ color: '#FFF', fontSize: 15, fontWeight: '600' },

  group:       { marginBottom: 24 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  groupIconBox:{ width: 36, height: 36, borderRadius: 10, backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  groupName:   { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  groupUid:    { fontSize: 12, color: TEXT_MUTED },

  card:       { backgroundColor: CARD_BG, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardLeft:   { marginRight: 14, alignItems: 'flex-start', minWidth: 78, flexShrink: 0 },
  cardTime:   { fontSize: 16, fontWeight: '800', color: PRIMARY, letterSpacing: -0.5 },
  cardRepeat: { fontSize: 11, color: TEXT_MUTED, marginTop: 3, fontWeight: '500' },
  cardMid:    { flex: 1, minWidth: 0 },
  cardMedName:{ fontSize: 14, fontWeight: '600', color: TEXT_DARK, marginBottom: 4 },
  cardDoseRow:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDose:   { fontSize: 12, color: TEXT_MUTED },
  cardActions:{ marginLeft: 10, gap: 6, alignItems: 'flex-end' },
  editBtn:    { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnTxt: { fontSize: 12, fontWeight: '600', color: TEXT_DARK },
  delBtn:     { backgroundColor: '#FEE2E2', width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  delBtnTxt:  { fontSize: 13, color: DANGER, fontWeight: '700' },

  delOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  delCard:       { backgroundColor: CARD_BG, borderRadius: 20, padding: 24 },
  delTitle:      { fontSize: 18, fontWeight: '700', color: TEXT_DARK, textAlign: 'center', marginBottom: 12 },
  delMsg:        { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  delBold:       { color: TEXT_DARK, fontWeight: '700' },
  delActions:    { flexDirection: 'row', gap: 10 },
  delCancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: '#F3F4F6' },
  delCancelTxt:  { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  delConfirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: DANGER },
  delConfirmTxt: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});

// ─── Form / sheet styles ──────────────────────────────────────────────────────
const fd = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: CARD_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingBottom: Platform.OS === 'ios' ? 28 : 16 },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: TEXT_DARK },
  closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  closeBtnTxt:{ fontSize: 13, color: TEXT_MUTED, fontWeight: '700' },

  dotRow:     { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 16 },
  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: BORDER },
  dotActive:  { backgroundColor: PRIMARY, width: 20, borderRadius: 4 },
  dotDone:    { backgroundColor: PRIMARY + '60' },

  sheetBody:  { paddingHorizontal: 20, paddingBottom: 8 },
  sheetFooter:{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },

  backStepBtn:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 13, borderRadius: 11, backgroundColor: '#F3F4F6' },
  backStepTxt:{ fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelTxt:  { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  nextBtn:    { flex: 2, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: PRIMARY },
  nextBtnOff: { backgroundColor: BORDER },
  nextTxt:    { fontSize: 14, fontWeight: '700', color: '#FFF' },
  saveBtn:    { flex: 2, paddingVertical: 13, borderRadius: 11, alignItems: 'center', backgroundColor: PRIMARY },
  saveTxt:    { fontSize: 14, fontWeight: '700', color: '#FFF' },

  stepHeading:{ fontSize: 17, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  stepSub:    { fontSize: 13, color: TEXT_MUTED, marginBottom: 18, lineHeight: 19 },
  lbl:        { fontSize: 13, fontWeight: '600', color: TEXT_DARK, marginBottom: 8, marginTop: 14 },

  // Device chips
  chipScroll:   { gap: 8, paddingBottom: 4 },
  deviceChip:   { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#F9FAFB', minWidth: 120 },
  deviceChipActive: { borderColor: PRIMARY, backgroundColor: PRIMARY_LT },
  deviceChipTxt:{ fontSize: 13, fontWeight: '600', color: TEXT_DARK },
  deviceChipTxtActive: { color: PRIMARY },
  deviceChipSub:{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  deviceChipSubActive: { color: PRIMARY + 'AA' },

  // Medicine grid
  medGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  medCard:    { width: '47%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: BORDER },
  medCardActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  medDot:     { width: 10, height: 10, borderRadius: 5, marginBottom: 8 },
  medCardName:{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 4, lineHeight: 18 },
  medCardNameActive: { color: '#FFF' },
  medCardSub: { fontSize: 11, color: TEXT_MUTED, marginBottom: 6 },
  medCardSubActive: { color: '#CCFBF1' },
  stockBar:   { height: 3, backgroundColor: PRIMARY + '40', borderRadius: 2, marginBottom: 4 },
  stockTxt:   { fontSize: 11, color: TEXT_MUTED, fontWeight: '500' },
  stockTxtLow:{ color: '#D97706' },

  emptyMeds:  { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: BORDER },
  emptyMedsTxt:{ fontSize: 13, color: TEXT_MUTED, textAlign: 'center' },

  // Clock time picker
  timeWrap:   { backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1.5, borderColor: BORDER, padding: 12, marginBottom: 4 },
  clockRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  clockUnit:  { alignItems: 'center', width: 72 },
  clockArrow: { paddingVertical: 6, paddingHorizontal: 20 },
  clockArrowTxt: { fontSize: 18, color: PRIMARY, fontWeight: '700' },
  clockDisplay:  { alignItems: 'center', paddingVertical: 4 },
  clockVal:   { fontSize: 32, fontWeight: '800', color: TEXT_DARK, letterSpacing: 0 },
  clockLbl:   { fontSize: 10, color: TEXT_MUTED, fontWeight: '600', marginTop: 2 },
  clockSep:   { fontSize: 32, fontWeight: '800', color: TEXT_DARK, marginBottom: 18 },
  ampmBox:    { gap: 6, marginLeft: 8 },
  ampmBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: BORDER },
  ampmBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  ampmTxt:    { fontSize: 13, fontWeight: '700', color: TEXT_MUTED },
  ampmTxtActive: { color: '#FFF' },

  // Presets
  presetRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#F9FAFB' },
  presetChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  presetTxt:  { fontSize: 13, fontWeight: '600', color: TEXT_MUTED },
  presetTxtActive: { color: '#FFF' },

  // Alarm row
  alarmRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, padding: 14, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1.5, borderColor: BORDER },
  alarmSub:   { fontSize: 11, color: TEXT_MUTED, marginTop: 1 },

  // Repeat cards
  repeatCards: { gap: 10, marginBottom: 4 },
  repeatCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: BORDER, gap: 12 },
  repeatCardActive: { borderColor: PRIMARY, backgroundColor: PRIMARY_LT },
  repeatIconBox:     { width: 36, height: 36, borderRadius: 9, backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  repeatIconBoxActive:{ backgroundColor: PRIMARY },
  repeatCardBody: { flex: 1 },
  repeatLabel: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  repeatLabelActive: { color: PRIMARY },
  repeatSub:   { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  repeatSubActive: { color: PRIMARY + 'AA' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: PRIMARY },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },

  // Days
  dayRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  dayChip:    { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#F9FAFB' },
  dayChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  dayChipTxt: { fontSize: 12, fontWeight: '600', color: TEXT_MUTED },
  dayChipTxtActive: { color: '#FFF' },

  // Date picker
  dateRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, overflow: 'hidden', marginBottom: 4 },
  dateArrow:  { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: PRIMARY },
  dateArrowTxt: { fontSize: 22, color: '#FFF', fontWeight: '700' },
  dateVal:    { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT_DARK, textAlign: 'center' },

  // Quantity stepper
  qtyRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, overflow: 'hidden' },
  qtyBtn:     { width: 52, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY },
  qtyBtnOff:  { backgroundColor: '#E5E7EB' },
  qtyBtnTxt:  { fontSize: 22, fontWeight: '700', color: '#FFF', lineHeight: 26 },
  qtyBtnTxtOff:{ color: '#9CA3AF' },
  qtyDisplay: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  qtyVal:     { fontSize: 22, fontWeight: '800', color: TEXT_DARK },
  qtyLbl:     { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },

  // Review card
  reviewCard: { backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1.5, borderColor: BORDER, overflow: 'hidden', marginBottom: 12 },
  reviewRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  reviewRowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  reviewIconBox:{ width: 26, height: 26, borderRadius: 7, backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  reviewLbl:  { fontSize: 13, color: TEXT_MUTED, fontWeight: '500', width: 80 },
  reviewVal:  { flex: 1, fontSize: 14, fontWeight: '700', color: TEXT_DARK, textAlign: 'right' },

  // Warning
  warnBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: WARN_BG, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  warnTxt:    { flex: 1, fontSize: 13, color: WARN_TEXT, lineHeight: 19 },
});
