/**
 * ManualDispenseScreen.tsx — Emergency / manual dispense
 *
 * Designed for low-literacy users:
 *  • Every medicine shown as a large coloured card with icon
 *  • Big ± buttons for quantity
 *  • Cart shows exactly what will be dispensed
 *  • Live animation: "Dispensing tablet X of Y" with progress bar
 */

import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { dispenseApi } from '../services/api';
import Icon from '../components/Icon';

// ─── Palette ─────────────────────────────────────────────────────────────────
const PRIMARY   = '#0D9488';
const DANGER    = '#DC2626';
const BG        = '#F8FAFC';
const CARD      = '#FFFFFF';
const DARK      = '#0F172A';
const MUTED     = '#64748B';
const BORDER    = '#E2E8F0';
const PILL_COLORS = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#8B5CF6','#14B8A6'];

function slotColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PILL_COLORS[h % PILL_COLORS.length];
}

// Time one tablet takes in Blender: 40 steps × 0.05 s/step rotation + 3.0 s fall pause.
// We hold the UI progress for this duration so it matches the physical animation.
const SECONDS_PER_TABLET = 5.0;


interface Medicine {
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
  status: 'online' | 'offline';
}

interface CartItem { medicine: Medicine; quantity: number; }

export interface ManualDispenseScreenProps {
  medicines: Medicine[];
  devices: Device[];
  onBack: () => void;
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ManualDispenseScreen({
  medicines, devices, onBack,
}: ManualDispenseScreenProps) {

  const [cart, setCart]             = useState<CartItem[]>([]);
  const [dispensing, setDispensing] = useState(false);
  const [results, setResults]       = useState<{ name: string; ok: boolean; msg: string }[]>([]);
  const [progress, setProgress]     = useState<{
    medicineName: string; cartridgeId: string;
    tabletIndex: number; totalTablets: number; globalIndex: number;
  } | null>(null);
  const [resetting, setResetting]   = useState(false);

  const available = medicines
    .filter(m => m.quantity > 0)
    .sort((a, b) => a.cartridgeSlot - b.cartridgeSlot);

  const inCart  = (m: Medicine) => cart.find(i => i.medicine.id === m.id)?.quantity ?? 0;
  const maxAdd  = (m: Medicine) => Math.min(8, m.quantity - inCart(m));
  const total   = cart.reduce((s, i) => s + i.quantity, 0);

  const handleAddToCart = (med: Medicine) => {
    if (maxAdd(med) <= 0) return;
    setCart(prev => {
      const ex = prev.find(i => i.medicine.id === med.id);
      if (ex) return prev.map(i => i.medicine.id === med.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { medicine: med, quantity: 1 }];
    });
    setResults([]);
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.medicine.id !== id));

  const handleDispenseAll = async () => {
    if (cart.length === 0 || dispensing) return;
    setDispensing(true);
    setResults([]);
    setProgress(null);

    const newResults: { name: string; ok: boolean; msg: string }[] = [];
    let globalIndex = 0;

    for (const item of cart) {
      const cartridgeId = `C${item.medicine.cartridgeSlot}`;
      let itemFailed = false;

      for (let t = 1; t <= item.quantity; t++) {
        globalIndex += 1;
        setProgress({
          medicineName: item.medicine.name,
          cartridgeId,
          tabletIndex:  t,
          totalTablets: total,
          globalIndex,
        });

        const res = await dispenseApi.byCartridge(cartridgeId, 1);
        if (res.status !== 'success') {
          newResults.push({ name: item.medicine.name, ok: false, msg: res.message ?? 'Failed' });
          itemFailed = true;
          break;
        }

        // Hold the dispensing loader for the physical animation duration so the
        // UI stays in sync with what Blender is actually doing.
        await new Promise<void>(resolve => setTimeout(resolve, SECONDS_PER_TABLET * 1000));
      }

      if (!itemFailed) {
        newResults.push({
          name: item.medicine.name, ok: true,
          msg: `${item.quantity} tablet${item.quantity !== 1 ? 's' : ''} dispensed ✓`,
        });
      }
    }

    setProgress(null);
    setDispensing(false);
    setResults(newResults);
    if (newResults.length > 0 && newResults.every(r => r.ok)) {
      setTimeout(() => setCart([]), 2000);
    }
  };

