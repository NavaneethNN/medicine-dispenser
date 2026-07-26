import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Dimensions,
} from 'react-native';
import { Schedule } from '../services/storage';
import { Medicine } from './MedicinesScreen';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const PRIMARY    = '#0D9488';
const BG         = '#F0FDFA';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#111827';
const TEXT_MUTED = '#6B7280';
const BORDER     = '#E5E7EB';
const { width: SCREEN_W } = Dimensions.get('window');

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
  schedules: Schedule[];
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
function firesOn(sc: Schedule, iso: string, dayOfWeek: WeekDay): boolean {
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
    schedule: Schedule;
    medicine: Medicine | undefined;
    device: Device | undefined;
    fireTime: Date;
    status: 'upcoming' | 'missed' | 'dispensed';
    available: boolean;
  }[];
}

function buildDays(
  schedules: Schedule[],
  medicines: Medicine[],
  devices: Device[],
  daysAhead: number,
): DayEntry[] {
  const now = new Date();
  const todayBase = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayIso = localISODate(todayBase);
  const tomorrowBase = new Date(todayBase.getTime() + 86_400_000);
  const tomorrowIso = localISODate(tomorrowBase);

  const days: DayEntry[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const base = new Date(todayBase.getTime() + i * 86_400_000);
    const iso = localISODate(base);
    const dow = WEEK_NAMES[base.getDay()];
    const label = dayLabel(iso, todayIso, tomorrowIso);

    const items: DayEntry['items'] = [];

    for (const sc of schedules) {
      if (!firesOn(sc, iso, dow)) continue;
      const med = medicines.find(m => m.id === sc.medicineId);
      const dev = devices.find(d => d.id === sc.deviceId);
      const [h, m] = sc.time.split(':').map(Number);
      const fireTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);

      let status: 'upcoming' | 'missed' | 'dispensed' = 'upcoming';
      if (fireTime < now) status = 'missed';

      const available = !!med && med.quantity >= sc.quantityPerDose;

      items.push({ schedule: sc, medicine: med, device: dev, fireTime, status, available });
    }

    // Sort by time
    items.sort((a, b) => toMins(a.schedule.time) - toMins(b.schedule.time));

    // Only include days that have at least one schedule
    if (items.length > 0) {
      days.push({ iso, label, items });
    }
  }

  return days;
}

// ─── Item Row ───────────────────────────────────────────────────────────────────
function ScheduleRow({
  item, isToday, now,
}: {
  item: DayEntry['items'][0];
  isToday: boolean;
  now: Date;
}) {
  const isNext = isToday && item.status === 'upcoming';
  const isMissed = item.status === 'missed';
  const isUnavailable = !item.available;

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
          {fmt24to12(item.schedule.time)}
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
        {isUnavailable && (
          <Text style={r.unavailableHint}>
            ⚠ Insufficient stock ({item.medicine?.quantity ?? 0} left)
          </Text>
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
const DAYS_AHEAD = 14; // show 2 weeks

export default function UpcomingSchedulesScreen({
  devices, medicines, schedules, onBack,
}: UpcomingSchedulesScreenProps) {
  const [now, setNow] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const days = buildDays(schedules, medicines, devices, DAYS_AHEAD);

  // Summary stats
  const totalToday = days[0]?.label === 'Today' ? days[0].items.length : 0;
  const upcomingToday = days[0]?.label === 'Today'
    ? days[0].items.filter(i => i.status === 'upcoming').length
    : 0;

  return (
    <View style={sc.root}>
      {/* Header */}
      <View style={sc.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={sc.backBtn}>
          <Text style={sc.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={sc.titleArea}>
          <Text style={sc.title}>Upcoming Schedules</Text>
          <Text style={sc.subtitle}>Next {DAYS_AHEAD} days</Text>
        </View>
        {/* Spacer to balance back button */}
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
            <Text style={[sc.summaryValue, { color: '#D97706' }]}>
              {days.reduce((s, d) => s + d.items.filter(i => !i.available).length, 0)}
            </Text>
            <Text style={sc.summaryLabel}>Low Stock</Text>
          </View>
        </View>
      )}

      {/* Content */}
      {days.length === 0 ? (
        <View style={sc.empty}>
          <Text style={sc.emptyIcon}>📅</Text>
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
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

// Screen
const sc = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  header:        {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn:       { paddingVertical: 6, paddingRight: 8, minWidth: 56 },
  backText:      { fontSize: 16, color: PRIMARY, fontWeight: '600' },
  titleArea:     { flex: 1, alignItems: 'center' },
  title:         { fontSize: 18, fontWeight: '700', color: TEXT_DARK },
  subtitle:      { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  headerSpacer:  { minWidth: 56 },

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
  emptyIcon:     { fontSize: 48, marginBottom: 16 },
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
  unavailableHint: { fontSize: 11, color: '#D97706', fontWeight: '600', marginTop: 3 },

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
});
