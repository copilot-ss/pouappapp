import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function formatCode(code) {
  if (!code) return '------';
  return String(code).toUpperCase();
}

function OfflineFriendRow({ item, onPress }) {
  const displayName = item.name || 'Unbenannt';
  const code = formatCode(item.code);
  return (
    <Pressable style={styles.friendRow} onPress={onPress}>
      <View style={styles.friendRowBody}>
        <View style={styles.friendRowTitle}>
          <View style={styles.onlineDot} />
          <Text style={styles.friendName}>{displayName}</Text>
        </View>
        <Text style={styles.friendMeta}>Offline-Freund</Text>
        <Text style={styles.friendCode}>{code}</Text>
      </View>
    </Pressable>
  );
}

export default React.memo(OfflineFriendRow);

const styles = StyleSheet.create({
  friendRow: { borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, gap: 8 },
  friendRowBody: { gap: 6, flex: 1 },
  friendRowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB' },
  friendName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  friendMeta: { fontSize: 12, fontWeight: '500', color: '#4B5563' },
  friendCode: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
});

