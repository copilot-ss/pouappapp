import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';

const GAMES = [
  { key: 'tap', title: 'Tap-Spiel', desc: 'Schnell tippen fuer Punkte' },
  { key: 'reaction', title: 'Reaktions-Test', desc: 'Tippe sobald GO! erscheint' },
  { key: 'catch', title: 'Catch Game', desc: 'Fang die fallenden Snacks' },
  { key: 'casino', title: 'Glücksspiel', desc: 'Coinflip, Dice, Blackjack' },
];

export default function GamesMenu({ open, onClose, onSelect }) {
  if (!open) return null;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Spiele</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Text style={styles.closeX}>{String.fromCodePoint(0x2715)}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {GAMES.map((g) => (
              <Pressable key={g.key} style={styles.card} onPress={() => onSelect && onSelect(g.key)}>
                <Text style={styles.cardTitle}>{g.title}</Text>
                <Text style={styles.cardDesc}>{g.desc}</Text>
                <Text style={styles.cardGo}>Start</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  sheet: { width: '88%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  closeBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  closeX: { fontSize: 22, fontWeight: '900', color: '#111827' },
  list: { padding: 12, gap: 12 },
  card: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  cardDesc: { marginTop: 4, fontSize: 13, color: '#6B7280' },
  cardGo: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#111827', color: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, fontWeight: '700' },
});




