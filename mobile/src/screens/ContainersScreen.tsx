import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';

interface Device {
  id: string;
  name: string;
  deviceUid: string;
  cartridgeCount: number;
}

interface CartridgeConfig {
  medicineName: string;
  dosage: string;
  notes: string;
}

interface ContainersScreenProps {
  devices: Device[];
  onBack: () => void;
}

const PRIMARY = '#0D9488';
const BG = '#F0FDFA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#111827';
const TEXT_MUTED = '#6B7280';
const BORDER = '#E5E7EB';

export default function ContainersScreen({ devices, onBack }: ContainersScreenProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(
    devices.length > 0 ? devices[0].id : null
  );
  const [configs, setConfigs] = useState<Record<string, CartridgeConfig[]>>(() => {
    const initial: Record<string, CartridgeConfig[]> = {};
    for (const device of devices) {
      initial[device.id] = Array.from({ length: device.cartridgeCount }, () => ({
        medicineName: '',
        dosage: '',
        notes: '',
      }));
    }
    return initial;
  });

  const selectedDevice = devices.find(d => d.id === selectedDeviceId) ?? null;
  const slots: CartridgeConfig[] = selectedDevice ? (configs[selectedDevice.id] ?? []) : [];

  const updateSlot = (slotIndex: number, field: keyof CartridgeConfig, value: string) => {
    if (!selectedDevice) return;
    setConfigs(prev => {
      const updated = prev[selectedDevice.id].map((slot, i) =>
        i === slotIndex ? { ...slot, [field]: value } : slot
      );
      return { ...prev, [selectedDevice.id]: updated };
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Configured</Text>
        <View style={styles.headerSpacer} />
      </View>

      {devices.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No devices found</Text>
          <Text style={styles.emptyDesc}>Add a device first to configure its cartridges</Text>
        </View>
      ) : (
        <>
          {/* Device Selector */}
          <Text style={styles.sectionLabel}>Select Device</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deviceSelectorRow}
            style={styles.deviceSelectorScroll}
          >
            {devices.map(device => (
              <TouchableOpacity
                key={device.id}
                style={[
                  styles.deviceChip,
                  device.id === selectedDeviceId && styles.deviceChipActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedDeviceId(device.id)}
              >
                <Text
                  style={[
                    styles.deviceChipText,
                    device.id === selectedDeviceId && styles.deviceChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {device.name}
                </Text>
                <Text
                  style={[
                    styles.deviceChipSub,
                    device.id === selectedDeviceId && styles.deviceChipSubActive,
                  ]}
                >
                  {device.cartridgeCount} slots
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Cartridge Slots */}
          {selectedDevice && (
            <>
              <View style={styles.slotHeader}>
                <Text style={styles.slotHeaderTitle}>
                  {selectedDevice.name}
                </Text>
                <Text style={styles.slotHeaderSub}>
                  {selectedDevice.cartridgeCount} cartridge{selectedDevice.cartridgeCount !== 1 ? 's' : ''}
                </Text>
              </View>

              <View style={styles.slotList}>
                {slots.map((slot, index) => (
                  <View key={index} style={styles.slotCard}>
                    <View style={styles.slotCardHeader}>
                      <View style={styles.slotBadge}>
                        <Text style={styles.slotBadgeText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.slotTitle}>Cartridge {index + 1}</Text>
                    </View>

                    <Text style={styles.inputLabel}>Medicine Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Metformin 500mg"
                      placeholderTextColor="#9CA3AF"
                      value={slot.medicineName}
                      onChangeText={val => updateSlot(index, 'medicineName', val)}
                    />

                    <Text style={styles.inputLabel}>Dosage</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 1 tablet"
                      placeholderTextColor="#9CA3AF"
                      value={slot.dosage}
                      onChangeText={val => updateSlot(index, 'dosage', val)}
                    />

                    <Text style={styles.inputLabel}>Notes</Text>
                    <TextInput
                      style={[styles.input, styles.inputMultiline]}
                      placeholder="e.g. Take after meals"
                      placeholderTextColor="#9CA3AF"
                      value={slot.notes}
                      onChangeText={val => updateSlot(index, 'notes', val)}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    paddingVertical: 6,
  },
  backText: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  headerSpacer: {
    width: 48,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  deviceSelectorScroll: {
    marginBottom: 24,
  },
  deviceSelectorRow: {
    gap: 10,
    paddingRight: 4,
  },
  deviceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: BORDER,
    minWidth: 130,
    alignItems: 'center',
  },
  deviceChipActive: {
    backgroundColor: PRIMARY + '15',
    borderColor: PRIMARY,
  },
  deviceChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 2,
  },
  deviceChipTextActive: {
    color: PRIMARY,
  },
  deviceChipSub: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  deviceChipSubActive: {
    color: PRIMARY,
  },
  slotHeader: {
    marginBottom: 16,
  },
  slotHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  slotHeaderSub: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  slotList: {
    gap: 16,
  },
  slotCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  slotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  slotBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  slotBadgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  slotTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_DARK,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: TEXT_DARK,
    backgroundColor: '#F9FAFB',
    marginBottom: 14,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingTop: 12,
    marginBottom: 0,
  },
});
