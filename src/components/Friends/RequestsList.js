import React, { useMemo } from 'react';
import { Animated, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function RequestsList({
  pendingGameInvites = [],
  requests = [],
  onAcceptGameInvite,
  onDeclineGameInvite,
  onAcceptRequest,
  onDeclineRequest,
  playInviteBlink,
}) {
  const data = useMemo(() => {
    const game = (pendingGameInvites || []).map((f) => ({ __type: 'game', item: f }));
    const req = (requests || []).map((r) => ({ __type: 'friend', item: r }));
    return [...game, ...req];
  }, [pendingGameInvites, requests]);

  return (
    <FlatList
      contentContainerStyle={styles.requestList}
      data={data}
      keyExtractor={(entry) => (entry.__type === 'game' ? `game-${entry.item.friend_id}` : `friend-${entry.item.id}`)}
      ListHeaderComponent={<Text style={[styles.sectionTitle, { marginTop: 0 }]}>Anfragen</Text>}
      ListEmptyComponent={<Text style={styles.requestEmpty}>Keine Anfragen.</Text>}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={6}
      removeClippedSubviews
      getItemLayout={(_, index) => ({ length: 80, offset: 80 * index, index })}
      renderItem={({ item: entry }) => (
        entry.__type === 'game' ? (
          <Animated.View style={[styles.requestRow, styles.playInviteRow, { opacity: playInviteBlink }]}> 
            <View style={{ flex: 1 }}>
              <Text style={styles.friendName}>{entry.item.friend_name || 'Unbenannt'}</Text>
              <Text style={styles.requestMeta}>TicTacToe-Anfrage</Text>
            </View>
            <View style={styles.requestActions}>
              <Pressable style={styles.primaryBtn} onPress={() => onAcceptGameInvite?.(entry.item)}>
                <Text style={styles.primaryBtnText}>Annehmen</Text>
              </Pressable>
              <Pressable style={styles.removeBtn} onPress={() => onDeclineGameInvite?.(entry.item)}>
                <Text style={styles.removeBtnText}>Ablehnen</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.requestRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.friendName}>{entry.item.requester_name || 'Unbekannt'}</Text>
              <Text style={styles.requestMeta}>Freundschaftsanfrage</Text>
            </View>
            <View style={styles.requestActions}>
              <Pressable style={styles.primaryBtn} onPress={() => onAcceptRequest?.(entry.item.id)}>
                <Text style={styles.primaryBtnText}>Annehmen</Text>
              </Pressable>
              <Pressable style={styles.removeBtn} onPress={() => onDeclineRequest?.(entry.item.id)}>
                <Text style={styles.removeBtnText}>Ablehnen</Text>
              </Pressable>
            </View>
          </View>
        )
      )}
    />
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 8, color: '#111827' },
  requestList: { gap: 12 },
  requestEmpty: { color: '#6B7280', fontSize: 12, textAlign: 'center', marginTop: 16 },
  requestRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, gap: 12 },
  requestMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playInviteRow: { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  primaryBtn: { backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignSelf: 'flex-start' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },
  removeBtn: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  removeBtnText: { fontSize: 12, fontWeight: '800', color: '#111827' },
  friendName: { fontSize: 14, fontWeight: '700', color: '#111827' },
});

