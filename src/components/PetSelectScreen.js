import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SPECIES_ORDER, getSpecies } from '../domain/species';

export default function PetSelectScreen({ open, onSelect }) {
  if (!open) return null;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Waehle dein Tier</Text>
          <Text style={styles.subtitle}>Du behaeltst es das ganze Spiel.</Text>
          <ScrollView contentContainerStyle={styles.grid}>
            {SPECIES_ORDER.map((id) => {
              const s = getSpecies(id);
              return (
                <Pressable key={id} style={styles.card} onPress={() => onSelect && onSelect(id)}>
                  <Text style={styles.emoji}>{s.emoji}</Text>
                  <Text style={styles.name}>{s.name}</Text>
                  <Text style={styles.pick}>Auswaehlen</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.hint}>Spaeter nicht aenderbar.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  sheet: { width: '90%', maxHeight: '80%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6B7280', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 12 },
  card: { width: '30%', aspectRatio: 0.9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#F9FAFB', padding: 8 },
  emoji: { fontSize: 32 },
  name: { marginTop: 6, fontWeight: '700', color: '#111827', fontSize: 12, textAlign: 'center' },
  pick: { marginTop: 6, backgroundColor: '#111827', color: '#FFFFFF', fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 12 },
  hint: { textAlign: 'center', color: '#6B7280', marginTop: 4, fontSize: 12 },
});

