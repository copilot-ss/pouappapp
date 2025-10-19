import React from 'react';
import { View, Text, Pressable, StyleSheet, Switch } from 'react-native';

export default function SettingsScreen({
  open,
  onClose,
  sound,
  haptics,
  onChange,
  onResetPet,
}) {
  if (!open) return null;
  return (
    <View style={styles.screen} pointerEvents="auto">
      <View style={styles.header}>
        <Text style={styles.title}>Einstellungen</Text>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeX}>{String.fromCodePoint(0x2715)}</Text>
        </Pressable>
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Ton</Text>
          <Switch value={!!sound} onValueChange={(v) => onChange && onChange({ sound: v })} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Vibration</Text>
          <Switch value={!!haptics} onValueChange={(v) => onChange && onChange({ haptics: v })} />
        </View>
        <View style={[styles.row, { justifyContent: 'flex-start' }]}>
          <Pressable style={styles.resetBtn} onPress={onResetPet}>
            <Text style={styles.resetText}>Tier zurǬcksetzen</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 120,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  closeX: { fontSize: 28, color: '#111827', fontWeight: '900' },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 16, fontWeight: '700', color: '#111827' },
  resetBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  resetText: { color: '#991B1B', fontWeight: '800' },
});
