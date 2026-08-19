import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import Icon from '../components/Icon';

interface DashboardScreenProps {
  userName: string;
  onLogout: () => void;
  onNavigate: (screen: string) => void;
  dataLoading?: boolean;
  dataError?: string | null;
}

// Big tiles — icon + label so even non-readers can find the right one
const menuItems = [
  {
    key:   'manual_dispense',
    label: 'Give Medicine\nNow',
    icon:  'flash-outline'          as const,
    color: '#DC2626',
    bg:    '#DC2626',
    desc:  'Emergency dose',
    large: true,   // takes full row
  },
  {
    key:   'schedules',
    label: 'Medicine\nSchedule',
    icon:  'alarm-outline'          as const,
    color: '#0D9488',
    bg:    '#E0F2FE',
    desc:  'Set reminders',
    large: false,
  },
  {
    key:   'medicines',
    label: 'Medicines',
    icon:  'medical-outline'        as const,
    color: '#8B5CF6',
    bg:    '#EDE9FE',
    desc:  'View stock',
    large: false,
  },
  {
    key:   'devices',
    label: 'Dispenser\nDevice',
    icon:  'hardware-chip-outline'  as const,
    color: '#0891B2',
    bg:    '#CFFAFE',
    desc:  'Manage device',
    large: false,
  },
  {
    key:   'containers',
    label: 'Cartridges',
    icon:  'cube-outline'           as const,
    color: '#D97706',
    bg:    '#FEF3C7',
    desc:  'Cartridge slots',
    large: false,
  },
];

const PRIMARY    = '#0D9488';
const BG         = '#F8FAFC';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER     = '#E2E8F0';

export default function DashboardScreen({
  userName, onLogout, onNavigate, dataLoading, dataError,
}: DashboardScreenProps) {
  const bigItem  = menuItems.find(m => m.large)!;
  const smallItems = menuItems.filter(m => !m.large);

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <View style={st.topBar}>
          <View style={st.brand}>
            <View style={st.logoCircle}>
              <Icon name="medical" size={24} color="#fff" />
            </View>
            <View>
              <Text style={st.appName}>MediDispense</Text>
              <Text style={st.greeting}>Hi, {userName || 'Caregiver'} 👋</Text>
            </View>
          </View>

          <TouchableOpacity onPress={onLogout} style={st.logoutBtn} activeOpacity={0.75}>
            <Icon name="log-out-outline" size={20} color="#DC2626" />
            <Text style={st.logoutTxt}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* ── Status banners ───────────────────────────────────────────────── */}
        {dataLoading && (
          <View style={st.infoBanner}>
            <ActivityIndicator color={PRIMARY} size="small" />
            <Text style={st.infoBannerTxt}>Loading your data…</Text>
          </View>
        )}

        {dataError && (
          <View style={st.warnBanner}>
            <Icon name="wifi-outline" size={22} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={st.warnTitle}>Cannot reach server</Text>
              <Text style={st.warnDesc}>{dataError}</Text>
            </View>
          </View>
        )}

        {/* ── BIG emergency tile ──────────────────────────────────────────── */}
        <TouchableOpacity
          style={st.bigTile}
          activeOpacity={0.82}
          onPress={() => onNavigate(bigItem.key)}
        >
          <View style={st.bigIconWrap}>
            <Icon name={bigItem.icon} size={44} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.bigLabel}>{bigItem.label}</Text>
            <Text style={st.bigDesc}>{bigItem.desc}</Text>
          </View>
          <Icon name="chevron-forward" size={26} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* ── 2-column small tiles ─────────────────────────────────────────── */}
        <View style={st.grid}>
          {smallItems.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[st.smallTile, { backgroundColor: item.bg }]}
              activeOpacity={0.8}
              onPress={() => onNavigate(item.key)}
            >
              <View style={[st.smallIconBox, { backgroundColor: item.color + '22' }]}>
                <Icon name={item.icon} size={30} color={item.color} />
              </View>
              <Text style={[st.smallLabel, { color: item.color }]}>{item.label}</Text>
              <Text style={st.smallDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { padding: 18, paddingBottom: 48 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 24,
  },
  brand:       { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  logoCircle:  {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  appName:     { fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  greeting:    { fontSize: 13, color: TEXT_MUTED, marginTop: 1 },
  logoutBtn:   {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: '#FEE2E2', borderRadius: 12,
  },
  logoutTxt:   { fontSize: 14, fontWeight: '700', color: '#DC2626' },

  infoBanner:  {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#E0F2FE', borderRadius: 12, padding: 12, marginBottom: 14,
  },
  infoBannerTxt: { fontSize: 14, color: '#0369A1', fontWeight: '500' },
  warnBanner:  {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, marginBottom: 14,
  },
  warnTitle:   { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  warnDesc:    { fontSize: 12, color: '#DC2626', marginTop: 2, lineHeight: 17 },

  // Big emergency button
  bigTile: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 20, padding: 22, marginBottom: 16, gap: 16,
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  bigIconWrap: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  bigLabel: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 28 },
  bigDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  // 2-col grid
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  smallTile: {
    width: '47.5%', borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  smallIconBox: {
    width: 54, height: 54, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  smallLabel: { fontSize: 16, fontWeight: '800', lineHeight: 22, marginBottom: 4 },
  smallDesc:  { fontSize: 12, color: TEXT_MUTED },
});
