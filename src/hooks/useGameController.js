import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Animated, Easing, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { clamp } from '../lib/utils';
import {
  STORAGE_KEY,
  DECAY_AWAKE,
  DECAY_SLEEP,
  SOUND_ENABLED,
  XP_FEED,
  XP_WASH,
  COIN_WASH,
  FEED_COST,
} from '../lib/constants';
import { getLevelInfo } from '../lib/progression';
import { handleTap } from '../domain/interactions';
import { getSpecies } from '../domain/species';
import { loadSettings, saveSettings } from '../state/settings';
import { getItemById } from '../data/shopItems';
import { addToInventory } from '../state/economy';
import { EMPTY_EQUIPPED, cloneEquipped, EQUIP_SLOTS } from '../lib/outfit';
import { fetchCloudProgress, upsertCloudProgress } from '../state/cloudProgress';
import {
  startFriendVisit,
  endFriendVisit,
  fetchActiveVisitForHost,
  subscribeToFriendVisits,
  endFriendVisitAsHost,
  fetchOpenGameInvites,
  sendGameInvite,
  acceptGameInvite,
  declineGameInvite,
  cancelGameInvite,
  submitTicTacToeMove,
  subscribeToGameInvites,
  dismissFinishedGame,
  touchLastSeen,
} from '../state/cloudFriends';
import { supabase } from '../lib/supabaseClient';

