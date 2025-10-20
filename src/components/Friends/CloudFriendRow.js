import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getLevelInfo } from '../../lib/progression';
import { getSpecies } from '../../domain/species';

function CloudFriendRow({ friend, onPress, formatTimestamp }) {
  const { level } = getLevelInfo(friend.friend_xp || 0);
  const species = friend.friend_pet_type ? getSpecies(friend.friend_pet_type) : null;
  const meta = `Lv. ${level} - ${species ? species.name : 'Unbekannt'}`;
  return (
    <Pressable style={styles.friendRow} onPress={onPress}>
      <View style={styles.friendRowBody}>
        <View style={styles.friendRowTitle}>
          <View style={[styles.onlineDot, friend.isOnline && styles.onlineDotActive]} />
          <Text style={styles.friendName}>{friend.friend_name || 'Unbenannt'}</Text>
        </View>
        <Text style={styles.friendMeta}>{meta}</Text>
        <Text style={styles.friendCode}>{friend.friend_code}</Text>
        {!friend.isOnline && friend.friend_last_seen ? (
          <Text style={styles.friendLastSeen}>Zuletzt online: {formatTimestamp(friend.friend_last_seen)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default React.memo(CloudFriendRow);

const styles = StyleSheet.create({
  friendRow: { borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, gap: 8 },
  friendRowBody: { gap: 6, flex: 1 },
  friendRowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB' },
  onlineDotActive: { backgroundColor: '#22C55E' },
  friendName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  friendMeta: { fontSize: 12, fontWeight: '500', color: '#4B5563' },
  friendLastSeen: { fontSize: 11, color: '#6B7280' },
  friendCode: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
});

