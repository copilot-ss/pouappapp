import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';

function InventoryButton({ onPress }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onPress} style={styles.btn} hitSlop={8}>
        <Text style={styles.icon}>{String.fromCodePoint(0x1F392)}</Text>
      </Pressable>
    </View>
  );
}
export default React.memo(InventoryButton);

const styles = StyleSheet.create({
  row: { alignItems: 'flex-start', paddingHorizontal: 12, marginBottom: 6 },
  btn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  icon: { fontSize: 18 },
});
