import React from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ActivityIndicator, Animated, FlatList } from 'react-native';
import OutfitPreview from '../OutfitPreview';
import CloudFriendRow from './CloudFriendRow';
import OfflineFriendRow from './OfflineFriendRow';
import FriendCodeCard from './FriendCodeCard';
import RequestsList from './RequestsList';
import { getLevelInfo } from '../../lib/progression';
import { getSpecies } from '../../domain/species';
import { ensureAccount } from '../../api/profile';
import { addFriend, loadFriends, removeFriend } from '../../api/offlineFriends';
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
  fetchOpenGameInvites,
  acceptGameInvite,
  declineGameInvite,
  subscribeToGameInvites,
} from '../../api/cloudFriends';

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

const ONLINE_THRESHOLD_MS = 120 * 1000;

// row components moved to separate files for clarity

export default function FriendsScreen({
  open,
  onClose,
  onVisitFriend = () => {},
  onFriendRemoved = () => {},
  onOpenProfile = () => {},
  selfSnapshot = null,
  onInviteTicTacToe = () => {},
  onCancelTicTacToeInvite = () => {},
  onAcceptTicTacToeInvite = () => {},
  onDeclineTicTacToeInvite = () => {},
  ticTacToeStatusByFriend = {},
}) {
  const [copyFeedback, setCopyFeedback] = React.useState(null);
  // Local offline state
  const [me, setMe] = React.useState(null);
  const [friends, setFriends] = React.useState([]);
  const [name, setName] = React.useState('');
  const [codeInput, setCodeInput] = React.useState('');
  const [nameInput, setNameInput] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('friends');
  const [addModalOpen, setAddModalOpen] = React.useState(false);
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
  const [gameInvites, setGameInvites] = React.useState([]);
  const [friendRequestError, setFriendRequestError] = React.useState(null);
  const [friendRequestMessage, setFriendRequestMessage] = React.useState(null);
  const [refreshingCloud, setRefreshingCloud] = React.useState(false);
  const [selectedFriend, setSelectedFriend] = React.useState(null);
  const [removalConfirm, setRemovalConfirm] = React.useState(false);
  const [removingFriend, setRemovingFriend] = React.useState(false);
  const [removalError, setRemovalError] = React.useState(null);
  const ticTacToeStatuses = React.useMemo(
    () =>
      ticTacToeStatusByFriend && typeof ticTacToeStatusByFriend === 'object'
        ? ticTacToeStatusByFriend
        : {},
    [ticTacToeStatusByFriend],
  );
  const selectedFriendGameStatus = React.useMemo(() => {
    if (!selectedFriend || !selectedFriend.friendId) return null;
    return ticTacToeStatuses[selectedFriend.friendId] || null;
  }, [selectedFriend, ticTacToeStatuses]);
  const ticTacToeInviteState = React.useMemo(() => {
    if (!selectedFriend || selectedFriend.kind !== 'cloud') {
      return { label: 'Zum TicTacToe einladen', disabled: true, hint: null };
    }
    if (!session) {
      return {
        label: 'Zum TicTacToe einladen',
        disabled: true,
        hint: 'Cloud-Anmeldung erforderlich.',
      };
    }
    if (!cloud) {
      return {
        label: 'Zum TicTacToe einladen',
        disabled: true,
        hint: 'Cloud nicht verfuegbar.',
      };
    }
    let label = 'Zum TicTacToe einladen';
    let disabled = false;
    let hint = null;
    switch (selectedFriendGameStatus) {
      case 'pending-outgoing':
        label = 'Warte auf Antwort';
        disabled = true;
        hint = null;
        break;
      case 'pending-incoming':
        label = 'Antwort ausstehend';
        disabled = true;
        hint = 'Freund hat dich eingeladen.';
        break;
      case 'active':
        label = 'Spiel laeuft';
        disabled = true;
        hint = 'Spiel ist bereits aktiv.';
        break;
      case 'finished':
        label = 'Neu herausfordern';
        disabled = false;
        hint = 'Vorheriges Spiel beendet.';
        break;
      default:
        break;
    }
    return { label, disabled, hint };
  }, [cloud, selectedFriend, selectedFriendGameStatus, session]);
  const formatTimestamp = React.useCallback((value) => {
    if (!value) return 'Unbekannt';
    const time = new Date(value);
    if (Number.isNaN(time.getTime())) return 'Unbekannt';
    return time.toLocaleString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  }, []);
  const cloudFriendsWithStatus = React.useMemo(() => {
    const now = Date.now();
    const list = (cloudFriends || []).map((friend) => {
      const lastSeen = friend.friend_last_seen ? new Date(friend.friend_last_seen).getTime() : 0;
      const isOnline = !!lastSeen && now - lastSeen <= ONLINE_THRESHOLD_MS;
      return { ...friend, isOnline, lastSeen };
    });
    return list.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      return (a.friend_name || '').localeCompare(b.friend_name || '');
    });
  }, [cloudFriends]);
  const incomingInviteByHostId = React.useMemo(() => {
    if (!session) return new Map();
    const uid = session.user?.id;
    const map = new Map();
    (gameInvites || []).forEach((inv) => {
      if (inv && inv.status === 'pending' && inv.opponentId === uid) {
        map.set(inv.hostId, inv);
      }
    });
    return map;
  }, [gameInvites, session]);
  const pendingGameInvites = React.useMemo(() => {
    if (!cloudFriendsWithStatus || cloudFriendsWithStatus.length === 0) return [];
    const list = [];
    cloudFriendsWithStatus.forEach((friend) => {
      const inv = incomingInviteByHostId.get(friend.friend_id);
      if (inv) list.push({ ...friend, __invite: inv });
    });
    return list;
  }, [cloudFriendsWithStatus, incomingInviteByHostId]);
  const inviteCount = requests.length + pendingGameInvites.length;
  const hasFriendRequests = requests.length > 0;
  const hasGameInvites = pendingGameInvites.length > 0;
  const noRequests = !hasFriendRequests && !hasGameInvites;
  const playInviteBlink = React.useRef(new Animated.Value(1)).current;
  const copyResetRef = React.useRef(null);
  const getCloudItemLayout = React.useCallback((_, index) => ({ length: 86, offset: 86 * index, index }), []);
  const getOfflineItemLayout = React.useCallback((_, index) => ({ length: 86, offset: 86 * index, index }), []);
  const getRequestItemLayout = React.useCallback((_, index) => ({ length: 80, offset: 80 * index, index }), []);
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
    if (!open || !cloud || !session) return;
    let cancelled = false;
    let unsubscribe = null;
    (async () => {
      try {
        const list = await fetchOpenGameInvites();
        if (!cancelled) setGameInvites(list);
      } catch {}
      try {
        const off = subscribeToGameInvites(session.user.id, (evt) => {
          if (!evt) return;
          const item = evt.new || evt.old;
          if (!item) return;
          setGameInvites((prev) => {
            const next = Array.isArray(prev) ? [...prev] : [];
            const idx = next.findIndex((x) => x.id === item.id);
            if (evt.eventType === 'DELETE') {
              if (idx >= 0) next.splice(idx, 1);
            } else if (idx >= 0) {
              next[idx] = item;
            } else {
              next.unshift(item);
            }
            return next;
          });
        });
        unsubscribe = off;
      } catch {}
    })();
    return () => {
      cancelled = true;
      try { if (typeof unsubscribe === 'function') unsubscribe(); } catch {}
    };
  }, [open, cloud, session]);

  const handleAcceptGameInvite = React.useCallback(async (friend) => {
    if (!friend || !friend.friend_id) return;
    const inv = incomingInviteByHostId.get(friend.friend_id);
    if (!inv) return;
    try {
      const updated = await acceptGameInvite(inv.id);
      setGameInvites((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      onAcceptTicTacToeInvite?.(friend);
    } catch (error) {
      if (__DEV__) console.warn('acceptGameInvite failed', error);
    }
  }, [incomingInviteByHostId, onAcceptTicTacToeInvite]);

  const handleDeclineGameInvite = React.useCallback(async (friend) => {
    if (!friend || !friend.friend_id) return;
    const inv = incomingInviteByHostId.get(friend.friend_id);
    if (!inv) return;
    try {
      const updated = await declineGameInvite(inv.id);
      setGameInvites((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      onDeclineTicTacToeInvite?.(friend);
    } catch (error) {
      if (__DEV__) console.warn('declineGameInvite failed', error);
    }
  }, [incomingInviteByHostId, onDeclineTicTacToeInvite]);
  React.useEffect(() => {
    if (!hasGameInvites) {
      playInviteBlink.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(playInviteBlink, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(playInviteBlink, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
      playInviteBlink.setValue(1);
    };
  }, [hasGameInvites, playInviteBlink]);
  const closeAddModal = React.useCallback(() => {
    setAddModalOpen(false);
    setFriendRequestError(null);
    setCodeInput('');
    setNameInput('');
  }, []);

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
        closeAddModal();
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
      setFriendRequestError(null);
      setFriendRequestMessage('Freund hinzugefuegt.');
      closeAddModal();
    }
  };
  React.useEffect(() => {
    return () => {
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
      }
    };
  }, []);
  const showFriendCodeCard = !cloud || !session || activeTab !== 'invites';
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
      setActiveTab('friends');
      closeAddModal();
    }
  }, [closeAddModal, open, resetDetailState]);
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
      closeAddModal();
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
      const statusLabel = selectedFriend.isOnline ? 'Online' : 'Offline';
      selectedFriendMeta = `Lv. ${level} - ${species ? species.name : 'Unbekanntes Tier'} - ${statusLabel}`;
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
      {cloud && session ? (
        <>
          <View style={styles.tabRow}>
              <Pressable
                style={[styles.tabButton, activeTab === 'friends' && styles.tabButtonActive]}
                onPress={() => setActiveTab('friends')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'friends' && styles.tabButtonTextActive]}>
                  Freunde
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tabButton, activeTab === 'invites' && styles.tabButtonActive]}
                onPress={() => setActiveTab('invites')}
              >
                <View style={styles.tabButtonRow}>
                  <Text style={[styles.tabButtonText, activeTab === 'invites' && styles.tabButtonTextActive]}>
                    Anfragen
                  </Text>
                  {inviteCount > 0 ? (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{inviteCount}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            </View>

            {activeTab === 'friends' ? (
              <FlatList
                contentContainerStyle={styles.friendList}
                data={cloudFriendsWithStatus}
                keyExtractor={(item) => String(item.friend_id)}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={7}
                removeClippedSubviews
                getItemLayout={getCloudItemLayout}
                ListHeaderComponent={<Text style={styles.sectionTitle}>Deine Freunde</Text>}
                ListEmptyComponent={<Text style={styles.hint}>Noch keine Freunde angenommen.</Text>}
                renderItem={({ item: f }) => (
                  <CloudFriendRow
                    friend={f}
                    formatTimestamp={formatTimestamp}
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
                        isOnline: f.isOnline,
                      })
                    }
                  />
                )}
                ListFooterComponent={
                  showFriendCodeCard || loading
                    ? (
                        <>
                          {showFriendCodeCard ? (
                            <>
                              <View style={styles.sectionSpacer} />
                              <FriendCodeCard
                                formattedCode={formattedFriendCode}
                                onCopy={() => handleCopy(activeFriendCode)}
                                copyDisabled={copyDisabled}
                                copyFeedback={copyFeedback}
                                onOpenAdd={() => {
                                  setFriendRequestError(null);
                                  setFriendRequestMessage(null);
                                  setAddModalOpen(true);
                                }}
                                friendRequestMessage={friendRequestMessage}
                              />
                            </>
                          ) : null}
                          {loading ? (
                            <ActivityIndicator style={{ marginTop: showFriendCodeCard ? 8 : 24 }} />
                          ) : null}
                        </>
                      )
                    : null
                }
              />
            ) : (
              <>
                <RequestsList
                  pendingGameInvites={pendingGameInvites}
                  requests={requests}
                  onAcceptGameInvite={handleAcceptGameInvite}
                  onDeclineGameInvite={handleDeclineGameInvite}
                  onAcceptRequest={handleAccept}
                  onDeclineRequest={handleDecline}
                  playInviteBlink={playInviteBlink}
                />
                {showFriendCodeCard ? (
                  <>
                    <View style={styles.sectionSpacer} />
                    <FriendCodeCard
                      formattedCode={formattedFriendCode}
                      onCopy={() => handleCopy(activeFriendCode)}
                      copyDisabled={copyDisabled}
                      copyFeedback={copyFeedback}
                      onOpenAdd={() => {
                        setFriendRequestError(null);
                        setFriendRequestMessage(null);
                        setAddModalOpen(true);
                      }}
                      friendRequestMessage={friendRequestMessage}
                    />
                  </>
                ) : null}
                {loading ? (
                  <ActivityIndicator style={{ marginTop: showFriendCodeCard ? 8 : 24 }} />
                ) : null}
              </>
            )}
        </>
      ) : (
        <FlatList
          contentContainerStyle={styles.friendList}
          data={friends}
          keyExtractor={(item) => String(item.id)}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          getItemLayout={getOfflineItemLayout}
          ListHeaderComponent={<Text style={styles.sectionTitle}>Deine Freunde</Text>}
          ListEmptyComponent={<Text style={styles.hint}>Noch keine Freunde. Fuege jemanden per Code hinzu.</Text>}
          renderItem={({ item: f }) => (
            <OfflineFriendRow
              item={f}
              onPress={() =>
                openFriendDetail({
                  kind: 'offline',
                  localId: f.id,
                  displayName: f.name || 'Unbenannt',
                  code: formatCode(f.code),
                  isOnline: false,
                })
              }
            />
          )}
          ListFooterComponent={
            showFriendCodeCard || loading
              ? (
                  <>
                    {showFriendCodeCard ? (
                      <>
                        <View style={styles.sectionSpacer} />
                        <FriendCodeCard
                          formattedCode={formattedFriendCode}
                          onCopy={() => handleCopy(activeFriendCode)}
                          copyDisabled={copyDisabled}
                          copyFeedback={copyFeedback}
                          onOpenAdd={() => {
                            setFriendRequestError(null);
                            setFriendRequestMessage(null);
                            setAddModalOpen(true);
                          }}
                          friendRequestMessage={friendRequestMessage}
                        />
                      </>
                    ) : null}
                    {loading ? (
                      <ActivityIndicator style={{ marginTop: showFriendCodeCard ? 8 : 24 }} />
                    ) : null}
                  </>
                )
              : null
          }
        />
      )}
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
              {selectedFriend?.kind === 'cloud' ? (
                <>
                  {selectedFriendGameStatus === 'pending-outgoing' ? (
                    <Pressable
                      style={styles.gameInviteBtn}
                      onPress={() => onCancelTicTacToeInvite?.(selectedFriend)}
                    >
                      <Text style={styles.gameInviteBtnText}>Anfrage abbrechen</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[
                        styles.gameInviteBtn,
                        ticTacToeInviteState.disabled && styles.gameInviteBtnDisabled,
                      ]}
                      onPress={() => {
                        if (ticTacToeInviteState.disabled) return;
                        onInviteTicTacToe?.(selectedFriend);
                      }}
                      disabled={ticTacToeInviteState.disabled}
                    >
                      <Text style={styles.gameInviteBtnText}>{ticTacToeInviteState.label}</Text>
                    </Pressable>
                  )}
                  {ticTacToeInviteState.hint ? (
                    <Text style={styles.detailHint}>{ticTacToeInviteState.hint}</Text>
                  ) : null}
                </>
              ) : null}
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
      {addModalOpen && (
        <View style={styles.addOverlay} pointerEvents="auto">
          <View style={styles.addCard}>
            <View style={styles.addHeader}>
              <Text style={styles.addTitle}>Freund hinzufuegen</Text>
              <Pressable style={styles.addCloseBtn} onPress={closeAddModal}>
                <Text style={styles.addCloseText}>{String.fromCodePoint(0x2715)}</Text>
              </Pressable>
            </View>
            <Text style={styles.label}>Code</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. ABC123"
              value={codeInput}
              autoCapitalize="characters"
              onChangeText={setCodeInput}
            />
            {(!cloud || !session) && (
              <>
                <Text style={styles.label}>Name (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Freund"
                  value={nameInput}
                  onChangeText={setNameInput}
                />
              </>
            )}
            {friendRequestError ? <Text style={styles.statusError}>{friendRequestError}</Text> : null}
            <View style={styles.addActions}>
              <Pressable style={styles.addPrimaryBtn} onPress={handleAdd}>
                <Text style={styles.addPrimaryText}>
                  {cloud && session ? 'Anfrage senden' : 'Hinzufuegen'}
                </Text>
              </Pressable>
              <Pressable style={styles.addSecondaryBtn} onPress={closeAddModal}>
                <Text style={styles.addSecondaryText}>Abbrechen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      {!addModalOpen && friendRequestError ? (
        <Text style={[styles.statusError, { position: 'absolute', bottom: 12, left: 12 }]}>{friendRequestError}</Text>
      ) : null}
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
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 8, color: '#111827' },
  tabRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  tabButton: { flex: 1, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5F5', backgroundColor: '#F8FAFC', paddingVertical: 10, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#111827', borderColor: '#111827' },
  tabButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabButtonText: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  tabButtonTextActive: { color: '#FFFFFF' },
  tabBadge: { minWidth: 20, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: '#F472B6', alignItems: 'center' },
  tabBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  
  label: { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  code: { fontSize: 22, fontWeight: '800', letterSpacing: 2, color: '#111827' },
  hint: { color: '#6B7280', fontSize: 12 },
  friendList: { gap: 10 },
  statusSuccess: { marginTop: 6, color: '#10B981', fontSize: 12, fontWeight: '600' },
  statusError: { marginTop: 6, color: '#DC2626', fontSize: 12, fontWeight: '600' },
  refreshBtnDisabled: { opacity: 0.5 },
  sectionSpacer: { height: 16 },
  addFriendBtn: { marginTop: 6, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  addFriendBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
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
  gameInviteBtn: { backgroundColor: '#0EA5E9', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  gameInviteBtnDisabled: { opacity: 0.5 },
  gameInviteBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  detailHint: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  visitBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  visitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  detailRemoveBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#DC2626' },
  detailRemoveText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  removeConfirmBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#DC2626' },
  removeConfirmText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  addOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(17,24,39,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, zIndex: 510 },
  addCard: { width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, gap: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
  addHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  addCloseBtn: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  addCloseText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  addActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  addPrimaryBtn: { flex: 1, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  addPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  addSecondaryBtn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5F5', paddingVertical: 10, alignItems: 'center', backgroundColor: '#F8FAFC' },
  addSecondaryText: { color: '#1F2937', fontSize: 14, fontWeight: '700' },
});
