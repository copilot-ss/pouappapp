import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import OutfitPreview from '../OutfitPreview';
import { getLevelInfo } from '../../lib/progression';
import { getSpecies } from '../../domain/species';
import { ensureAccount } from '../../state/account';
import { addFriend, loadFriends, removeFriend } from '../../state/friends';
import {
  cloudAvailable,
  getSession,
  getOrCreateProfile,
  fetchFriends,
  fetchRequests,
  sendFriendRequestByCode,
  acceptRequest,
  declineRequest,
  removeFriendship,
} from '../../state/cloudFriends';

let Clipboard = null;
try {
  // Some dev clients might miss the native module; handle gracefully.
  const mod = require('expo-clipboard');
  Clipboard = mod?.default ?? mod;
} catch (error) {
  if (__DEV__) {
    console.warn('expo-clipboard native module missing; copy disabled.', error);
  }
}

function formatCode(code) {
  if (!code) return '------';
  return String(code).toUpperCase();
}

export default function FriendsScreen({
  open,
  onClose,
  onVisitFriend = () => {},
  onFriendRemoved = () => {},
  onOpenProfile = () => {},
  selfSnapshot = null,
}) {
  const [copyFeedback, setCopyFeedback] = React.useState(null);
  // Local offline state
  const [me, setMe] = React.useState(null);
  const [friends, setFriends] = React.useState([]);
  const [name, setName] = React.useState('');
  const [codeInput, setCodeInput] = React.useState('');
  const [nameInput, setNameInput] = React.useState('');
  const localVisitorSnapshot = React.useMemo(() => {
    if (!selfSnapshot) return null;
    const equipped = selfSnapshot.equipped && typeof selfSnapshot.equipped === 'object' ? selfSnapshot.equipped : {};
    return {
      name: selfSnapshot.name || null,
      petType: selfSnapshot.petType || null,
      equipped,
      xp: typeof selfSnapshot.xp === 'number' ? selfSnapshot.xp : null,
    };
  }, [selfSnapshot]);
  // Cloud state
  const [cloud, setCloud] = React.useState(false);
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [cloudProfile, setCloudProfile] = React.useState(null);
  const [cloudFriends, setCloudFriends] = React.useState([]);
  const [requests, setRequests] = React.useState([]);
  const [friendRequestError, setFriendRequestError] = React.useState(null);
  const [friendRequestMessage, setFriendRequestMessage] = React.useState(null);
  const [refreshingCloud, setRefreshingCloud] = React.useState(false);
  const [selectedFriend, setSelectedFriend] = React.useState(null);
  const [removalConfirm, setRemovalConfirm] = React.useState(false);
  const [removingFriend, setRemovingFriend] = React.useState(false);
  const [removalError, setRemovalError] = React.useState(null);
  const copyResetRef = React.useRef(null);
  const showCopyMessage = React.useCallback((message) => {
    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current);
    }
    setCopyFeedback(message);
    copyResetRef.current = setTimeout(() => {
      setCopyFeedback(null);
      copyResetRef.current = null;
    }, 1200);
  }, [setCopyFeedback]);
  React.useEffect(() => {
    return () => {
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
      }
    };
  }, []);
  const handleCopy = React.useCallback((code) => {
    if (!code) return;
    const clip = Clipboard;
    if (clip?.setStringAsync) {
      Promise.resolve(clip.setStringAsync(String(code)))
        .then(() => showCopyMessage('Code kopiert!'))
        .catch(() => showCopyMessage('Kopieren fehlgeschlagen'));
      return;
    }
    if (clip && typeof clip.setString === 'function') {
      try {
        clip.setString(String(code));
        showCopyMessage('Code kopiert!');
      } catch (error) {
        showCopyMessage('Kopieren fehlgeschlagen');
      }
      return;
    }
    showCopyMessage('Zwischenablage nicht verfuegbar');
  }, [showCopyMessage]);
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const accountData = await ensureAccount();
        if (cancelled) return;
        setMe(accountData);
        setName(accountData?.name || '');
        const localFriends = await loadFriends();
        if (cancelled) return;
        setFriends(localFriends);

        const c = cloudAvailable();
        if (cancelled) return;
        setCloud(c);
        if (!c) return;

        setLoading(true);
        try {
          const s = await getSession();
          if (cancelled) return;
          setSession(s);
          if (!s) {
            setCloudProfile(null);
            setCloudFriends([]);
            setRequests([]);
            return;
          }
          const profile = await getOrCreateProfile(accountData?.name || '');
          if (cancelled) return;
          setCloudProfile(profile);
          setName(profile?.display_name || accountData?.name || '');
          const [friendsData, requestsData] = await Promise.all([fetchFriends(), fetchRequests()]);
          if (cancelled) return;
          setCloudFriends(friendsData);
          setRequests(requestsData);
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      } catch (error) {
        if (__DEV__) console.warn('FriendsScreen init failed', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);
  const normalizeFriendRequestError = React.useCallback((error) => {
    if (!error) return null;
    const message = typeof error === 'string' ? error : error?.message || 'Unbekannter Fehler';
    if (message.includes('cannot_request_self')) return 'Du kannst dich nicht selbst als Freund hinzufuegen.';
    if (message.includes('profiles') || message.includes('No rows found') || message.includes('invalid_code')) return 'Code nicht gefunden. Bitte pruefe die Eingabe.';
    if (message.includes('duplicate key') || message.includes('already')) return 'Anfrage besteht bereits.';
    if (message.includes('not_authenticated')) return 'Bitte melde dich an, um Freundschaftsanfragen zu nutzen.';
    return message;
  }, []);
  const refreshCloudData = React.useCallback(async ({ showSpinner = true } = {}) => {
    if (!cloud || !session) return;
    if (showSpinner) setRefreshingCloud(true);
    try {
      const [friendsData, requestsData] = await Promise.all([fetchFriends(), fetchRequests()]);
      setCloudFriends(friendsData);
      setRequests(requestsData);
    } finally {
      if (showSpinner) setRefreshingCloud(false);
    }
  }, [cloud, session]);
  const resetDetailState = React.useCallback(() => {
    setRemovalConfirm(false);
    setRemovalError(null);
    setRemovingFriend(false);
  }, []);
  React.useEffect(() => {
    if (!open) {
      setSelectedFriend(null);
      resetDetailState();
    }
  }, [open, resetDetailState]);
  const openFriendDetail = React.useCallback((friend) => {
    if (!friend) return;
    resetDetailState();
    setSelectedFriend(friend);
  }, [resetDetailState]);
  const closeFriendDetail = React.useCallback(() => {
    setSelectedFriend(null);
    resetDetailState();
  }, [resetDetailState]);
  const handleVisitFriend = React.useCallback((friend) => {
    if (!friend) return;
    if (typeof onVisitFriend === 'function') {
      let visitorSnapshot = null;
      if (cloud && session) {
        visitorSnapshot = {
          name: cloudProfile?.display_name || null,
          petType: cloudProfile?.pet_type || null,
          equipped: cloudProfile?.equipped || null,
          xp: typeof cloudProfile?.xp === 'number' ? cloudProfile.xp : null,
        };
      }
      const fallback = localVisitorSnapshot;
      if (visitorSnapshot) {
        if (fallback) {
          if (!visitorSnapshot.name) visitorSnapshot.name = fallback.name || null;
          if (!visitorSnapshot.petType) visitorSnapshot.petType = fallback.petType || null;
          if (!visitorSnapshot.equipped || typeof visitorSnapshot.equipped !== 'object') {
            visitorSnapshot.equipped = fallback.equipped || {};
          }
          if (typeof visitorSnapshot.xp !== 'number') {
            visitorSnapshot.xp = typeof fallback.xp === 'number' ? fallback.xp : 0;
          }
        } else {
          if (!visitorSnapshot.name) visitorSnapshot.name = name || 'Unbenannt';
          if (!visitorSnapshot.petType) visitorSnapshot.petType = null;
          if (!visitorSnapshot.equipped || typeof visitorSnapshot.equipped !== 'object') {
            visitorSnapshot.equipped = {};
          }
          if (typeof visitorSnapshot.xp !== 'number') visitorSnapshot.xp = 0;
        }
      } else if (fallback) {
        visitorSnapshot = {
          name: fallback.name || (name || 'Unbenannt'),
          petType: fallback.petType || null,
          equipped: fallback.equipped || {},
          xp: typeof fallback.xp === 'number' ? fallback.xp : 0,
        };
      }
      onVisitFriend({ friend, visitor: visitorSnapshot });
    }
    closeFriendDetail();
  }, [cloud, session, cloudProfile, name, onVisitFriend, closeFriendDetail, localVisitorSnapshot]);
  const confirmRemoveSelectedFriend = React.useCallback(async () => {
    if (!selectedFriend) return;
    setRemovingFriend(true);
    setRemovalError(null);
    try {
      if (selectedFriend.kind === 'cloud') {
        await removeFriendship(selectedFriend.friendId);
        await refreshCloudData({ showSpinner: false });
      } else if (selectedFriend.kind === 'offline') {
        const list = await removeFriend(selectedFriend.localId);
        setFriends(list);
      }
      if (typeof onFriendRemoved === 'function') {
        onFriendRemoved(selectedFriend);
      }
      setFriendRequestError(null);
      closeFriendDetail();
      setFriendRequestMessage('Freund entfernt.');
    } catch (error) {
      setRemovalError(normalizeFriendRequestError(error) || 'Entfernen fehlgeschlagen.');
    } finally {
      setRemovingFriend(false);
    }
  }, [selectedFriend, refreshCloudData, onFriendRemoved, closeFriendDetail, normalizeFriendRequestError, removeFriendship, removeFriend, setFriends, setFriendRequestMessage]);
  const formatTimestamp = React.useCallback((value) => {
    if (!value) return 'Unbekannt';
    try {
      return new Date(value).toLocaleString('de-DE');
    } catch (error) {
      return 'Unbekannt';
    }
  }, []);

  if (!open) return null;
  const activeFriendCode = (cloud && session ? cloudProfile?.code : null) || me?.code;
  const formattedFriendCode = formatCode(activeFriendCode);
  const copyDisabled = !activeFriendCode;
  let selectedFriendMeta = '';
  let selectedFriendVisitPayload = null;
  let selectedFriendLevel = null;
  let selectedFriendSpecies = null;
  if (selectedFriend) {
    if (selectedFriend.kind === 'cloud') {
      const { level } = getLevelInfo(selectedFriend.xp || 0);
      const species = selectedFriend.petType ? getSpecies(selectedFriend.petType) : null;
      selectedFriendMeta = `Lv. ${level} - ${species ? species.name : 'Unbekanntes Tier'}`;
      selectedFriendVisitPayload = {
        kind: 'cloud',
        id: selectedFriend.friendId,
        name: selectedFriend.displayName,
        code: selectedFriend.code,
        xp: selectedFriend.xp || 0,
        petType: selectedFriend.petType || null,
        equipped: selectedFriend.equipped || {},
      };
    } else {
      selectedFriendMeta = 'Offline-Freund';
    }
  }
  const handleAdd = async () => {
    if (!codeInput.trim()) return;
    if (cloud && session) {
      setLoading(true);
      setFriendRequestError(null);
      setFriendRequestMessage(null);
      try {
        await sendFriendRequestByCode(codeInput.trim());
        setCodeInput('');
        setNameInput('');
        setFriendRequestMessage('Anfrage gesendet!');
        await refreshCloudData({ showSpinner: false });
      } catch (error) {
        setFriendRequestError(normalizeFriendRequestError(error));
      } finally {
        setLoading(false);
      }
    } else {
      const list = await addFriend({ code: codeInput.trim(), name: nameInput.trim() });
      setFriends(list);
      setCodeInput('');
      setNameInput('');
    }
  };

  const handleRemove = async (id) => {
    if (cloud && session) {
      // Removing cloud friendships would require an RPC; not implemented here.
      return;
    }
    const list = await removeFriend(id);
    setFriends(list);
  };

  const handleAccept = async (id) => {
    setLoading(true);
    try {
      await acceptRequest(id);
      const fr = await fetchFriends();
      setCloudFriends(fr);
      const req = await fetchRequests();
      setRequests(req);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (id) => {
    setLoading(true);
    try {
      await declineRequest(id);
      const req = await fetchRequests();
      setRequests(req);
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.screen} pointerEvents="auto">
      <View style={styles.header}>
        <Text style={styles.title}>Freunde</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.profileLink} onPress={onOpenProfile}>
            <Text style={styles.profileLinkText}>Profil</Text>
          </Pressable>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeX}>{String.fromCodePoint(0x2715)}</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Freundescode</Text>
          <View style={styles.codeCard}>
            <Text style={styles.code}>{formattedFriendCode}</Text>
            <Pressable
              style={[styles.copyBtn, copyDisabled && styles.refreshBtnDisabled]}
              onPress={() => handleCopy(activeFriendCode)}
              disabled={copyDisabled}
            >
              <Text style={styles.copyBtnText}>Kopieren</Text>
            </Pressable>
          </View>
          {copyFeedback ? <Text style={styles.copyFeedback}>{copyFeedback}</Text> : null}
          <Text style={styles.hint}>Teile diesen Code, damit dich Freunde hinzufuegen koennen.</Text>
        </View>

        <Text style={styles.sectionTitle}>Freund hinzufuegen</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Code</Text>
          <TextInput
            style={styles.input}
            placeholder="z.B. ABC123"
            value={codeInput}
            autoCapitalize="characters"
            onChangeText={setCodeInput}
            returnKeyType="next"
          />
          <Pressable style={styles.primaryBtn} onPress={handleAdd}>
            <Text style={styles.primaryBtnText}>{cloud && session ? 'Anfrage senden' : 'Hinzufuegen (offline)'}</Text>
          </Pressable>
        </View>
        {friendRequestMessage ? <Text style={styles.statusSuccess}>{friendRequestMessage}</Text> : null}

        {cloud && session ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Anfragen</Text>
              <Pressable
                style={[styles.refreshBtn, (refreshingCloud || loading) && styles.refreshBtnDisabled]}
                disabled={refreshingCloud || loading}
                onPress={() => refreshCloudData({ showSpinner: true })}
              >
                <Text style={styles.refreshBtnText}>{refreshingCloud ? 'Aktualisiere...' : 'Neu laden'}</Text>
              </Pressable>
            </View>
            <View style={{ gap: 10 }}>
              {requests.length === 0 && (
                <Text style={styles.hint}>Keine offenen Anfragen.</Text>
              )}
              {requests.map((r) => (
                <View key={r.id} style={styles.friendRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendName}>{r.requester_name || 'Unbekannt'}</Text>
                    <Text style={styles.friendCode}>{r.requester_code}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={styles.primaryBtn} onPress={() => handleAccept(r.id)}>
                      <Text style={styles.primaryBtnText}>Annehmen</Text>
                    </Pressable>
                    <Pressable style={styles.removeBtn} onPress={() => handleDecline(r.id)}>
                      <Text style={styles.removeBtnText}>Ablehnen</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Deine Freunde</Text>
            <View style={{ gap: 10 }}>
              {cloudFriends.length === 0 && (
                <Text style={styles.hint}>Noch keine Freunde angenommen.</Text>
              )}
              {cloudFriends.map((f) => {
                const { level } = getLevelInfo(f.friend_xp || 0);
                const species = f.friend_pet_type ? getSpecies(f.friend_pet_type) : null;
                const meta = `Lv. ${level} - ${species ? species.name : 'Unbekannt'}`;
                return (
                  <Pressable
                    key={f.friend_id}
                    style={styles.friendRow}
                    onPress={() =>
                      openFriendDetail({
                        kind: 'cloud',
                        friendId: f.friend_id,
                        displayName: f.friend_name || 'Unbenannt',
                        code: f.friend_code,
                        xp: typeof f.friend_xp === 'number' ? f.friend_xp : 0,
                        petType: f.friend_pet_type || null,
                        equipped: f.friend_equipped || {},
                        lastSeen: f.friend_last_seen || null,
                      })
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{f.friend_name || 'Unbenannt'}</Text>
                      <Text style={styles.friendMeta}>{meta}</Text>
                      <Text style={styles.friendCode}>{f.friend_code}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Deine Freunde</Text>
            <View style={{ gap: 10 }}>
              {friends.length === 0 && (
                <Text style={styles.hint}>Noch keine Freunde. Fuege jemanden per Code hinzu.</Text>
              )}
              {friends.map((f) => {
                const displayName = f.name || 'Unbenannt';
                const code = formatCode(f.code);
                return (
                  <Pressable
                    key={f.id}
                    style={styles.friendRow}
                    onPress={() =>
                      openFriendDetail({
                        kind: 'offline',
                        localId: f.id,
                        displayName,
                        code,
                      })
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{displayName}</Text>
                      <Text style={styles.friendMeta}>Offline-Freund</Text>
                      <Text style={styles.friendCode}>{code}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
        {loading && <ActivityIndicator style={{ marginTop: 8 }} />}
      </ScrollView>
      {selectedFriend && (
        <View style={styles.detailOverlay} pointerEvents="auto">
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{selectedFriend.displayName}</Text>
                <Text style={styles.detailSubtitle}>{selectedFriend.code ? `Code: ${selectedFriend.code}` : 'Kein Code'}</Text>
                <Text style={styles.detailMeta}>{selectedFriendMeta}</Text>
                {selectedFriendLevel ? (
                  <Text style={styles.detailSubtle}>Level {selectedFriendLevel}</Text>
                ) : null}
                {selectedFriendSpecies ? (
                  <Text style={styles.detailSubtle}>Tier: {selectedFriendSpecies}</Text>
                ) : null}
                {selectedFriend.kind === 'cloud' && selectedFriend.lastSeen ? (
                  <Text style={styles.detailSubtle}>Zuletzt aktiv: {formatTimestamp(selectedFriend.lastSeen)}</Text>
                ) : null}
              </View>
              <Pressable style={styles.detailCloseBtn} onPress={closeFriendDetail}>
                <Text style={styles.detailCloseText}>{String.fromCodePoint(0x2715)}</Text>
              </Pressable>
            </View>
            {selectedFriend.kind === 'cloud' ? (
              <View style={styles.detailPreview}>
                <OutfitPreview species={selectedFriend.petType || 'seestern'} equipped={selectedFriend.equipped} />
              </View>
            ) : (
              <View style={styles.detailEmptyPreview}>
                <Text style={styles.detailSubtle}>Keine Cloud-Daten verfuegbar.</Text>
              </View>
            )}
            {removalError ? <Text style={styles.statusError}>{removalError}</Text> : null}
            <View style={styles.detailActions}>
              {selectedFriendVisitPayload && session ? (
                <Pressable style={styles.visitBtn} onPress={() => handleVisitFriend(selectedFriendVisitPayload)}>
                  <Text style={styles.visitBtnText}>Besuchen</Text>
                </Pressable>
              ) : null}
              {removalConfirm ? (
                <Pressable
                  style={[styles.removeConfirmBtn, removingFriend && styles.refreshBtnDisabled]}
                  onPress={confirmRemoveSelectedFriend}
                  disabled={removingFriend}
                >
                  <Text style={styles.removeConfirmText}>{removingFriend ? 'Entferne...' : 'Entfernen bestaetigen'}</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.detailRemoveBtn} onPress={() => setRemovalConfirm(true)}>
                  <Text style={styles.detailRemoveText}>Freund entfernen</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}
      {friendRequestError ? <Text style={[styles.statusError, { position: 'absolute', bottom: 12, left: 12 }]}>{friendRequestError}</Text> : null}
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
    paddingTop: 56,
    backgroundColor: '#FFFFFF',
    zIndex: 110,
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
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeBtn: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  closeX: { fontSize: 28, color: '#111827', fontWeight: '900' },
  profileLink: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#BAE6FD' },
  profileLinkText: { color: '#0369A1', fontWeight: '700', fontSize: 13 },
  content: { paddingHorizontal: 12, paddingBottom: 24, paddingTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 8, color: '#111827' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 },
  refreshBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#111827' },
  refreshBtnDisabled: { opacity: 0.5 },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  codeCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E7FF', backgroundColor: '#EEF2FF', borderRadius: 14, padding: 12, gap: 12 },
  copyBtn: { backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  copyBtnText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.5, fontSize: 13 },
  copyFeedback: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  card: { borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  primaryBtn: { backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignSelf: 'flex-start' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },
  code: { fontSize: 22, fontWeight: '800', letterSpacing: 2, color: '#111827' },
  hint: { color: '#6B7280', fontSize: 12 },
  friendRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10, gap: 12 },
  friendName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  friendMeta: { fontSize: 12, fontWeight: '500', color: '#4B5563' },
  statusSuccess: { marginTop: 6, color: '#10B981', fontSize: 12, fontWeight: '600' },
  statusError: { marginTop: 6, color: '#DC2626', fontSize: 12, fontWeight: '600' },
  friendCode: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  removeBtn: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  removeBtnText: { fontSize: 12, fontWeight: '800', color: '#111827' },
  detailOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(17,24,39,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, zIndex: 500 },
  detailCard: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, gap: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  detailSubtitle: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  detailMeta: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginTop: 4 },
  detailSubtle: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  detailCloseBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  detailCloseText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  detailPreview: { borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 16, alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.8 }] },
  detailEmptyPreview: { borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 16, paddingVertical: 24, alignItems: 'center' },
  detailActions: { gap: 10, marginTop: 6 },
  visitBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  visitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  detailRemoveBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#DC2626' },
  detailRemoveText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  removeConfirmBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#DC2626' },
  removeConfirmText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});