  const handleReset = async () => {
    if (resetting || dispensing) return;
    setResetting(true);
    setResults([]);

    const res = await dispenseApi.reset();
    
    if (res.status === 'success') {
      setResults([{
        name: 'System Reset',
        ok: true,
        msg: 'All cartridges and tablets restored to original positions ✓',
      }]);
    } else {
      setResults([{
        name: 'Reset Failed',
        ok: false,
        msg: res.message ?? 'Failed to reset system',
      }]);
    }

    setResetting(false);
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.7}>
          <Icon name="chevron-back" size={24} color={PRIMARY} />
          <Text style={s.backTxt}>Back</Text>
        </TouchableOpacity>
        <View style={s.titleArea}>
          <View style={s.titleIconBox}>
            <Icon name="flash-outline" size={18} color="#fff" />
          </View>
          <Text style={s.title}>Give Medicine Now</Text>
        </View>
        {cart.length > 0 && (
          <View style={s.cartBadge}>
            <Text style={s.cartBadgeTxt}>{cart.length}</Text>
          </View>
        )}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Warning banner */}
        <View style={s.warnBox}>
          <Icon name="warning-outline" size={20} color="#D97706" />
          <Text style={s.warnTxt}>This skips the normal schedule. Only use in an emergency.</Text>
        </View>

        {/* Emergency Reset Section */}
        <View style={s.resetSection}>
          <View style={s.resetHeader}>
            <Icon name="refresh-circle-outline" size={20} color="#8B5CF6" />
            <Text style={s.resetHeaderText}>System Reset</Text>
          </View>
          <Text style={s.resetDesc}>
            Reset all cartridges and tablets back to their original positions. Use this after testing or if tablets get stuck.
          </Text>
          <TouchableOpacity
            style={[s.resetBtn, resetting && s.resetBtnBusy]}
            onPress={handleReset}
            activeOpacity={0.85}
            disabled={resetting || dispensing}
          >
            {resetting ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.resetBtnTxt}>Resetting…</Text>
              </>
            ) : (
              <>
                <Icon name="refresh-circle-outline" size={20} color="#fff" />
                <Text style={s.resetBtnTxt}>Reset All Cartridges</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Step 1: Pick medicine ── */}
        <View style={s.stepHeader}>
          <View style={s.stepNum}><Text style={s.stepNumTxt}>1</Text></View>
          <Text style={s.stepTitle}>Pick a Medicine</Text>
        </View>

        {available.length === 0 ? (
          <View style={s.emptyBox}>
            <Icon name="medkit-outline" size={40} color={MUTED} />
            <Text style={s.emptyTxt}>No medicines in stock</Text>
          </View>
        ) : (
          <View style={s.medGrid}>
            {available.map(med => {
              const color   = slotColor(med.id);
              const already = inCart(med);
              const full    = maxAdd(med) <= 0;
              const low     = med.quantity <= 2;

              return (
                <View key={med.id} style={{ width: '47.5%' }}>
                  <View style={[
                    s.medCard,
                    { borderColor: already > 0 ? color : BORDER },
                    already > 0 && { backgroundColor: color + '08' },
                    full && s.medCardFull,
                  ]}>
                    {/* Color pill icon */}
                    <View style={[s.medPill, { backgroundColor: color + '22' }]}>
                      <Icon name="medkit-outline" size={28} color={color} />
                    </View>

                    {/* Name */}
                    <Text style={[s.medName, full && s.medNameFull]} numberOfLines={2}>{med.name}</Text>

                    {/* Slot */}
                    <View style={[s.slotBadge, { backgroundColor: color + '18' }]}>
                      <Text style={[s.slotTxt, { color }]}>Slot {med.cartridgeSlot}</Text>
                    </View>

                    {/* Stock */}
                    <Text style={[s.stockTxt, low && s.stockTxtLow]}>
                      {med.quantity} left{low ? ' ⚠️' : ''}
                    </Text>

                    {/* Add to cart button */}
                    <TouchableOpacity
                      style={[s.addBtn, { backgroundColor: full ? BORDER : color }, { marginTop: 10 }]}
                      onPress={() => handleAddToCart(med)}
                      activeOpacity={0.8}
                      disabled={full || dispensing}
                    >
                      <Icon name="add-circle-outline" size={16} color={full ? MUTED : '#fff'} />
                      <Text style={[s.addBtnTxt, full && { color: MUTED }]}>
                        {full ? 'Max added' : already > 0 ? `Add more (${already})` : 'Add to Dose'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Step 2: Review cart ── */}
        {cart.length > 0 && (
          <>
            <View style={[s.stepHeader, { marginTop: 28 }]}>
              <View style={[s.stepNum, { backgroundColor: DANGER }]}>
                <Text style={s.stepNumTxt}>2</Text>
              </View>
              <Text style={s.stepTitle}>Your Dose — {total} tablet{total !== 1 ? 's' : ''}</Text>
            </View>

            <View style={s.cartBox}>
              {cart.map((item, idx) => {
                const color = slotColor(item.medicine.id);
                return (
                  <View key={item.medicine.id} style={[s.cartRow, idx > 0 && s.cartRowBorder]}>
                    <View style={[s.cartPill, { backgroundColor: color + '22' }]}>
                      <Icon name="medkit-outline" size={20} color={color} />
                    </View>
                    <View style={s.cartInfo}>
                      <Text style={s.cartName} numberOfLines={1}>{item.medicine.name}</Text>
                      <Text style={s.cartMeta}>Cartridge {item.medicine.cartridgeSlot}</Text>
                    </View>
                    <View style={[s.cartQtyBox, { backgroundColor: color + '18' }]}>
                      <Text style={[s.cartQty, { color }]}>{item.quantity}</Text>
                      <Text style={[s.cartQtyLbl, { color }]}>tabs</Text>
                    </View>
                    <TouchableOpacity
                      style={s.cartRemoveBtn}
                      onPress={() => removeFromCart(item.medicine.id)}
                      activeOpacity={0.7}
                      disabled={dispensing}
                    >
                      <Icon name="trash-outline" size={18} color={DANGER} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Live progress */}
            {dispensing && progress && (
              <View style={s.progressBox}>
                <ActivityIndicator color={PRIMARY} size="large" />
                <View style={s.progressInfo}>
                  <Text style={s.progressMain}>
                    Dispensing {progress.globalIndex} / {progress.totalTablets} tablets
                  </Text>
                  <Text style={s.progressSub}>
                    {progress.medicineName} — Cartridge {progress.cartridgeId.replace('C', '')}
                  </Text>

                  {/* Progress bar */}
                  <View style={s.progressTrack}>
                    <View style={[
                      s.progressFill,
                      { width: `${(progress.globalIndex / progress.totalTablets) * 100}%` as any },
                    ]} />
                  </View>

                  {/* Dot indicators */}
                  <View style={s.dots}>
                    {Array.from({ length: progress.totalTablets }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          s.dot,
                          i < progress.globalIndex - 1 && s.dotDone,
                          i === progress.globalIndex - 1 && s.dotActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Results */}
            {results.length > 0 && (
              <View style={s.resultsBox}>
                {results.map(r => (
                  <View key={r.name} style={[s.resultRow, r.ok ? s.resultOk : s.resultErr]}>
                    <Icon
                      name={r.ok ? 'checkmark-circle' : 'alert-circle'}
                      size={22}
                      color={r.ok ? '#059669' : DANGER}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.resultName, { color: r.ok ? '#065F46' : DANGER }]}>{r.name}</Text>
                      <Text style={[s.resultMsg, { color: r.ok ? '#059669' : DANGER }]}>{r.msg}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Dispense button */}
            <TouchableOpacity
              style={[s.dispenseBtn, dispensing && s.dispenseBtnBusy]}
              onPress={handleDispenseAll}
              activeOpacity={0.85}
              disabled={dispensing}
            >
              {dispensing ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.dispenseBtnTxt}>Dispensing…</Text>
                </>
              ) : (
                <>
                  <Icon name="flash-outline" size={24} color="#fff" />
                  <Text style={s.dispenseBtnTxt}>
                    Dispense Now — {total} Tablet{total !== 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.clearBtn}
              onPress={() => { setCart([]); setResults([]); }}
              disabled={dispensing}
              activeOpacity={0.7}
            >
              <Icon name="trash-outline" size={16} color={MUTED} />
              <Text style={s.clearBtnTxt}>Clear dose</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14,
    backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER,
    gap: 10,
  },
  backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 60 },
  backTxt:    { fontSize: 16, color: PRIMARY, fontWeight: '700' },
  titleArea:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  titleIconBox:{ width: 30, height: 30, borderRadius: 8, backgroundColor: DANGER, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 16, fontWeight: '800', color: DARK },
  cartBadge:  {
    width: 28, height: 28, borderRadius: 14, backgroundColor: DANGER,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },

  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#FCD34D',
  },
  warnTxt: { flex: 1, fontSize: 14, color: '#92400E', fontWeight: '600', lineHeight: 20 },

  resetSection: {
    backgroundColor: '#F5F3FF', borderRadius: 16, padding: 16,
    marginBottom: 20, borderWidth: 1.5, borderColor: '#DDD6FE',
  },
  resetHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  resetHeaderText: {
    fontSize: 16, fontWeight: '800', color: '#6B21A8',
  },
  resetDesc: {
    fontSize: 13, color: '#7C3AED', lineHeight: 18, marginBottom: 14, fontWeight: '500',
  },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  resetBtnBusy: { backgroundColor: '#A78BFA' },
  resetBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },

  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  stepNum:    {
    width: 30, height: 30, borderRadius: 15, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  stepTitle:  { fontSize: 17, fontWeight: '800', color: DARK },

  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTxt: { fontSize: 16, fontWeight: '600', color: MUTED },

  // Medicine grid (2 columns)
  medGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  medCard: {
    backgroundColor: CARD, borderRadius: 16, padding: 14,
    borderWidth: 2, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  medCardFull:  { opacity: 0.45 },
  medPill:      {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  medName:      { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 6, lineHeight: 20, minHeight: 40 },
  medNameFull:  { color: MUTED },
  slotBadge:    { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, marginBottom: 6 },
  slotTxt:      { fontSize: 12, fontWeight: '700' },
  stockTxt:     { fontSize: 12, color: MUTED, fontWeight: '500' },
  stockTxtLow:  { color: '#DC2626', fontWeight: '700' },
  addedBadge:   {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  addedBadgeTxt: { fontSize: 10, fontWeight: '800', color: '#fff' },
  checkBadge:   {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },

  // Inline quantity panel (unused — kept for reference)
  qtyPanel: {
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12,
    borderWidth: 1.5, marginTop: 4,
  },
  qtyHowMany: { fontSize: 13, fontWeight: '700', color: DARK, textAlign: 'center', marginBottom: 10 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 10,
  },
  addBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
  cartBox: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
    overflow: 'hidden', marginBottom: 16,
  },
  cartRow:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  cartRowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  cartPill:      {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cartInfo:      { flex: 1, minWidth: 0 },
  cartName:      { fontSize: 14, fontWeight: '700', color: DARK },
  cartMeta:      { fontSize: 12, color: MUTED, marginTop: 2 },
  cartQtyBox:    {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flexShrink: 0,
  },
  cartQty:       { fontSize: 20, fontWeight: '900' },
  cartQtyLbl:    { fontSize: 10, fontWeight: '600', marginTop: 1 },
  cartRemoveBtn: { padding: 8, flexShrink: 0 },

  // Progress
  progressBox: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#E0F2FE', borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#BAE6FD',
  },
  progressInfo:  { flex: 1 },
  progressMain:  { fontSize: 16, fontWeight: '800', color: '#0369A1', marginBottom: 4 },
  progressSub:   { fontSize: 13, color: '#0284C7', marginBottom: 12 },
  progressTrack: { height: 8, backgroundColor: '#BAE6FD', borderRadius: 4, marginBottom: 10, overflow: 'hidden' },
  progressFill:  { height: 8, backgroundColor: PRIMARY, borderRadius: 4 },
  dots:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dot:    { width: 12, height: 12, borderRadius: 6, backgroundColor: '#BAE6FD' },
  dotDone:{ backgroundColor: '#059669' },
  dotActive:{ backgroundColor: PRIMARY, transform: [{ scale: 1.3 }] },

  // Results
  resultsBox: { gap: 8, marginBottom: 14 },
  resultRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14 },
  resultOk:   { backgroundColor: '#D1FAE5' },
  resultErr:  { backgroundColor: '#FEE2E2' },
  resultName: { fontSize: 14, fontWeight: '700' },
  resultMsg:  { fontSize: 13, marginTop: 2 },

  // Dispense button
  dispenseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingVertical: 20, borderRadius: 18, backgroundColor: DANGER,
    shadowColor: DANGER, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6, marginBottom: 12,
  },
  dispenseBtnBusy: { backgroundColor: '#F87171' },
  dispenseBtnTxt:  { fontSize: 18, fontWeight: '900', color: '#fff' },

  clearBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  clearBtnTxt: { fontSize: 14, color: MUTED, fontWeight: '600' },
});