export default function useGameController() {
  const [hunger, setHunger] = useState(80);
  const [fun, setFun] = useState(80);
  const [clean, setClean] = useState(80);
  const [energy, setEnergy] = useState(80);
  const [isSleeping, setIsSleeping] = useState(false);
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [inventory, setInventory] = useState({});
  const [equipped, setEquipped] = useState(() => cloneEquipped());
  const [shopOpen, setShopOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [gamesMenuOpen, setGamesMenuOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [visitingFriend, setVisitingFriend] = useState(null);
  const [incomingVisitor, setIncomingVisitor] = useState(null);
  const [ticTacToeOutgoing, setTicTacToeOutgoing] = useState(null);
  const [ticTacToeIncoming, setTicTacToeIncoming] = useState(null);
  const [ticTacToeMatch, setTicTacToeMatch] = useState(null);
  const [petType, setPetType] = useState(null);
  const [petSelectOpen, setPetSelectOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const saveTimerRef = useRef(null);
  const [isWashing, setIsWashing] = useState(false);
  const [petAreaLayout, setPetAreaLayout] = useState({ width: 0, height: 0 });
  const [washBubbles, setWashBubbles] = useState([]);
  const [foodFlyers, setFoodFlyers] = useState([]);
  const lastWashPosRef = useRef(null);
  const washAwardedRef = useRef(false);
  const petAreaRef = useRef(null);
  const petAreaWindowRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const mainRef = useRef(null);
  const mainWindowRef = useRef({ x: 0, y: 0 });
  const [soapDrag, setSoapDrag] = useState({ active: false, x: 0, y: 0 });
  const [emotion, setEmotion] = useState(null);

  const petScale = useRef(new Animated.Value(1)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState('');

  const [cloudSession, setCloudSession] = useState(null);
  const userId = cloudSession?.user?.id ?? null;
  const lastSeenTimerRef = useRef(null);

  const cloudSyncReadyRef = useRef(false);
  const skipCloudPushRef = useRef(false);
  const lastLocalSaveRef = useRef(Date.now());
  const latestSnapshotRef = useRef(null);
  const latestStateRef = useRef({
    hunger: 80,
    fun: 80,
    clean: 80,
    energy: 80,
    isSleeping: false,
    xp: 0,
    coins: 0,
    inventory: {},
    petType: null,
    equipped: cloneEquipped(),
  });
  const dismissedGameIdsRef = useRef(new Set());

  useEffect(() => {
    latestStateRef.current = {
      hunger,
      fun,
      clean,
      energy,
      isSleeping,
      xp,
      coins,
      inventory,
      petType,
      equipped,
    };
  }, [hunger, fun, clean, energy, isSleeping, xp, coins, inventory, petType, equipped]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setCloudSession(data?.session ?? null);
      })
      .catch(() => {});
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setCloudSession(session);
      if (!session) {
        cloudSyncReadyRef.current = false;
        latestSnapshotRef.current = null;
      }
    });
    return () => {
      active = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!emotion) return;
    const t = setTimeout(() => setEmotion(null), 900);
    return () => clearTimeout(t);
  }, [emotion]);

  const speak = useCallback(
    (text) => {
      try {
        if (!soundOn) return;
        Speech.stop();
        Speech.speak(text, { language: 'de-DE', pitch: 1.0, rate: 1.0 });
      } catch {}
    },
    [soundOn],
  );

  const touchPresence = useCallback(() => {
    if (!userId) return;
    touchLastSeen().catch(() => {});
  }, [userId]);

  const applyGameInvites = useCallback(
    (invites) => {
      if (!userId) {
        setTicTacToeOutgoing(null);
        setTicTacToeIncoming(null);
        setTicTacToeMatch(null);
        return;
      }
      if (!Array.isArray(invites)) return;
      let outgoing = null;
      let incoming = null;
      let match = null;
      for (const invite of invites) {
        if (!invite || invite.gameType !== 'tictactoe') continue;
        if (invite.status === 'pending') {
          if (invite.hostId === userId) {
            if (!outgoing || (invite.createdAt || '') > (outgoing.createdAt || '')) {
              outgoing = invite;
            }
          } else if (invite.opponentId === userId) {
            if (!incoming || (invite.createdAt || '') > (incoming.createdAt || '')) {
              incoming = invite;
            }
          }
        } else if (invite.status === 'active' || invite.status === 'finished') {
          if (!match || (invite.updatedAt || '') >= (match?.updatedAt || '')) {
            match = invite;
          }
        }
      }
      if (match && match.status === 'finished' && dismissedGameIdsRef.current.has(match.id)) {
        match = null;
      }
      setTicTacToeOutgoing(outgoing);
      setTicTacToeIncoming(incoming);
      setTicTacToeMatch(match);
    },
    [userId],
  );

  const applyDecaySnapshot = useCallback((state, seconds, sleeping) => {
    const R = sleeping ? DECAY_SLEEP : DECAY_AWAKE;
    const minutes = Math.max(0, Number(seconds || 0)) / 60;
    return {
      hunger: clamp(state.hunger - R.hunger * minutes),
      fun: clamp(state.fun - R.fun * minutes),
      clean: clamp(state.clean - R.clean * minutes),
      energy: clamp(state.energy - R.energy * minutes),
    };
  }, []);

  const normalizeEquipped = useCallback((raw = {}, inventoryData = {}) => {
    const next = cloneEquipped();
    for (const slot of Object.keys(next)) {
      const candidate = typeof raw[slot] === 'string' ? raw[slot] : null;
      if (!candidate) {
        next[slot] = null;
        continue;
      }
      const item = getItemById(candidate);
      const owned = item ? Number((inventoryData || {})[item.id] || 0) : 0;
      next[slot] = item && item.slot === slot && owned > 0 ? item.id : null;
    }
    return next;
  }, []);

  const normalizeSnapshot = useCallback(
    (snapshot) => {
      const now = Date.now();
      const savedAt = typeof snapshot?.savedAt === 'number' ? snapshot.savedAt : now;
      const inventoryData =
        snapshot?.inventory && typeof snapshot.inventory === 'object' ? snapshot.inventory : {};
      const equippedData =
        snapshot?.equipped && typeof snapshot.equipped === 'object'
          ? normalizeEquipped(snapshot.equipped, inventoryData)
          : normalizeEquipped({}, inventoryData);

      const baseState = {
        hunger: snapshot?.hunger ?? 80,
        fun: snapshot?.fun ?? 80,
        clean: snapshot?.clean ?? 80,
        energy: snapshot?.energy ?? 80,
      };

      const decayed = applyDecaySnapshot(
        baseState,
        Math.max(0, Math.floor((now - savedAt) / 1000)),
        !!snapshot?.isSleeping,
      );

      return {
        savedAt,
        hunger: decayed.hunger,
        fun: decayed.fun,
        clean: decayed.clean,
        energy: decayed.energy,
        isSleeping: !!snapshot?.isSleeping,
        xp: snapshot?.xp ?? 0,
        coins: snapshot?.coins ?? 0,
        inventory: inventoryData,
        petType: typeof snapshot?.petType === 'string' && snapshot.petType ? snapshot.petType : null,
        equipped: equippedData,
      };
    },
    [applyDecaySnapshot, normalizeEquipped],
  );

  const applySnapshot = useCallback(
    (snapshot, { persistToStorage = false } = {}) => {
      const normalized = normalizeSnapshot(snapshot);

      setHunger(normalized.hunger);
      setFun(normalized.fun);
      setClean(normalized.clean);
      setEnergy(normalized.energy);
      setIsSleeping(normalized.isSleeping);
      setXp(normalized.xp);
      setCoins(normalized.coins);
      setInventory(normalized.inventory);
      setEquipped(normalized.equipped);

      if (normalized.petType) {
        setPetType(normalized.petType);
      } else {
        setPetType(null);
        setPetSelectOpen(true);
      }

      lastLocalSaveRef.current = normalized.savedAt;
      latestSnapshotRef.current = normalized;

      if (persistToStorage) {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)).catch(() => {});
      }

      return normalized;
    },
    [normalizeSnapshot],
  );

  const applyCloudSnapshot = useCallback(
    (snapshot) => {
      if (!snapshot) return;
      applySnapshot(snapshot, { persistToStorage: true });
    },
    [applySnapshot],
  );

  const avg = useMemo(() => (hunger + fun + clean + energy) / 4, [hunger, fun, clean, energy]);
  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);
  const level = levelInfo.level;
  const mood = useMemo(() => {
    if (avg >= 80) return ':D';
    if (avg >= 60) return ':)';
    if (avg >= 40) return ':/';
    if (avg >= 20) return ':(';
    return 'X(';
  }, [avg]);

  const tickRef = useRef(null);
  const coinTickRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const prevLevelRef = useRef(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const snap = JSON.parse(raw);
          applySnapshot(snap);
        } else {
          const now = Date.now();
          lastLocalSaveRef.current = now;
          latestSnapshotRef.current = {
            hunger: 80,
            fun: 80,
            clean: 80,
            energy: 80,
            isSleeping: false,
            xp: 0,
            coins: 0,
            inventory: {},
            petType: null,
            equipped: cloneEquipped(),
            savedAt: now,
          };
        }
      } catch {
        // ignore load errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySnapshot]);

  useEffect(() => {
    if (!cloudSession || !supabase) return;
    let cancelled = false;

    const syncProgress = async () => {
      try {
        const remote = await fetchCloudProgress();
        const stateRef = latestStateRef.current || {};
        const localBase = latestSnapshotRef.current || {
          hunger: stateRef.hunger ?? 80,
          fun: stateRef.fun ?? 80,
          clean: stateRef.clean ?? 80,
          energy: stateRef.energy ?? 80,
          isSleeping: stateRef.isSleeping ?? false,
          xp: stateRef.xp ?? 0,
          coins: stateRef.coins ?? 0,
          inventory: stateRef.inventory || {},
          petType: stateRef.petType ?? null,
          equipped: stateRef.equipped || {},
          savedAt: lastLocalSaveRef.current ?? Date.now(),
        };

        const localSaved = localBase.savedAt ?? lastLocalSaveRef.current ?? Date.now();

        if (!remote) {
          await upsertCloudProgress(localBase).catch(() => {});
          if (!cancelled) {
            cloudSyncReadyRef.current = true;
          }
          return;
        }

        const remoteSnapshot = {
          hunger: remote.hunger ?? 80,
          fun: remote.fun ?? 80,
          clean: remote.clean ?? 80,
          energy: remote.energy ?? 80,
          xp: remote.xp ?? 0,
          coins: remote.coins ?? 0,
          inventory: remote.inventory ?? {},
          petType: remote.pet_type ?? null,
          equipped: remote.equipped ?? {},
          isSleeping: !!remote.is_sleeping,
          savedAt: remote.saved_at ? new Date(remote.saved_at).getTime() : Date.now(),
        };

        const remoteSaved = remoteSnapshot.savedAt ?? 0;

        if (!cancelled) {
          if (remoteSaved > (localSaved ?? 0) + 500) {
            skipCloudPushRef.current = true;
            cloudSyncReadyRef.current = false;
            applyCloudSnapshot(remoteSnapshot);
            setTimeout(() => {
              skipCloudPushRef.current = false;
              cloudSyncReadyRef.current = true;
            }, 0);
          } else if (remoteSaved < (localSaved ?? 0) - 500) {
            await upsertCloudProgress(localBase).catch(() => {});
            cloudSyncReadyRef.current = true;
          } else {
            cloudSyncReadyRef.current = true;
          }
        }
      } catch (error) {
        if (!cancelled) {
          cloudSyncReadyRef.current = true;
        }
      }
    };

    syncProgress();
    return () => {
      cancelled = true;
    };
  }, [applyCloudSnapshot, cloudSession]);

  useEffect(() => {
    const R = isSleeping ? DECAY_SLEEP : DECAY_AWAKE;
    const minutesPerTick = 1 / 60;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setHunger((v) => clamp(v - R.hunger * minutesPerTick));
      setFun((v) => clamp(v - R.fun * minutesPerTick));
      setClean((v) => clamp(v - R.clean * minutesPerTick));
      setEnergy((v) => clamp(v - R.energy * minutesPerTick));
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isSleeping]);

  useEffect(() => {
    if (coinTickRef.current) clearInterval(coinTickRef.current);
    coinTickRef.current = setInterval(() => {
      if (appStateRef.current !== 'active') return;
      setCoins((value) => value + 1);
    }, 30000);

    return () => {
      if (coinTickRef.current) clearInterval(coinTickRef.current);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await loadSettings();
        setSoundOn(!!s.sound);
        setHapticsOn(!!s.haptics);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    setEquipped((prev) => {
      let mutated = false;
      const next = { ...prev };
      for (const slot of Object.keys(next)) {
        const currentId = next[slot];
        if (currentId && Number((inventory || {})[currentId] || 0) <= 0) {
          next[slot] = null;
          mutated = true;
        }
      }
      return mutated ? next : prev;
    });
  }, [inventory]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const savedAt = Date.now();
      const payload = {
        hunger,
        fun,
        clean,
        energy,
        isSleeping,
        xp,
        coins,
        inventory,
        petType,
        equipped,
        savedAt,
      };
      lastLocalSaveRef.current = savedAt;
      latestSnapshotRef.current = payload;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
      if (cloudSession && cloudSyncReadyRef.current && !skipCloudPushRef.current) {
        upsertCloudProgress(payload).catch(() => {});
      }
    }, 400);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    cloudSession,
    coins,
    clean,
    energy,
    equipped,
    fun,
    hunger,
    inventory,
    isSleeping,
    petType,
    xp,
  ]);

  useEffect(() => {
    const prev = prevLevelRef.current;
    if (level > prev) {
      prevLevelRef.current = level;
      showToast(`Level up! Level ${level}`);
      if (hapticsOn) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      speak(`Level ${level}`);
    }
  }, [hapticsOn, level, speak]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if ((prev === 'background' || prev === 'inactive') && nextState === 'active') {
        touchPresence();
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          const snap = JSON.parse(raw);
          const savedAt = typeof snap.savedAt === 'number' ? snap.savedAt : Date.now();
          const seconds = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
          const decayed = applyDecaySnapshot(
            { hunger, fun, clean, energy },
            seconds,
            isSleeping,
          );
          setHunger(decayed.hunger);
          setFun(decayed.fun);
          setClean(decayed.clean);
          setEnergy(decayed.energy);
        } catch {}
      } else if (nextState === 'background' || nextState === 'inactive') {
        touchPresence();
      }
    });
    return () => sub.remove();
  }, [applyDecaySnapshot, clean, energy, fun, hunger, isSleeping, touchPresence]);

  const canAct = !isSleeping && !isWashing;

  const bump = useCallback(() => {
    Animated.sequence([
      Animated.timing(petScale, {
        toValue: 1.12,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(petScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [petScale]);

  const showToast = useCallback(
    (text) => {
      setToastMessage(text);
      toastOpacity.stopAnimation();
      toastOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(toastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 600,
          delay: 500,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [toastOpacity],
  );

  const nextFrame = useCallback((cb) => {
    const raf = global.requestAnimationFrame || ((f) => setTimeout(f, 0));
    raf(cb);
  }, []);

  const handleVisitFriend = useCallback(
    async (payload) => {
      const friend = payload?.friend ?? payload;
      if (!friend) return;
      if (friend.kind !== 'cloud' || !friend.friendId) {
        showToast('Besuche sind nur bei Cloud-Freunden verfuegbar.');
        return;
      }
      try {
        const visitor = payload?.visitor || {};
        const snapshot = latestStateRef.current || {};
        const visitorData = {
          name: visitor.name || 'Du',
          petType: visitor.petType || snapshot.petType || petType || 'seestern',
          equipped: visitor.equipped || snapshot.equipped || equipped,
          xp: typeof visitor.xp === 'number' ? visitor.xp : snapshot.xp ?? xp,
        };
        await startFriendVisit(friend.friendId, visitorData);
        setVisitingFriend({
          kind: 'cloud',
          hostId: friend.friendId,
          id: friend.friendId,
          name: friend.displayName || friend.name || 'Freund',
          code: friend.code,
          petType: friend.petType || 'seestern',
          equipped: friend.equipped || {},
          xp: friend.xp || 0,
        });
        setFriendsOpen(false);
        showToast(`Du besuchst ${friend.displayName || friend.name || 'deinen Freund'}!`);
      } catch (error) {
        console.warn('startFriendVisit failed', error);
        showToast('Besuch fehlgeschlagen.');
      }
    },
    [equipped, petType, showToast, xp],
  );

  const handleFriendRemoved = useCallback(
    (friend) => {
      if (friend?.kind === 'cloud') {
        endFriendVisit(friend.friendId).catch(() => {});
        if (visitingFriend?.hostId === friend.friendId || visitingFriend?.id === friend.friendId) {
          setVisitingFriend(null);
        }
        if (incomingVisitor?.visitorId === friend.friendId) {
          endFriendVisitAsHost(cloudSession?.user?.id).catch(() => {});
          setIncomingVisitor(null);
        }
      }
      showToast('Freund entfernt.');
    },
    [cloudSession?.user?.id, incomingVisitor, showToast, visitingFriend],
  );

  const handleEndVisit = useCallback(async () => {
    if (visitingFriend?.hostId) {
      try {
        await endFriendVisit(visitingFriend.hostId);
      } catch (error) {
        console.warn('endFriendVisit failed', error);
      }
    }
    setVisitingFriend(null);
    showToast('Besuch beendet.');
  }, [showToast, visitingFriend]);

  const mapVisitRow = useCallback((row) => {
    if (!row) return null;
    return {
      hostId: row.host_id,
      visitorId: row.visitor_id,
      name: row.visitor_name || 'Freund',
      petType: row.visitor_pet_type || null,
      equipped: row.visitor_equipped || {},
      startedAt: row.visitor_started_at || row.updated_at,
    };
  }, []);

  useEffect(() => {
    if (!cloudSession?.user?.id) {
      setIncomingVisitor(null);
      return;
    }
    let active = true;
    const hostId = cloudSession.user.id;
    const sync = async () => {
      try {
        const row = await fetchActiveVisitForHost(hostId);
        if (active) {
          setIncomingVisitor(mapVisitRow(row));
        }
      } catch (error) {
        console.warn('fetchActiveVisitForHost failed', error);
      }
    };
    sync();
    let channel = null;
    try {
      channel = subscribeToFriendVisits(hostId, (payload) => {
        if (!active) return;
        if (payload.eventType === 'DELETE') {
          setIncomingVisitor(null);
        } else {
          setIncomingVisitor(mapVisitRow(payload.new));
        }
      });
    } catch (error) {
      console.warn('subscribeToFriendVisits failed', error);
    }
    return () => {
      active = false;
      if (channel) {
        if (typeof supabase.removeChannel === 'function') {
          supabase.removeChannel(channel);
        } else if (typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        }
      }
    };
  }, [cloudSession?.user?.id, mapVisitRow]);

  const handleDismissIncomingVisit = useCallback(async () => {
    try {
      const hostId = cloudSession?.user?.id;
      if (hostId) {
        await endFriendVisitAsHost(hostId);
      }
    } catch (error) {
      console.warn('endFriendVisitAsHost failed', error);
    } finally {
      setIncomingVisitor(null);
      showToast('Besuch beendet.');
    }
  }, [cloudSession?.user?.id, showToast]);

  useEffect(() => {
    if (!userId) {
      setTicTacToeOutgoing(null);
      setTicTacToeIncoming(null);
      setTicTacToeMatch(null);
      dismissedGameIdsRef.current.clear();
      return;
    }
    let cancelled = false;
    const syncInvites = async () => {
      try {
        const invites = await fetchOpenGameInvites();
        if (cancelled) return;
        applyGameInvites(invites);
      } catch (error) {
        if (__DEV__) console.warn('fetchOpenGameInvites failed', error);
      }
    };
    syncInvites();
    const unsubscribe = subscribeToGameInvites(userId, (payload) => {
      const eventType = payload?.eventType;
      const next = payload?.new;
      const prev = payload?.old;
      if (eventType === 'UPDATE' && next) {
        if (next.status === 'declined' && next.hostId === userId) {
          showToast('Spielanfrage abgelehnt.');
        } else if (next.status === 'cancelled') {
          if (prev?.status === 'active') {
            showToast('Spiel abgebrochen.');
          } else if (next.hostId === userId) {
            showToast('Spielanfrage abgebrochen.');
          } else if (next.opponentId === userId) {
            showToast('Spielanfrage zurueckgezogen.');
          }
        } else if (next.status === 'finished') {
          dismissedGameIdsRef.current.delete(next.id);
          if (next.winner) {
            showToast(next.winner === userId ? 'Du hast gewonnen!' : 'Spiel beendet.');
          } else {
            showToast('Unentschieden!');
          }
        }
      }
      if (eventType === 'DELETE' && prev) {
        dismissedGameIdsRef.current.delete(prev.id);
      }
      syncInvites();
    });
    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [applyGameInvites, showToast, userId]);

  useEffect(() => {
    if (!userId) {
      if (lastSeenTimerRef.current) {
        clearInterval(lastSeenTimerRef.current);
        lastSeenTimerRef.current = null;
      }
      return;
    }
    touchPresence();
    const interval = setInterval(() => {
      if (appStateRef.current === 'active') {
        touchPresence();
      }
    }, 45000);
    lastSeenTimerRef.current = interval;
    return () => {
      clearInterval(interval);
      if (lastSeenTimerRef.current === interval) {
        lastSeenTimerRef.current = null;
      }
    };
  }, [touchPresence, userId]);

  const visitingFriendLevel = useMemo(
    () => (visitingFriend ? getLevelInfo(visitingFriend.xp || 0).level : null),
    [visitingFriend],
  );
  const visitingFriendSpecies = useMemo(
    () => (visitingFriend?.petType ? getSpecies(visitingFriend.petType).name : null),
    [visitingFriend],
  );
  const incomingVisitorSpecies = useMemo(
    () => (incomingVisitor?.petType ? getSpecies(incomingVisitor.petType).name : null),
    [incomingVisitor],
  );

  const handleInviteTicTacToe = useCallback(
    async (friend) => {
      if (!friend || !friend.friendId) {
        showToast('Freund kann nicht eingeladen werden.');
        return;
      }
      try {
        const invite = await sendGameInvite(friend.friendId, {
          opponentName:
            friend.displayName || friend.name || friend.friend_name || friend.friendName || null,
        });
        dismissedGameIdsRef.current.delete(invite.id);
        setTicTacToeOutgoing(invite);
        showToast('Spielanfrage gesendet.');
      } catch (error) {
        if (__DEV__) console.warn('sendGameInvite failed', error);
        showToast('Spielanfrage fehlgeschlagen.');
      }
    },
    [showToast],
  );

  const handleCancelTicTacToeInvite = useCallback(async () => {
    if (!ticTacToeOutgoing) return;
    try {
      await cancelGameInvite(ticTacToeOutgoing.id);
      setTicTacToeOutgoing(null);
      showToast('Spielanfrage abgebrochen.');
    } catch (error) {
      if (__DEV__) console.warn('cancelGameInvite failed', error);
      showToast('Abbruch fehlgeschlagen.');
    }
  }, [showToast, ticTacToeOutgoing]);

  const handleAcceptTicTacToeInvite = useCallback(async () => {
    if (!ticTacToeIncoming) return;
    try {
      const invite = await acceptGameInvite(ticTacToeIncoming.id);
      dismissedGameIdsRef.current.delete(invite.id);
      setTicTacToeIncoming(null);
      setTicTacToeMatch(invite);
      showToast('Spiel gestartet.');
    } catch (error) {
      if (__DEV__) console.warn('acceptGameInvite failed', error);
      showToast('Annahme fehlgeschlagen.');
    }
  }, [showToast, ticTacToeIncoming]);

  const handleDeclineTicTacToeInvite = useCallback(async () => {
    if (!ticTacToeIncoming) return;
    try {
      await declineGameInvite(ticTacToeIncoming.id);
      setTicTacToeIncoming(null);
      showToast('Einladung abgelehnt.');
    } catch (error) {
      if (__DEV__) console.warn('declineGameInvite failed', error);
      showToast('Ablehnen fehlgeschlagen.');
    }
  }, [showToast, ticTacToeIncoming]);

  const handleSubmitTicTacToeMove = useCallback(
    async (index) => {
      if (!ticTacToeMatch) return;
      try {
        const updated = await submitTicTacToeMove(ticTacToeMatch, index);
        setTicTacToeMatch(updated);
        if (updated.status === 'finished') {
          dismissedGameIdsRef.current.delete(updated.id);
          if (updated.winner) {
            showToast(updated.winner === userId ? 'Du hast gewonnen!' : 'Du hast verloren.');
          } else {
            showToast('Unentschieden!');
          }
        }
      } catch (error) {
        if (__DEV__) console.warn('submitTicTacToeMove failed', error);
        showToast('Zug nicht moeglich.');
      }
    },
    [showToast, ticTacToeMatch, userId],
  );

  const handleDismissTicTacToeMatch = useCallback(() => {
    if (!ticTacToeMatch) return;
    if (ticTacToeMatch.status === 'finished') {
      dismissedGameIdsRef.current.add(ticTacToeMatch.id);
      dismissFinishedGame(ticTacToeMatch.id).catch(() => {});
    }
    setTicTacToeMatch(null);
  }, [ticTacToeMatch]);

  const handleForfeitTicTacToeMatch = useCallback(async () => {
    if (!ticTacToeMatch) return;
    try {
      await cancelGameInvite(ticTacToeMatch.id);
      setTicTacToeMatch(null);
      showToast('Spiel abgebrochen.');
    } catch (error) {
      if (__DEV__) console.warn('cancelGameInvite failed', error);
      showToast('Abbruch fehlgeschlagen.');
    }
  }, [showToast, ticTacToeMatch]);

  const handleEquip = useCallback(
    (slot, itemId, options = {}) => {
      const item = getItemById(itemId);
      if (!slot || !item || item.slot !== slot) return false;
      const owned = Number((inventory || {})[itemId] || 0);
      const skipOwnershipCheck = options.skipOwnershipCheck === true;
      const silent = options.silent === true;
      if (!skipOwnershipCheck && owned <= 0) {
        if (!silent) {
          showToast('Erst kaufen');
          if (hapticsOn) {
            Haptics.selectionAsync().catch(() => {});
          }
        }
        return false;
      }
      let changed = false;
      setEquipped((prev) => {
        if (prev[slot] === itemId) return prev;
        changed = true;
        return { ...prev, [slot]: itemId };
      });
      if (!changed) return false;
      if (!silent) {
        if (hapticsOn) {
          Haptics.selectionAsync().catch(() => {});
        }
        showToast(`${item.name} angelegt`);
        speak('Schick!');
      }
      return true;
    },
    [equipped, hapticsOn, inventory, showToast, speak],
  );

  const handleUnequip = useCallback(
    (slot, options = {}) => {
      if (!slot) return false;
      let removedName = '';
      let changed = false;
      const silent = options.silent === true;
      setEquipped((prev) => {
        const current = prev[slot];
        if (!current) return prev;
        removedName = getItemById(current)?.name || '';
        changed = true;
        return { ...prev, [slot]: null };
      });
      if (!changed) return false;
      if (!silent) {
        if (hapticsOn) {
          Haptics.selectionAsync().catch(() => {});
        }
        if (removedName) {
          showToast(`${removedName} abgelegt`);
        } else {
          showToast('Abgelegt');
        }
      }
      return true;
    },
    [hapticsOn, showToast],
  );

  const handleShopPurchase = useCallback(
    (item, options = {}) => {
      if (!item) return false;
      if (coins < item.price) {
        showToast('Zu wenig Coins');
        if (hapticsOn) {
          Haptics.selectionAsync().catch(() => {});
        }
        return false;
      }
      setCoins((c) => Math.max(0, c - item.price));
      setInventory((inv) => addToInventory(inv, item.id, 1));
      const toastText = options?.equip ? `Gekauft & angelegt: ${item.name}` : `Gekauft: ${item.name}`;
      showToast(toastText);
      if (hapticsOn) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      speak('Yeah!');
      if (options?.equip) {
        handleEquip(item.slot, item.id, { skipOwnershipCheck: true, silent: true });
      }
      return true;
    },
    [coins, handleEquip, hapticsOn, showToast, speak],
  );

  const handleApplyOutfit = useCallback(
    (draft) => {
      if (!draft) return false;
      const targetState = cloneEquipped(draft);
      let changed = false;
      for (const slot of EQUIP_SLOTS) {
        const desired = targetState[slot] ?? null;
        const current = equipped[slot] ?? null;
        if (desired === current) continue;
        if (!desired) {
          const removed = handleUnequip(slot, { silent: true });
          if (removed) changed = true;
          continue;
        }
        const item = getItemById(desired);
        const owned = item ? Number((inventory || {})[desired] || 0) : 0;
        if (!item || owned <= 0) continue;
        const applied = handleEquip(slot, desired, { skipOwnershipCheck: true, silent: true });
        if (applied) changed = true;
      }
      if (changed) {
        if (hapticsOn) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        showToast('Look übernommen');
        speak('Stylisch!');
      }
      return changed;
    },
    [equipped, handleEquip, handleUnequip, hapticsOn, inventory, showToast, speak],
  );

  const feed = useCallback(() => {
    if (!canAct) return;
    if (hunger >= 100) {
      showToast('Satt');
      if (hapticsOn) {
        Haptics.selectionAsync().catch(() => {});
      }
      return;
    }
    if (coins < FEED_COST) {
      showToast('Nicht genug Coins');
      if (hapticsOn) {
        Haptics.selectionAsync().catch(() => {});
      }
      return;
    }
    nextFrame(() => {
      setCoins((c) => Math.max(0, c - FEED_COST));
      setHunger((v) => clamp(v + 25));
      bump();

      const emojis = [0x1f354, 0x1f355, 0x1f363, 0x1f34e, 0x1f369];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const id = `${Date.now()}-${Math.random()}`;
      const w = Math.max(1, petAreaLayout.width || 200);
      const h = Math.max(1, petAreaLayout.height || 200);
      const side = Math.floor(Math.random() * 4);
      let startX = 0;
      let startY = 0;
      if (side === 0) {
        startX = -10;
        startY = Math.random() * h;
      } else if (side === 1) {
        startX = w + 10;
        startY = Math.random() * h;
      } else if (side === 2) {
        startX = Math.random() * w;
        startY = -10;
      } else {
        startX = Math.random() * w;
        startY = h + 10;
      }
      const targetX = w * 0.5;
      const targetY = h * 0.52;
      const x = new Animated.Value(startX);
      const y = new Animated.Value(startY);
      const opacity = new Animated.Value(1);
      const scale = new Animated.Value(1);
      setFoodFlyers((arr) => [...arr, { id, emoji, x, y, opacity, scale }]);
      Animated.parallel([
        Animated.timing(x, {
          toValue: targetX,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: targetY,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, { toValue: 0.6, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 700,
          delay: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setFoodFlyers((arr) => arr.filter((f) => f.id !== id));
      });
      setEmotion('eat');
      setXp((v) => v + XP_FEED);
      showToast(`+25 Hunger  -${FEED_COST} Coins  +${XP_FEED} XP`);
      if (hapticsOn) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      speak('Lecker!');
    });
  }, [bump, canAct, coins, hapticsOn, hunger, nextFrame, petAreaLayout.height, petAreaLayout.width, showToast, speak]);

  const toggleSleep = useCallback(() => {
    nextFrame(() => {
      setIsSleeping((s) => !s);
      if (hapticsOn) {
        Haptics.selectionAsync().catch(() => {});
      }
      speak('Okay');
    });
  }, [hapticsOn, nextFrame, speak]);

  const handleSoapDragStart = useCallback(() => {
    if (clean >= 100) {
      showToast('Schon sauber');
      return;
    }
    setSoapDrag({ active: true, x: 0, y: 0 });
    setIsWashing(true);
    lastWashPosRef.current = null;
    washAwardedRef.current = false;
    try {
      petAreaRef.current?.measureInWindow?.((x, y, w, h) => {
        petAreaWindowRef.current = { x, y, w, h };
      });
      mainRef.current?.measureInWindow?.((x, y) => {
        mainWindowRef.current = { x, y };
      });
    } catch {}
  }, [clean, showToast]);

  const handleSoapDragMove = useCallback(
    (pageX, pageY) => {
      const mx = Math.max(0, pageX - mainWindowRef.current.x);
      const my = Math.max(0, pageY - mainWindowRef.current.y);
      setSoapDrag({ active: true, x: mx, y: my });
      const rect = petAreaWindowRef.current;
      const lx = pageX - rect.x;
      const ly = pageY - rect.y;
      if (lx >= 0 && ly >= 0 && lx <= rect.w && ly <= rect.h) {
        const raf = global.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
        const last = lastWashPosRef.current;
        if (last) {
          const dx = lx - last.x;
          const dy = ly - last.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const gain = dist * 0.06;
          raf(() => {
            setClean((v) => {
              const nv = clamp(v + gain);
              if (nv >= 100 && !washAwardedRef.current) {
                washAwardedRef.current = true;
                setXp((xVal) => xVal + XP_WASH);
                setCoins((c) => c + COIN_WASH);
                showToast(`Sauber! +${XP_WASH} XP  +${COIN_WASH} Coins`);
                if (hapticsOn) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                }
                setIsWashing(false);
              }
              return nv;
            });
          });
        }
        lastWashPosRef.current = { x: lx, y: ly };
        const id = `${Date.now()}-${Math.random()}`;
        const opacity = new Animated.Value(0.9);
        const scale = new Animated.Value(0.9);
        const size = 22 + Math.random() * 26;
        setWashBubbles((prev) => {
          const next = [...prev, { id, x: lx, y: ly, opacity, scale, size }];
          return next.slice(-8);
        });
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 1600, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.15, duration: 1600, useNativeDriver: true }),
        ]).start(() => {
          const raf2 = global.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
          raf2(() => setWashBubbles((prev) => prev.filter((b) => b.id !== id)));
        });
      }
    },
    [hapticsOn, showToast],
  );

  const handleSoapDragEnd = useCallback(() => {
    setSoapDrag({ active: false, x: 0, y: 0 });
    setIsWashing(false);
    lastWashPosRef.current = null;
  }, []);

  const handlePetAreaInteract = useCallback(
    ({ x, y }) => {
      if (isSleeping) return;
      const w = petAreaLayout.width || 1;
      const h = petAreaLayout.height || 1;
      const result = handleTap(x, y, w, h);
      nextFrame(() => {
        setFun((v) => clamp(v + result.funDelta));
        if (result.text) showToast(result.text);
        if (hapticsOn) {
          Haptics.selectionAsync().catch(() => {});
        }
        setEmotion('tap');
        if (!result.annoyed) bump();
      });
    },
    [bump, hapticsOn, isSleeping, nextFrame, petAreaLayout.height, petAreaLayout.width, showToast],
  );

  const handleGameReward = useCallback(
    (gameKey, score) => {
      const gained = Math.max(0, Math.floor(Number(score) || 0));
      let coinsGain = 0;
      let xpGain = 0;
      let funGain = 0;

      switch (gameKey) {
        case 'tap':
          coinsGain = gained;
          xpGain = gained;
          funGain = gained;
          break;
        case 'catch':
          coinsGain = Math.floor(gained / 2);
          xpGain = gained;
          funGain = gained;
          break;
        case 'reaction':
          coinsGain = Math.floor(gained / 2);
          xpGain = gained;
          funGain = gained;
          break;
        default:
          break;
      }

      if (funGain) setFun((v) => clamp(v + funGain));
      if (coinsGain) setCoins((c) => c + coinsGain);
      if (xpGain) setXp((xVal) => xVal + xpGain);
      setEmotion('play');
      showToast(
        `Score ${score}: +${coinsGain} Coins  +${xpGain} XP  +${funGain} Spass`,
      );
    },
    [showToast],
  );

  const handleCasinoDelta = useCallback((delta) => {
    const amount = Number(delta) || 0;
    if (!amount) return;
    setCoins((c) => Math.max(0, c + amount));
  }, []);

  const updateSettings = useCallback(
    (patch) => {
      const next = { sound: patch.sound ?? soundOn, haptics: patch.haptics ?? hapticsOn };
      setSoundOn(next.sound);
      setHapticsOn(next.haptics);
      saveSettings(next).catch(() => {});
    },
    [hapticsOn, soundOn],
  );

  const resetPet = useCallback(() => {
    setPetType(null);
    setSettingsOpen(false);
    setPetSelectOpen(true);
    setEquipped(cloneEquipped());
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      let snap = {};
      try {
        if (raw) snap = JSON.parse(raw) || {};
      } catch {}
      delete snap.petType;
      snap.equipped = {};
      snap.savedAt = Date.now();
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snap)).catch(() => {});
    });
  }, []);

  const selectPet = useCallback((id) => {
    const s = String(id || '').trim();
    if (!s) return;
    setPetType(s);
    setPetSelectOpen(false);
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      let snap = {};
      try {
        if (raw) snap = JSON.parse(raw) || {};
      } catch {}
      snap.petType = s;
      snap.savedAt = Date.now();
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snap)).catch(() => {});
    });
  }, []);
  const ticTacToeStatusMap = useMemo(() => {
    const map = {};
    if (!userId) return map;
    if (ticTacToeOutgoing) {
      const otherId =
        ticTacToeOutgoing.hostId === userId
          ? ticTacToeOutgoing.opponentId
          : ticTacToeOutgoing.hostId;
      if (otherId) {
        map[otherId] =
          ticTacToeOutgoing.status === 'finished' ? 'finished' : 'pending-outgoing';
      }
    }
    if (ticTacToeIncoming) {
      const otherId =
        ticTacToeIncoming.hostId === userId
          ? ticTacToeIncoming.opponentId
          : ticTacToeIncoming.hostId;
      if (otherId) {
        map[otherId] =
          ticTacToeIncoming.status === 'finished' ? 'finished' : 'pending-incoming';
      }
    }
    if (ticTacToeMatch) {
      const otherId =
        ticTacToeMatch.hostId === userId ? ticTacToeMatch.opponentId : ticTacToeMatch.hostId;
      if (otherId) {
        map[otherId] = ticTacToeMatch.status === 'finished' ? 'finished' : 'active';
      }
    }
    return map;
  }, [ticTacToeIncoming, ticTacToeMatch, ticTacToeOutgoing, userId]);

  const selfSnapshot = useMemo(
    () => ({
      hunger,
      fun,
      clean,
      energy,
      xp,
      coins,
      petType,
      equipped,
    }),
    [coins, clean, energy, equipped, fun, hunger, petType, xp],
  );

  return {
    hunger,
    fun,
    clean,
    energy,
    isSleeping,
    xp,
    coins,
    inventory,
    equipped,
    shopOpen,
    setShopOpen,
    inventoryOpen,
    setInventoryOpen,
    gameOpen,
    setGameOpen,
    gamesMenuOpen,
    setGamesMenuOpen,
    selectedGame,
    setSelectedGame,
    friendsOpen,
    setFriendsOpen,
    profileOpen,
    setProfileOpen,
    visitingFriend,
    incomingVisitor,
    ticTacToeOutgoing,
    ticTacToeIncoming,
    ticTacToeMatch,
    ticTacToeStatusByFriend: ticTacToeStatusMap,
    petType,
    setPetType,
    petSelectOpen,
    setPetSelectOpen,
    settingsOpen,
    setSettingsOpen,
    soundOn,
    setSoundOn,
    hapticsOn,
    setHapticsOn,
    isWashing,
    petAreaLayout,
    setPetAreaLayout,
    washBubbles,
    foodFlyers,
    soapDrag,
    emotion,
    petScale,
    toastOpacity,
    toastMessage,
    petAreaRef,
    mainRef,
    levelInfo,
    mood,
    visitingFriendLevel,
    visitingFriendSpecies,
    incomingVisitorSpecies,
    canAct,
    showToast,
    bump,
    feed,
    toggleSleep,
    handleSoapDragStart,
    handleSoapDragMove,
    handleSoapDragEnd,
    handlePetAreaInteract,
    handleVisitFriend,
    handleFriendRemoved,
    handleInviteTicTacToe,
    handleCancelTicTacToeInvite,
    handleAcceptTicTacToeInvite,
    handleDeclineTicTacToeInvite,
    handleSubmitTicTacToeMove,
    handleDismissTicTacToeMatch,
    handleForfeitTicTacToeMatch,
    handleEndVisit,
    handleDismissIncomingVisit,
    handleShopPurchase,
    handleEquip,
    handleUnequip,
    handleApplyOutfit,
    handleGameReward,
    handleCasinoDelta,
    updateSettings,
    resetPet,
    selectPet,
    petAreaRef,
    mainRef,
    cloudUserId: userId,
    selfSnapshot,
  };
}
