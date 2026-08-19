import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import Icon from '../components/Icon';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Device {
  id: string; name: string; deviceUid: string;
  cartridgeCount: number; firmwareVersion: string;
  status: 'online' | 'offline'; lastSync: string;
}
interface Medicine {
  id: string; deviceId: string; cartridgeSlot: number;
  name: string; quantity: number;
}
interface Schedule {
  id: string; deviceId: string; medicineId: string;
  time: string; repeatType: string;
  specificDays: string[]; oneTimeDate: string;
  quantityPerDose: number; alarmEnabled: boolean;
}
interface ContainersScreenProps {
  devices: Device[]; medicines: Medicine[]; schedules: Schedule[];
  onBack: () => void;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY   = '#0D9488';
const PRIMARY_LT= '#CCFBF1';
const BG        = '#F8FAFC';
const CARD_BG   = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED= '#64748B';
const BORDER    = '#E2E8F0';
const WARN      = '#D97706';
const WARN_BG   = '#FEF3C7';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt12(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12  = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${ampm}`;
}

function repeatLabel(sc: Schedule): string {
  if (sc.repeatType === 'daily') return 'Every day';
  if (sc.repeatType === 'specific_days') {
    const days = Array.isArray(sc.specificDays) ? sc.specificDays : [];
    return days.length ? days.join(', ') : 'Specific days';
  }
  if (sc.repeatType === 'one_time') {
    if (!sc.oneTimeDate) return 'One-time';
    const [y, mo, da] = sc.oneTimeDate.split('-').map(Number);
    return new Date(y, mo - 1, da).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return sc.repeatType;
}

// ─── View: Cartridge Detail ───────────────────────────────────────────────────
function CartridgeDetail({ device, medicine, schedules, onBack }: {
  device: Device; medicine: Medicine; schedules: Schedule[]; onBack: () => void;
}) {
  const medSchedules = schedules.filter(sc => sc.medicineId === medicine.id);
  const isLow = medicine.quantity < 10;
  const stockPct = Math.min(100, Math.round((medicine.quantity / 30) * 100));

  return (
    <ScrollView style={v.container} contentContainerStyle={v.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={v.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={v.backBtn}>
          <Icon name="chevron-back" size={22} color={PRIMARY} />
          <Text style={v.backTxt}>Back</Text>
        </TouchableOpacity>
        <Text style={v.title}>Cartridge {medicine.cartridgeSlot}</Text>
        <View style={{ minWidth: 70 }} />
      </View>

      {/* Medicine identity card */}
      <View style={v.medCard}>
        <View style={v.medCardTop}>
          <View style={v.medIconBox}>
            <Icon name="medkit-outline" size={26} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={v.medName}>{medicine.name}</Text>
            <Text style={v.medSub}>Cartridge {medicine.cartridgeSlot} · {device.name}</Text>
          </View>
          {isLow && (
            <View style={v.lowBadge}>
              <Icon name="warning-outline" size={12} color={WARN} />
              <Text style={v.lowBadgeTxt}>Low</Text>
            </View>
          )}
        </View>

        {/* Stock bar */}
        <View style={v.stockSection}>
          <View style={v.stockLabelRow}>
            <Text style={v.stockLabel}>Stock level</Text>
            <Text style={[v.stockValue, isLow && v.stockValueLow]}>{medicine.quantity} tablets</Text>
          </View>
          <View style={v.stockTrack}>
            <View style={[v.stockFill, { width: `${stockPct}%` as any }, isLow && v.stockFillLow]} />
          </View>
          {isLow && <Text style={v.stockWarn}>Stock is low — consider refilling soon.</Text>}
        </View>
      </View>

      {/* Schedule list */}
      <Text style={v.sectionLabel}>
        {medSchedules.length === 0 ? 'No Schedules' : `Schedules (${medSchedules.length})`}
      </Text>

      {medSchedules.length === 0 ? (
        <View style={v.emptySchedules}>
          <Icon name="calendar-outline" size={28} color={TEXT_MUTED} />
          <Text style={v.emptySchedulesTxt}>No schedules set for this medicine.</Text>
        </View>
      ) : (
        <View style={v.schedList}>
          {medSchedules.map((sc, i) => (
            <View key={sc.id} style={[v.schedCard, i > 0 && { marginTop: 10 }]}>
              <View style={v.schedRow}>
                <View style={v.schedIconBox}>
                  <Icon name="time-outline" size={16} color={PRIMARY} />
                </View>
                <Text style={v.schedLabel}>Time</Text>
                <Text style={v.schedValue}>{fmt12(sc.time)}</Text>
              </View>
              <View style={[v.schedRow, v.schedRowBorder]}>
                <View style={v.schedIconBox}>
                  <Icon name="refresh-outline" size={16} color={PRIMARY} />
                </View>
                <Text style={v.schedLabel}>Repeat</Text>
                <Text style={v.schedValue} numberOfLines={1}>{repeatLabel(sc)}</Text>
              </View>
              <View style={[v.schedRow, v.schedRowBorder]}>
                <View style={v.schedIconBox}>
                  <Icon name="fitness-outline" size={16} color={PRIMARY} />
                </View>
                <Text style={v.schedLabel}>Dose</Text>
                <Text style={v.schedValue}>{sc.quantityPerDose} tablet{sc.quantityPerDose !== 1 ? 's' : ''}</Text>
              </View>
              <View style={[v.schedRow, v.schedRowBorder]}>
                <View style={v.schedIconBox}>
                  <Icon name={sc.alarmEnabled ? 'notifications-outline' : 'notifications-off-outline'} size={16} color={sc.alarmEnabled ? PRIMARY : TEXT_MUTED} />
                </View>
                <Text style={v.schedLabel}>Alarm</Text>
                <Text style={[v.schedValue, !sc.alarmEnabled && { color: TEXT_MUTED }]}>{sc.alarmEnabled ? 'Enabled' : 'Disabled'}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── View: Cartridge List ─────────────────────────────────────────────────────
function CartridgeList({ device, medicines, schedules, onBack, onSelect }: {
  device: Device; medicines: Medicine[]; schedules: Schedule[];
  onBack: () => void; onSelect: (m: Medicine) => void;
}) {
  const devMeds = medicines
    .filter(m => m.deviceId === device.id)
    .sort((a, b) => a.cartridgeSlot - b.cartridgeSlot);

  // Build full cartridge grid (occupied + empty slots)
  const slots = Array.from({ length: device.cartridgeCount }, (_, i) => {
    const slot = i + 1;
    return { slot, medicine: devMeds.find(m => m.cartridgeSlot === slot) ?? null };
  });

  return (
    <ScrollView style={v.container} contentContainerStyle={v.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={v.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={v.backBtn}>
          <Icon name="chevron-back" size={22} color={PRIMARY} />
          <Text style={v.backTxt}>Back</Text>
        </TouchableOpacity>
        <Text style={v.title}>{device.name}</Text>
        <View style={{ minWidth: 70 }} />
      </View>

      {/* Device info bar */}
      <View style={v.deviceInfoBar}>
        <View style={v.deviceInfoItem}>
          <Icon name="hardware-chip-outline" size={14} color={TEXT_MUTED} />
          <Text style={v.deviceInfoTxt}>{device.deviceUid}</Text>
        </View>
        <View style={v.deviceInfoDot} />
        <View style={v.deviceInfoItem}>
          <View style={[v.statusDot, device.status === 'online' ? v.dotOnline : v.dotOffline]} />
          <Text style={[v.deviceInfoTxt, device.status === 'online' ? v.txtOnline : v.txtOffline]}>
            {device.status === 'online' ? 'Online' : 'Offline'}
          </Text>
        </View>
        <View style={v.deviceInfoDot} />
        <View style={v.deviceInfoItem}>
          <Icon name="git-branch-outline" size={14} color={TEXT_MUTED} />
          <Text style={v.deviceInfoTxt}>{device.firmwareVersion}</Text>
        </View>
      </View>

      <Text style={v.sectionLabel}>{device.cartridgeCount} Cartridges</Text>

      <View style={v.cartGrid}>
        {slots.map(({ slot, medicine }) => {
          const isOccupied = medicine !== null;
          const isLow = isOccupied && medicine!.quantity < 10;
          const schedCount = isOccupied
            ? schedules.filter(sc => sc.medicineId === medicine!.id).length
            : 0;

          return isOccupied ? (
            <TouchableOpacity
              key={slot} style={v.cartCard} activeOpacity={0.7}
              onPress={() => onSelect(medicine!)}
            >
              <View style={v.cartCardTop}>
                <View style={v.cartBadge}><Text style={v.cartBadgeTxt}>{slot}</Text></View>
                {isLow && <View style={v.cartLowBadge}><Text style={v.cartLowTxt}>Low</Text></View>}
              </View>
              <Text style={v.cartMedName} numberOfLines={2}>{medicine!.name}</Text>
              <Text style={v.cartQty}>{medicine!.quantity} tablets</Text>
              <View style={v.cartFooter}>
                <Icon name="calendar-outline" size={12} color={TEXT_MUTED} />
                <Text style={v.cartSchedTxt}>{schedCount} schedule{schedCount !== 1 ? 's' : ''}</Text>
                <View style={{ flex: 1 }} />
                <Icon name="chevron-forward" size={14} color={PRIMARY} />
              </View>
            </TouchableOpacity>
          ) : (
            <View key={slot} style={v.cartCardEmpty}>
              <View style={v.cartBadgeEmpty}><Text style={v.cartBadgeTxtEmpty}>{slot}</Text></View>
              <Icon name="add-circle-outline" size={22} color={BORDER} />
              <Text style={v.cartEmptyTxt}>Empty</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── View: Device List (root) ─────────────────────────────────────────────────
function DeviceList({ devices, medicines, schedules, onBack, onSelect }: {
  devices: Device[]; medicines: Medicine[]; schedules: Schedule[];
  onBack: () => void; onSelect: (d: Device) => void;
}) {
  return (
    <ScrollView style={v.container} contentContainerStyle={v.content} showsVerticalScrollIndicator={false}>
      <View style={v.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={v.backBtn}>
          <Icon name="chevron-back" size={22} color={PRIMARY} />
          <Text style={v.backTxt}>Back</Text>
        </TouchableOpacity>
        <Text style={v.title}>Configuration</Text>
        <View style={{ minWidth: 70 }} />
      </View>

      {devices.length === 0 ? (
        <View style={v.emptyState}>
          <View style={v.emptyIconBox}><Icon name="hardware-chip-outline" size={34} color={PRIMARY} /></View>
          <Text style={v.emptyTitle}>No devices found</Text>
          <Text style={v.emptyDesc}>Add a device from the Devices page first.</Text>
        </View>
      ) : (
        <View style={v.deviceList}>
          {devices.map(device => {
            const devMeds = medicines.filter(m => m.deviceId === device.id);
            const devScheds = schedules.filter(sc => sc.deviceId === device.id);
            const occupied = devMeds.length;
            const lowCount = devMeds.filter(m => m.quantity < 10).length;

            return (
              <TouchableOpacity key={device.id} style={v.deviceCard} activeOpacity={0.7} onPress={() => onSelect(device)}>
                <View style={v.deviceCardLeft}>
                  <View style={v.deviceIconBox}>
                    <Icon name="hardware-chip-outline" size={22} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={v.deviceName} numberOfLines={1}>{device.name}</Text>
                    <Text style={v.deviceUid}>{device.deviceUid}</Text>
                  </View>
                </View>

                <View style={v.deviceStats}>
                  <View style={v.statItem}>
                    <Text style={v.statVal}>{occupied}/{device.cartridgeCount}</Text>
                    <Text style={v.statLbl}>Filled</Text>
                  </View>
                  <View style={v.statDivider} />
                  <View style={v.statItem}>
                    <Text style={v.statVal}>{devScheds.length}</Text>
                    <Text style={v.statLbl}>Schedules</Text>
                  </View>
                  {lowCount > 0 && (
                    <>
                      <View style={v.statDivider} />
                      <View style={v.statItem}>
                        <Text style={[v.statVal, { color: WARN }]}>{lowCount}</Text>
                        <Text style={v.statLbl}>Low stock</Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={v.deviceCardRight}>
                  <View style={[v.onlineDot, device.status === 'online' ? v.dotOnline : v.dotOffline]} />
                  <Icon name="chevron-forward" size={20} color="#D1D5DB" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Main screen — orchestrates drill-down ────────────────────────────────────
type View_ = { level: 'devices' } | { level: 'cartridges'; device: Device } | { level: 'detail'; device: Device; medicine: Medicine };

export default function ContainersScreen({ devices, medicines, schedules, onBack }: ContainersScreenProps) {
  const [view, setView] = useState<View_>({ level: 'devices' });

  if (view.level === 'detail') {
    return (
      <SafeAreaView style={v.safe}>
        <CartridgeDetail
          device={view.device}
          medicine={view.medicine}
          schedules={schedules}
          onBack={() => setView({ level: 'cartridges', device: view.device })}
        />
      </SafeAreaView>
    );
  }

  if (view.level === 'cartridges') {
    return (
      <SafeAreaView style={v.safe}>
        <CartridgeList
          device={view.device}
          medicines={medicines}
          schedules={schedules}
          onBack={() => setView({ level: 'devices' })}
          onSelect={med => setView({ level: 'detail', device: view.device, medicine: med })}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={v.safe}>
      <DeviceList
        devices={devices}
        medicines={medicines}
        schedules={schedules}
        onBack={onBack}
        onSelect={device => setView({ level: 'cartridges', device })}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const v = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },
  content:   { padding: 16, paddingBottom: 48 },

  // Shared header
  header:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 70, paddingVertical: 6 },
  backTxt: { fontSize: 15, color: PRIMARY, fontWeight: '600', marginLeft: 2 },
  title:   { flex: 1, fontSize: 20, fontWeight: '700', color: TEXT_DARK, textAlign: 'center' },

  sectionLabel: { fontSize: 12, fontWeight: '600', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },

  // Empty state
  emptyState:   { alignItems: 'center', paddingVertical: 60 },
  emptyIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle:   { fontSize: 18, fontWeight: '600', color: TEXT_DARK, marginBottom: 8 },
  emptyDesc:    { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20 },

  // Device list
  deviceList: { gap: 12 },
  deviceCard: {
    backgroundColor: CARD_BG, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  deviceCardLeft:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  deviceIconBox:   { width: 42, height: 42, borderRadius: 11, backgroundColor: PRIMARY + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  deviceName:      { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  deviceUid:       { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  deviceStats:     { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 10, padding: 10, marginBottom: 12 },
  statItem:        { flex: 1, alignItems: 'center' },
  statVal:         { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  statLbl:         { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  statDivider:     { width: 1, height: 28, backgroundColor: BORDER },
  deviceCardRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  onlineDot:       { width: 8, height: 8, borderRadius: 4 },

  // Cartridge grid
  cartGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cartCard: {
    width: '47%', backgroundColor: CARD_BG, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cartCardEmpty: {
    width: '47%', backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 100,
  },
  cartCardTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cartBadge:      { width: 26, height: 26, borderRadius: 8, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  cartBadgeTxt:   { color: '#FFF', fontSize: 12, fontWeight: '700' },
  cartBadgeEmpty: { width: 26, height: 26, borderRadius: 8, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cartBadgeTxtEmpty:{ color: TEXT_MUTED, fontSize: 12, fontWeight: '700' },
  cartLowBadge:   { backgroundColor: WARN_BG, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  cartLowTxt:     { fontSize: 10, fontWeight: '700', color: WARN },
  cartMedName:    { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 4, lineHeight: 18 },
  cartQty:        { fontSize: 12, color: TEXT_MUTED, marginBottom: 10 },
  cartFooter:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartSchedTxt:   { fontSize: 11, color: TEXT_MUTED },
  cartEmptyTxt:   { fontSize: 12, color: TEXT_MUTED },

  // Device info bar
  deviceInfoBar:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, backgroundColor: CARD_BG, borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: BORDER },
  deviceInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deviceInfoTxt:  { fontSize: 12, color: TEXT_MUTED, fontWeight: '500' },
  deviceInfoDot:  { width: 3, height: 3, borderRadius: 2, backgroundColor: BORDER },

  // Status
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: '#10B981' },
  dotOffline:{ backgroundColor: '#EF4444' },
  txtOnline: { color: '#059669', fontWeight: '600' },
  txtOffline:{ color: '#DC2626', fontWeight: '600' },

  // Medicine detail card
  medCard:    { backgroundColor: CARD_BG, borderRadius: 16, padding: 18, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  medCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  medIconBox: { width: 48, height: 48, borderRadius: 13, backgroundColor: PRIMARY + '15', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 },
  medName:    { fontSize: 17, fontWeight: '700', color: TEXT_DARK, flex: 1, lineHeight: 23 },
  medSub:     { fontSize: 12, color: TEXT_MUTED, marginTop: 3 },
  lowBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: WARN_BG, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, flexShrink: 0 },
  lowBadgeTxt:{ fontSize: 11, fontWeight: '700', color: WARN },

  // Stock bar
  stockSection:  { paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  stockLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stockLabel:    { fontSize: 13, color: TEXT_MUTED, fontWeight: '500' },
  stockValue:    { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  stockValueLow: { color: WARN },
  stockTrack:    { height: 6, backgroundColor: BORDER, borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  stockFill:     { height: 6, backgroundColor: PRIMARY, borderRadius: 3 },
  stockFillLow:  { backgroundColor: WARN },
  stockWarn:     { fontSize: 12, color: WARN, fontWeight: '500', marginTop: 2 },

  // Schedule cards on detail
  schedList:      { gap: 0 },
  schedCard:      { backgroundColor: CARD_BG, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  schedRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  schedRowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  schedIconBox:   { width: 26, height: 26, borderRadius: 7, backgroundColor: PRIMARY + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  schedLabel:     { fontSize: 13, color: TEXT_MUTED, width: 70 },
  schedValue:     { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT_DARK, textAlign: 'right' },

  // Empty schedules
  emptySchedules:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: BORDER },
  emptySchedulesTxt: { fontSize: 13, color: TEXT_MUTED },
});
