import React from 'react';
import { Text, StyleSheet, View } from 'react-native';

export default function CoinsInline({ coins }) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.text}>{String.fromCodePoint(0x1F4B0)} {coins}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14, fontWeight: '700', color: '#111827' },
});

