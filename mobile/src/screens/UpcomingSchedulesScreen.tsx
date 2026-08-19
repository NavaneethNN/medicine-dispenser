import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
  ActivityIndicator, Alert,
} from 'react-native';
import { ApiSchedule, dispenseApi } from '../services/api';
import { Medicine } from './MedicinesScreen';
import Icon from '../components/Icon';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const PRIMARY    = '#0D9488';
const BG         = '#F8FAFC';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER     = '#E2E8F0';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Device {
  id: string;
  name: string;
  deviceUid: string;
  cartridgeCount: number;
}

export interface UpcomingSchedulesScreenProps {
  devices: Device[];
  medicines: Medicine[];
  schedules: ApiSchedule[];
  onBack: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
type WeekDay = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
const WEEK_NAMES: WeekDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Today's YYYY-MM-DD without timezone drift */
function localISODate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/** Friendly label: "Today", "Tomorrow", or "Mon 28 Jul" */
function dayLabel(iso: string, todayIso: string, tomorrowIso: string): string {
  if (iso === todayIso) return 'Today';
  if (iso === tomorrowIso) return 'Tomorrow';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "H:MM AM/PM" */
function fmt24to12(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${ampm}`;
}

/** Does schedule fire on date d? */
function firesOn(sc: ApiSchedule, iso: string, dayOfWeek: WeekDay): boolean {
  if (sc.repeatType === 'daily') return true;
  if (sc.repeatType === 'specific_days') return sc.specificDays.includes(dayOfWeek as any);
  if (sc.repeatType === 'one_time') return sc.oneTimeDate === iso;
  return false;
}

/** Minutes since midnight */
function toMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Countdown string */
function countdown(target: Date): string {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return 'now';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Entry type ─────────────────────────────────────────────────────────────────
interface DayEntry {
  iso: string;
  label: string;
  items: {
    schedule: ApiSchedule;
    medicine: Medicine | undefined;
    device: Device | undefined;
    fireTime: Date;
    status: 'upcoming' | 'missed' | 'dispensed';
    available: boolean;
    /** How many tablets will remain AFTER this dose fires */
    stockAfter: number;
  }[];
}

/**
 * Build upcoming occurrences limited by stock, not by days.
 *
 * For each schedule we calculate how many doses the current stock covers:
 *   maxDoses = floor(medicine.quantity / schedule.quantityPerDose)
 *
 * We then walk forward day-by-day and emit one occurrence each time the
 * schedule fires — stopping as soon as we've emitted maxDoses occurrences
 * for that schedule.  The look-ahead cap (MAX_LOOKAHEAD_DAYS) prevents an
 * infinite loop for daily schedules with a large stock count.
 */
const MAX_LOOKAHEAD_DAYS = 365; // safety cap — 1 year should always be enough

function buildDays(
  schedules: ApiSchedule[],
  medicines: Medicine[],
  devices: Device[],
): DayEntry[] {
  const now       = new Date();
  const todayBase = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayIso  = localISODate(todayBase);
  const tomorrowBase = new Date(todayBase.getTime() + 86_400_000);
  const tomorrowIso  = localISODate(tomorrowBase);

  // Per-schedule dose budgets (how many future occurrences are still funded by stock)
  const budgets = new Map<string, number>();
  for (const sc of schedules) {
    const med = medicines.find(m => m.id === sc.medicineId);
    if (!med || !sc.quantityPerDose || sc.quantityPerDose <= 0) {
      budgets.set(sc.id, 0);
    } else {
      budgets.set(sc.id, Math.floor(med.quantity / sc.quantityPerDose));
    }
  }

  // Accumulate occurrences into a map keyed by ISO date
  const dayMap = new Map<string, DayEntry>();

  for (let i = 0; i < MAX_LOOKAHEAD_DAYS; i++) {
    // Stop early if every schedule has exhausted its budget
    if ([...budgets.values()].every(b => b === 0)) break;

    const base = new Date(todayBase.getTime() + i * 86_400_000);
    const iso  = localISODate(base);
    const dow  = WEEK_NAMES[base.getDay()];

    for (const sc of schedules) {
      const remaining = budgets.get(sc.id) ?? 0;
      if (remaining === 0) continue;
      if (!firesOn(sc, iso, dow)) continue;

      const med = medicines.find(m => m.id === sc.medicineId);
      const dev = devices.find(d => d.id === sc.deviceId);

      const [h, m] = (sc.time ?? '00:00').split(':').map(Number);
      const fireTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);

      const status: 'upcoming' | 'missed' = fireTime < now ? 'missed' : 'upcoming';
      const available = !!med && med.quantity >= sc.quantityPerDose;

      // Decrement budget for this schedule
      const newBudget = remaining - 1;
      budgets.set(sc.id, newBudget);

      // stockAfter = how many tablets remain after ALL doses up to and including this one
      // We track this as (quantity - dosesConsumed * perDose)
      const totalDoses = Math.floor((med?.quantity ?? 0) / sc.quantityPerDose);
      const dosesConsumed = totalDoses - newBudget;
      const stockAfter = (med?.quantity ?? 0) - dosesConsumed * sc.quantityPerDose;

      if (!dayMap.has(iso)) {
        dayMap.set(iso, {
          iso,
          label: dayLabel(iso, todayIso, tomorrowIso),
          items: [],
        });
      }

      dayMap.get(iso)!.items.push({
        schedule: sc, medicine: med, device: dev,
        fireTime, status, available, stockAfter,
      });
    }
  }

  // Sort days chronologically, sort items within each day by time
  return [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, day]) => ({
      ...day,
      items: day.items.sort((a, b) => toMins(a.schedule.time ?? '00:00') - toMins(b.schedule.time ?? '00:00')),
    }));
}

// ─── Item Row ───────────────────────────────────────────────────────────────────
function ScheduleRow({
  item, isToday, now,
}: {
  item: DayEntry['items'][0];
  isToday: boolean;
  now: Date;
}) {
  const [dispensing, setDispensing] = useState(false);
  const [dispensed, setDispensed]   = useState(false);

  const isNext       = isToday && item.status === 'upcoming';
  const isMissed     = item.status === 'missed';
  const isUnavailable = !item.available;
  const isLastDose   = item.stockAfter < item.schedule.quantityPerDose;

  const handleDispenseNow = async () => {
    if (dispensing || dispensed) return;
    setDispensing(true);
    try {
      const res = await dispenseApi.bySchedule(item.schedule.id);
      if (res.status === 'success') {
        setDispensed(true);
        // Reset the "Dispensed" label after 4 s so the button can be used again
        setTimeout(() => setDispensed(false), 4000);
      } else {
        Alert.alert('Dispense failed', res.message ?? 'Unknown error');
      }
    } catch (e: any) {
      Alert.alert('Dispense failed', e.message ?? 'Could not reach server');
    } finally {
      setDispensing(false);
    }
  };

  return (
    <View style={[
      r.row,
      isMissed && r.rowMissed,
      isUnavailable && r.rowUnavailable,
    ]}>
      {/* Left accent bar */}
      <View style={[
        r.accent,
        isMissed ? r.accentMissed : isUnavailable ? r.accentUnavailable : r.accentNormal,
      ]} />

      {/* Time column */}
      <View style={r.timeCol}>
        <Text style={[r.time, isMissed && r.timeMissed]}>
          {fmt24to12(item.schedule.time ?? '00:00')}
        </Text>
        {isNext && (
          <Text style={r.countdown}>{countdown(item.fireTime)}</Text>
        )}
      </View>

      {/* Details */}
      <View style={r.details}>
        <Text style={[r.medName, isMissed && r.medNameMissed]} numberOfLines={1}>
          {item.medicine?.name ?? '—'}
        </Text>
        <Text style={r.doseInfo} numberOfLines={1}>
          {item.schedule.quantityPerDose} tablet{item.schedule.quantityPerDose !== 1 ? 's' : ''}
          {' · '}
          {item.device?.name ?? '—'}
        </Text>
        {/* Stock-after indicator */}
        {!isMissed && (
          <View style={r.stockAfterRow}>
            {isLastDose && <Icon name="warning-outline" size={12} color="#DC2626" />}
            <Text style={[r.stockAfterTxt, isLastDose && r.stockAfterLast]}>
              {isLastDose
                ? 'Last dose — refill needed'
                : `${item.stockAfter} tablet${item.stockAfter !== 1 ? 's' : ''} remaining after`}
            </Text>
          </View>
        )}
        {isUnavailable && (
          <View style={r.stockAfterRow}>
            <Icon name="warning-outline" size={12} color="#D97706" />
            <Text style={r.unavailableHint}>
              Insufficient stock ({item.medicine?.quantity ?? 0} left)
            </Text>
          </View>
        )}

        {/* Dispense Now button — shown for any dose that has stock, missed or upcoming */}
        {item.available && (
          <TouchableOpacity
            style={[r.dispenseBtn, dispensed && r.dispenseBtnDone, dispensing && r.dispenseBtnBusy]}
            onPress={handleDispenseNow}
            activeOpacity={0.75}
            disabled={dispensing || dispensed}
          >
            {dispensing ? (
              <ActivityIndicator size={12} color="#fff" />
            ) : (
              <Icon
                name={dispensed ? 'checkmark-circle-outline' : 'play-circle-outline'}
                size={13}
                color="#fff"
              />
            )}
            <Text style={r.dispenseBtnTxt}>
              {dispensed ? 'Dispensed' : dispensing ? 'Dispensing…' : 'Dispense Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status badge */}
      <View style={[
        r.badge,
        isMissed ? r.badgeMissed
          : isUnavailable ? r.badgeUnavailable
          : isNext ? r.badgeNext
          : r.badgeUpcoming,
      ]}>
        <Text style={[
          r.badgeText,
          isMissed ? r.badgeTextMissed
            : isUnavailable ? r.badgeTextUnavailable
            : isNext ? r.badgeTextNext
            : r.badgeTextUpcoming,
        ]}>
          {isMissed ? 'Missed'
            : isUnavailable ? 'No Stock'
            : isNext ? 'Next'
            : 'Due'}
        </Text>
      </View>
    </View>
  );
}

// ─── Day Section ────────────────────────────────────────────────────────────────
function DaySection({ day, now }: { day: DayEntry; now: Date }) {
  const isToday = day.label === 'Today';
  const totalDoses = day.items.reduce((s, i) => s + i.schedule.quantityPerDose, 0);
  const availableCount = day.items.filter(i => i.available).length;
  const missedCount = day.items.filter(i => i.status === 'missed').length;

  return (
    <View style={ds.section}>
      {/* Day header */}
      <View style={[ds.header, isToday && ds.headerToday]}>
        <View style={ds.headerLeft}>
          <Text style={[ds.label, isToday && ds.labelToday]}>{day.label}</Text>
          <Text style={ds.sub}>
            {day.items.length} schedule{day.items.length !== 1 ? 's' : ''}
            {' · '}
            {totalDoses} tablet{totalDoses !== 1 ? 's' : ''} total
          </Text>
        </View>
        <View style={ds.pills}>
          {availableCount < day.items.length && (
            <View style={ds.pillWarn}>
              <Text style={ds.pillWarnText}>
                {day.items.length - availableCount} low stock
              </Text>
            </View>
          )}
          {missedCount > 0 && (
            <View style={ds.pillMissed}>
              <Text style={ds.pillMissedText}>{missedCount} missed</Text>
            </View>
          )}
        </View>
      </View>

      {/* Schedule rows */}
      <View style={ds.rows}>
        {day.items.map((item, idx) => (
          <ScheduleRow
            key={`${item.schedule.id}-${idx}`}
            item={item}
            isToday={isToday}
            now={now}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function UpcomingSchedulesScreen({
  devices, medicines, schedules, onBack,
}: UpcomingSchedulesScreenProps) {
  const [now, setNow] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const days = buildDays(schedules, medicines, devices);

  // Total schedule occurrences across all days
  const totalOccurrences = days.reduce((s, d) => s + d.items.length, 0);

  // Summary stats for today
  const todayDay     = days.find(d => d.label === 'Today');
  const totalToday   = todayDay?.items.length ?? 0;
  const upcomingToday = todayDay?.items.filter(i => i.status === 'upcoming').length ?? 0;
  const lowStockCount = days.reduce((s, d) => s + d.items.filter(i => !i.available).length, 0);

  return (
    <SafeAreaView style={sc.safe}>
      {/* Header */}
      <View style={sc.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={sc.backBtn}>
          <Icon name="chevron-back" size={22} color={PRIMARY} />
          <Text style={sc.backText}>Back</Text>
        </TouchableOpacity>
        <View style={sc.titleArea}>
          <Text style={sc.title}>Upcoming Schedules</Text>
          <Text style={sc.subtitle}>
            {totalOccurrences > 0 ? `${totalOccurrences} dose${totalOccurrences !== 1 ? 's' : ''} until refill` : 'Based on current stock'}
          </Text>
        </View>
        <View style={sc.headerSpacer} />
      </View>

      {/* Summary bar */}
      {totalToday > 0 && (
        <View style={sc.summaryBar}>
          <View style={sc.summaryItem}>
            <Text style={sc.summaryValue}>{totalToday}</Text>
            <Text style={sc.summaryLabel}>Today</Text>
          </View>
          <View style={sc.summaryDivider} />
          <View style={sc.summaryItem}>
            <Text style={[sc.summaryValue, { color: PRIMARY }]}>{upcomingToday}</Text>
            <Text style={sc.summaryLabel}>Remaining</Text>
          </View>
          <View style={sc.summaryDivider} />
          <View style={sc.summaryItem}>
            <Text style={[sc.summaryValue, { color: '#D97706' }]}>{lowStockCount}</Text>
            <Text style={sc.summaryLabel}>Low Stock</Text>
          </View>
        </View>
      )}

      {/* Content */}
      {days.length === 0 ? (
        <View style={sc.empty}>
          <View style={sc.emptyIconBox}>
            <Icon name="calendar-outline" size={36} color={PRIMARY} />
          </View>
          <Text style={sc.emptyTitle}>No upcoming schedules</Text>
          <Text style={sc.emptyDesc}>
            Create schedules on the Schedule page and they'll appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={sc.scroll}
          contentContainerStyle={sc.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {days.map(day => (
            <DaySection key={day.iso} day={day} now={now} />
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

// Screen
const sc = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: BG },
  header:        {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, minWidth: 64 },
  backText:      { fontSize: 15, color: PRIMARY, fontWeight: '600', marginLeft: 2 },
  titleArea:     { flex: 1, alignItems: 'center' },
  title:         { fontSize: 18, fontWeight: '700', color: TEXT_DARK },
  subtitle:      { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  headerSpacer:  { minWidth: 64 },

  summaryBar:    {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryItem:   { flex: 1, alignItems: 'center' },
  summaryValue:  { fontSize: 22, fontWeight: '800', color: TEXT_DARK },
  summaryLabel:  { fontSize: 11, color: TEXT_MUTED, fontWeight: '600', marginTop: 2 },
  summaryDivider:{ width: 1, backgroundColor: BORDER, marginVertical: 4 },

  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIconBox:  { width: 72, height: 72, borderRadius: 36, backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
  emptyDesc:     { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 21 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 12 },
});

// Day section
const ds = StyleSheet.create({
  section:     { marginBottom: 20 },
  header:      {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerToday: { borderLeftWidth: 4, borderLeftColor: PRIMARY },
  headerLeft:  { flex: 1, marginRight: 8 },
  label:       { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  labelToday:  { color: PRIMARY },
  sub:         { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  pills:       { flexDirection: 'row', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' },
  pillWarn:    { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillWarnText:{ fontSize: 11, fontWeight: '600', color: '#D97706' },
  pillMissed:  { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillMissedText:{ fontSize: 11, fontWeight: '600', color: '#DC2626' },
  rows:        { gap: 6 },
});

// Row
const r = StyleSheet.create({
  row:            {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    overflow: 'hidden',
    paddingRight: 12,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  rowMissed:         { backgroundColor: '#FFF5F5' },
  rowUnavailable:    { backgroundColor: '#FFFBEB' },

  accent:            { width: 4, alignSelf: 'stretch', marginRight: 12, borderRadius: 2 },
  accentNormal:      { backgroundColor: PRIMARY },
  accentMissed:      { backgroundColor: '#EF4444' },
  accentUnavailable: { backgroundColor: '#F59E0B' },

  timeCol:     { width: 72, alignItems: 'flex-start', flexShrink: 0 },
  time:        { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  timeMissed:  { color: '#9CA3AF' },
  countdown:   { fontSize: 11, fontWeight: '600', color: PRIMARY, marginTop: 2 },

  details:         { flex: 1, marginRight: 8 },
  medName:         { fontSize: 14, fontWeight: '600', color: TEXT_DARK, marginBottom: 2 },
  medNameMissed:   { color: '#9CA3AF' },
  doseInfo:        { fontSize: 12, color: TEXT_MUTED },
  unavailableHint: { fontSize: 11, color: '#D97706', fontWeight: '600', marginTop: 2 },
  stockAfterRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  stockAfterTxt:  { fontSize: 11, color: TEXT_MUTED },
  stockAfterLast: { color: '#DC2626', fontWeight: '600' },

  badge:              { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, flexShrink: 0 },
  badgeUpcoming:      { backgroundColor: '#D1FAE5' },
  badgeMissed:        { backgroundColor: '#FEE2E2' },
  badgeUnavailable:   { backgroundColor: '#FEF3C7' },
  badgeNext:          { backgroundColor: PRIMARY },
  badgeText:          { fontSize: 11, fontWeight: '700' },
  badgeTextUpcoming:  { color: '#059669' },
  badgeTextMissed:    { color: '#DC2626' },
  badgeTextUnavailable:{ color: '#D97706' },
  badgeTextNext:      { color: '#FFF' },

  dispenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: PRIMARY,
  },
  dispenseBtnBusy: { backgroundColor: '#5EAAA3' },
  dispenseBtnDone: { backgroundColor: '#059669' },
  dispenseBtnTxt:  { fontSize: 12, fontWeight: '700', color: '#fff' },
});
