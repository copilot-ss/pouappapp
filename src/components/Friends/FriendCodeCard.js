import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function FriendCodeCard({
  formattedCode,
  onCopy,
  copyDisabled,
  copyFeedback,
  onOpenAdd,
  friendRequestMessage,
}) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dein Freundescode</Text>
        <View style={styles.codeCard}>
          <Text style={styles.code}>{formattedCode}</Text>
          <Pressable style={[styles.copyBtn, copyDisabled && styles.copyBtnDisabled]} onPress={onCopy} disabled={copyDisabled}>
            <Text style={styles.copyBtnText}>Kopieren</Text>
          </Pressable>
        </View>
        {copyFeedback ? <Text style={styles.statusSuccess}>{copyFeedback}</Text> : null}
        <Text style={styles.hint}>Teile den Code, damit dich Freunde hinzufuegen koennen.</Text>
        <Pressable style={styles.addFriendBtn} onPress={onOpenAdd}>
          <Text style={styles.addFriendBtnText}>Freund hinzufuegen</Text>
        </Pressable>
      </View>
      {friendRequestMessage ? <Text style={styles.statusSuccess}>{friendRequestMessage}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 8, color: '#111827' },
  card: { borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  codeCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E7FF', backgroundColor: '#EEF2FF', borderRadius: 14, padding: 12, gap: 12 },
  code: { fontSize: 22, fontWeight: '800', letterSpacing: 2, color: '#111827' },
  hint: { color: '#6B7280', fontSize: 12 },
  copyBtn: { backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  copyBtnDisabled: { opacity: 0.5 },
  copyBtnText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.5, fontSize: 13 },
  addFriendBtn: { marginTop: 6, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  addFriendBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  statusSuccess: { marginTop: 6, color: '#10B981', fontSize: 12, fontWeight: '600' },
});

