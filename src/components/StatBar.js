import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { clamp } from '../lib/utils';

export default function StatBar({ label, value, color = '#6CC24A', compact = false, hideValue = false }) {
  const pct = clamp(value);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.outer, compact && styles.outerCompact]}>
        <View style={[styles.inner, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      {!hideValue && <Text style={styles.value}>{Math.round(pct)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    width: 28,
    textAlign: 'center',
    fontSize: 18,
  },
  outer: {
    flex: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  outerCompact: {
    flex: 0,
    width: 130,
  },
  inner: {
    height: 12,
    borderRadius: 6,
  },
  value: {
    width: 28,
    textAlign: 'right',
    color: '#6B7280',
    fontSize: 12,
  },
});
