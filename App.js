import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View, Animated, Easing, AppState, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import StatBar from './src/components/StatBar';
import ActionDock from './src/components/ActionDock';
import PetArea from './src/components/PetArea';
import LevelHeader from './src/components/LevelHeader';
import Background from './src/components/Background';
import CoinsInline from './src/components/CoinsInline';
import { clamp } from './src/lib/utils';
import { STORAGE_KEY, DECAY_AWAKE, DECAY_SLEEP, SOUND_ENABLED, XP_FEED, XP_WASH, COIN_WASH, FEED_COST } from './src/lib/constants';
import { getLevelInfo } from './src/lib/progression';
import { handleTap } from './src/domain/interactions';

import ShopButton from './src/components/Shop/ShopButton';
import ShopScreen from './src/components/Shop/ShopScreen';
import InventoryButton from './src/components/Inventory/InventoryButton';
import InventoryScreen from './src/components/Inventory/InventoryScreen';
import { addToInventory } from './src/state/economy';
import GameButton from './src/components/Games/GameButton';
import GamesMenu from './src/components/Games/GamesMenu';
import ReactionGameScreen from './src/components/Games/ReactionGameScreen2';
import TapGameScreen from './src/components/Games/TapGameScreen';
import CatchGameScreen from './src/components/Games/CatchGameScreen';
import CasinoScreen from './src/components/Games/CasinoScreen';
import FriendsButton from './src/components/Friends/FriendsButton';
import FriendsScreen from './src/components/Friends/FriendsScreen';
import PetSelectScreen from './src/components/PetSelectScreen';
import { getSpecies } from './src/domain/species';
import SettingsScreen from './src/components/Settings/SettingsScreen';
import { loadSettings, saveSettings } from './src/state/settings';
import { getItemById } from './src/data/shopItems';

import { EMPTY_EQUIPPED, cloneEquipped, EQUIP_SLOTS } from './src/lib/outfit';
import { supabase } from './src/lib/supabaseClient';
import { fetchCloudProgress, upsertCloudProgress } from './src/state/cloudProgress';
import { startFriendVisit, endFriendVisit, fetchActiveVisitForHost, subscribeToFriendVisits, endFriendVisitAsHost } from './src/state/cloudFriends';
export default function App() {
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
  const [visitingFriend, setVisitingFriend] = useState(null);
  const [incomingVisitor, setIncomingVisitor] = useState(null);
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
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setCloudSession(data?.session ?? null);
    }).catch(() => {});
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

  function speak(text) {
    try {
      if (!soundOn) return;
      Speech.stop();
      Speech.speak(text, { language: 'de-DE', pitch: 1.0, rate: 1.0 });
    } catch {}
  }

  function applyDecaySnapshot(state, seconds, sleeping) {
    const R = sleeping ? DECAY_SLEEP : DECAY_AWAKE;
    return {
      hunger: clamp(state.hunger - R.hunger * seconds),
      fun: clamp(state.fun - R.fun * seconds),
      clean: clamp(state.clean - R.clean * seconds),
      energy: clamp(state.energy - R.energy * seconds),
    };
  }

function normalizeSnapshot(snapshot) {
  const now = Date.now();
  const savedAt = typeof snapshot?.savedAt === 'number' ? snapshot.savedAt : now;
  const inventoryData = snapshot?.inventory && typeof snapshot.inventory === 'object' ? snapshot.inventory : {};
  const equippedData = snapshot?.equipped && typeof snapshot.equipped === 'object'
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
}

function applySnapshot(snapshot, { persistToStorage = false } = {}) {
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
}

function applyCloudSnapshot(snapshot) {
  if (!snapshot) return;
  applySnapshot(snapshot, { persistToStorage: true });
}
function normalizeEquipped(raw = {}, inventory = {}) {
  const next = cloneEquipped();
  for (const slot of Object.keys(next)) {
    const candidate = typeof raw[slot] === 'string' ? raw[slot] : null;
    if (!candidate) {
      next[slot] = null;
      continue;
    }
    const item = getItemById(candidate);
    const owned = item ? Number((inventory || {})[item.id] || 0) : 0;
    next[slot] = item && item.slot === slot && owned > 0 ? item.id : null;
  }
  return next;
}

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

  // Load snapshot on mount and apply offline decay.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const snap = JSON.parse(raw);
          const savedAt = typeof snap.savedAt === 'number' ? snap.savedAt : Date.now();
          const seconds = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
          const baseState = {
            hunger: snap.hunger ?? 80,
            fun: snap.fun ?? 80,
            clean: snap.clean ?? 80,
            energy: snap.energy ?? 80,
          };
          const decayed = applyDecaySnapshot(
            baseState,
            seconds,
            !!snap.isSleeping
          );
          const inventoryData = snap.inventory && typeof snap.inventory === 'object' ? snap.inventory : {};
          const equippedData = snap.equipped && typeof snap.equipped === 'object'
            ? normalizeEquipped(snap.equipped, inventoryData)
            : normalizeEquipped({}, inventoryData);

          setHunger(decayed.hunger);
          setFun(decayed.fun);
          setClean(decayed.clean);
          setEnergy(decayed.energy);
          setIsSleeping(!!snap.isSleeping);
          setXp(typeof snap.xp === 'number' ? snap.xp : 0);
          setCoins(typeof snap.coins === 'number' ? snap.coins : 0);
          setInventory(inventoryData);
          setEquipped(equippedData);

          if (typeof snap.petType === 'string' && snap.petType) {
            setPetType(snap.petType);
          } else {
            setPetType(null);
            setPetSelectOpen(true);
          }

          const normalizedSnap = {
            hunger: decayed.hunger,
            fun: decayed.fun,
            clean: decayed.clean,
            energy: decayed.energy,
            isSleeping: !!snap.isSleeping,
            xp: typeof snap.xp === 'number' ? snap.xp : 0,
            coins: typeof snap.coins === 'number' ? snap.coins : 0,
            inventory: inventoryData,
            petType: typeof snap.petType === 'string' && snap.petType ? snap.petType : null,
            equipped: equippedData,
            savedAt,
          };

          lastLocalSaveRef.current = savedAt;
          latestSnapshotRef.current = normalizedSnap
        } else {
          const now = Date.now();
          const defaultSnap = {
            hunger,
            fun,
            clean,
            energy,
            isSleeping,
            xp: 0,
            coins: 0,
            inventory: {},
            petType: null,
            equipped: cloneEquipped(),
            savedAt: now,
          };
          lastLocalSaveRef.current = now;
          latestSnapshotRef.current = defaultSnap;
        }
      } catch (e) {
        // ignore load errors
      }
    })();
  }, []);

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
  }, [cloudSession]);

  // basic 1s tick for stat changes
  useEffect(() => {
    const R = isSleeping ? DECAY_SLEEP : DECAY_AWAKE;
    tickRef.current && clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setHunger((v) => clamp(v - R.hunger));
      setFun((v) => clamp(v - R.fun));
      setClean((v) => clamp(v - R.clean));
      setEnergy((v) => clamp(v - R.energy));
    }, 1000);

    return () => {
      tickRef.current && clearInterval(tickRef.current);
    };
  }, [isSleeping]);

  // Passive coin drip every 30 seconds
  useEffect(() => {
    coinTickRef.current && clearInterval(coinTickRef.current);
    coinTickRef.current = setInterval(() => {
      if (appStateRef.current !== 'active') return;
      setCoins((value) => value + 1);
    }, 30000);

    return () => {
      coinTickRef.current && clearInterval(coinTickRef.current);
    };
  }, []);

  // Load settings (sound/vibration) on mount
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

  // Persist with light debounce on state changes
  useEffect(() => {
    saveTimerRef.current && clearTimeout(saveTimerRef.current);
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
      saveTimerRef.current && clearTimeout(saveTimerRef.current);
    };
  }, [hunger, fun, clean, energy, isSleeping, xp, coins, inventory, petType, equipped, cloudSession]);

  // Level-up detection
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
  }, [level]);

  // Recalculate decay when returning to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if ((prev === 'background' || prev === 'inactive') && nextState === 'active') {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          const snap = JSON.parse(raw);
          const savedAt = typeof snap.savedAt === 'number' ? snap.savedAt : Date.now();
          const seconds = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
          const decayed = applyDecaySnapshot({ hunger, fun, clean, energy }, seconds, isSleeping);
          setHunger(decayed.hunger);
          setFun(decayed.fun);
          setClean(decayed.clean);
          setEnergy(decayed.energy);
        } catch {}
      }
    });
    return () => sub.remove();
  }, [hunger, fun, clean, energy, isSleeping]);

  const canAct = !isSleeping && !isWashing;
  // Food is no longer in inventory; feeding costs coins.


  function bump() {
    Animated.sequence([
      Animated.timing(petScale, { toValue: 1.12, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(petScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }

  function showToast(text) {
    setToastMessage(text);
    toastOpacity.stopAnimation();
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(toastOpacity, { toValue: 0, duration: 600, delay: 500, useNativeDriver: true }),
    ]).start();
  }
  const nextFrame = (cb) => {
    const raf = global.requestAnimationFrame || ((f) => setTimeout(f, 0));
    raf(cb);
  };

  const handleVisitFriend = React.useCallback(async (payload) => {
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
  }, [petType, equipped, xp, showToast]);

  const handleFriendRemoved = React.useCallback((friend) => {
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
  }, [cloudSession?.user?.id, incomingVisitor, showToast, visitingFriend]);

  const handleEndVisit = React.useCallback(async () => {
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

  const mapVisitRow = React.useCallback((row) => {
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
    const channel = subscribeToFriendVisits(hostId, (payload) => {
      if (!active) return;
      if (payload.eventType === 'DELETE') {
        setIncomingVisitor(null);
      } else {
        setIncomingVisitor(mapVisitRow(payload.new));
      }
    });
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

  const handleDismissIncomingVisit = React.useCallback(async () => {
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
  const visitingFriendLevel = visitingFriend ? getLevelInfo(visitingFriend.xp || 0).level : null;
  const visitingFriendSpecies = visitingFriend?.petType ? getSpecies(visitingFriend.petType).name : null;
  const incomingVisitorSpecies = incomingVisitor?.petType ? getSpecies(incomingVisitor.petType).name : null;



const handleEquip = (slot, itemId, options = {}) => {
  const item = getItemById(itemId);
  if (!slot || !item || item.slot !== slot) return false;
  const owned = Number((inventory || {})[itemId] || 0);
  const skipOwnershipCheck = options.skipOwnershipCheck === true;
  const silent = options.silent === true;
  if (!skipOwnershipCheck && owned <= 0) {
    if (!silent) {
      showToast('Erst kaufen');
      if (hapticsOn) { Haptics.selectionAsync().catch(() => {}); }
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
    if (hapticsOn) { Haptics.selectionAsync().catch(() => {}); }
    showToast(`${item.name} angelegt`);
    speak('Schick!');
  }
  return true;
};

  const handleUnequip = (slot, options = {}) => {
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
      if (hapticsOn) { Haptics.selectionAsync().catch(() => {}); }
      if (removedName) {
        showToast(`${removedName} abgelegt`);
      } else {
        showToast('Abgelegt');
      }
    }
    return true;
  };

  const handleShopPurchase = (item, options = {}) => {
    if (!item) return false;
    if (coins < item.price) {
      showToast('Zu wenig Coins');
      if (hapticsOn) { Haptics.selectionAsync().catch(() => {}); }
      return false;
    }
    setCoins((c) => Math.max(0, c - item.price));
    setInventory((inv) => addToInventory(inv, item.id, 1));
    const toastText = options?.equip ? `Gekauft & angelegt: ${item.name}` : `Gekauft: ${item.name}`;
    showToast(toastText);
    if (hapticsOn) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    speak('Yeah!');
    if (options?.equip) {
      handleEquip(item.slot, item.id, { skipOwnershipCheck: true, silent: true });
    }
    return true;
  };

    const handleApplyOutfit = (draft) => {
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
      if (hapticsOn) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
      showToast('Look ?bernommen');
      speak('Stylisch!');
    }
    return changed;
  };

  const feed = () => {
    if (!canAct) return;
    if (hunger >= 100) { showToast('Satt'); if (hapticsOn) { Haptics.selectionAsync().catch(() => {}); } return; }
    if (coins < FEED_COST) { showToast('Nicht genug Coins'); if (hapticsOn) { Haptics.selectionAsync().catch(() => {}); } return; }
    nextFrame(() => {
      setCoins((c) => Math.max(0, c - FEED_COST));
      setHunger((v) => clamp(v + 25));
      bump();

                  // spawn food flyer animation
      const emojis = [0x1F354, 0x1F355, 0x1F363, 0x1F34E, 0x1F369];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const id = `${Date.now()}-${Math.random()}`;
      const w = Math.max(1, petAreaLayout.width || 200);
      const h = Math.max(1, petAreaLayout.height || 200);
      const side = Math.floor(Math.random() * 4);
      let startX = 0, startY = 0;
      if (side === 0) { startX = -10; startY = Math.random() * h; }
      else if (side === 1) { startX = w + 10; startY = Math.random() * h; }
      else if (side === 2) { startX = Math.random() * w; startY = -10; }
      else { startX = Math.random() * w; startY = h + 10; }
      const targetX = w * 0.5;
      const targetY = h * 0.52;
      const x = new Animated.Value(startX);
      const y = new Animated.Value(startY);
      const opacity = new Animated.Value(1);
      const scale = new Animated.Value(1);
      setFoodFlyers((arr) => [...arr, { id, emoji, x, y, opacity, scale }]);
      Animated.parallel([
        Animated.timing(x, { toValue: targetX, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: targetY, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.6, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 700, delay: 500, useNativeDriver: true }),
      ]).start(() => {
        setFoodFlyers((arr) => arr.filter((f) => f.id !== id));
      });
      setEmotion('eat');
      setXp((v) => v + XP_FEED);
      showToast(`+25 Hunger  -${FEED_COST} Coins  +${XP_FEED} XP`);
      if (hapticsOn) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }
      speak('Lecker!');
    });
  };
  
  const toggleSleep = () => {
    nextFrame(() => {
      setIsSleeping((s) => !s);
      if (hapticsOn) { Haptics.selectionAsync().catch(() => {}); }
      speak('Okay');
    });
  };

  return (
    <View style={styles.container}>
      <Background />
      <View style={styles.header}>
        <LevelHeader levelInfo={levelInfo} />
        <View style={styles.headerRight}>
          {!shopOpen && (
            <CoinsInline coins={coins} />
          )}
          <Pressable onPress={() => setSettingsOpen(true)} hitSlop={12} style={styles.headerSettingsBtn}>
            <Text style={styles.headerSettingsIcon}>{String.fromCodePoint(0x2699)}</Text>
          </Pressable>
        </View>
      </View>
        {!(shopOpen || inventoryOpen || gameOpen) && (
        <ShopButton onPress={() => setShopOpen(true)} />
      )}
      {!(shopOpen || inventoryOpen || gameOpen) && (
        <InventoryButton onPress={() => setInventoryOpen(true)} />
      )}
      {!(shopOpen || inventoryOpen || gameOpen) && (
        <GameButton onPress={() => setGamesMenuOpen(true)} />
      )}
      {!(shopOpen || inventoryOpen || gameOpen) && (
        <FriendsButton onPress={() => setFriendsOpen(true)} />
      )}

      {!(shopOpen || inventoryOpen || gameOpen) && (
      <View style={styles.main} ref={mainRef}>
                        <PetArea
          ref={petAreaRef}
          mood={mood}
          emotion={emotion}
          species={petType || 'seestern'}
          isSleeping={isSleeping}
          isWashing={isWashing}
          onLayout={(e) => setPetAreaLayout(e.nativeEvent.layout)}
          panHandlers={{}}
          washBubbles={washBubbles}
          toastOpacity={toastOpacity}
          toastMessage={toastMessage}
          petScale={petScale}
          foodFlyers={foodFlyers}
          equipped={equipped}
          visitor={incomingVisitor ? {
            name: incomingVisitor.name,
            petType: incomingVisitor.petType || 'seestern',
            equipped: incomingVisitor.equipped || {},
          } : null}
          onInteract={({ x, y }) => {
            if (isSleeping) return;
            const w = petAreaLayout.width || 1;
            const h = petAreaLayout.height || 1;
            const r = handleTap(x, y, w, h);
            nextFrame(() => {
              setFun((v) => clamp(v + r.funDelta));
              showToast(r.text);
              if (hapticsOn) { Haptics.selectionAsync().catch(() => {}); }
              setEmotion("tap");
              if (!r.annoyed) bump();
            });
          }}
        />
        {soapDrag.active && (
          <View pointerEvents="none" style={[styles.soapGhost, { left: soapDrag.x - 16, top: soapDrag.y - 16 }]}> 
            <Text style={{ fontSize: 22 }}>{String.fromCodePoint(0x1F9FC)}</Text>
          </View>
        )}
      </View>
      )}

      {!(shopOpen || inventoryOpen || gameOpen) && (
      <View style={styles.stats} pointerEvents="box-none">
        <StatBar label={String.fromCodePoint(0x1F357)} value={hunger} color="#F59E0B" compact hideValue />
        <StatBar label={String.fromCodePoint(0x1F3AE)} value={fun} color="#34D399" compact hideValue />
        <StatBar label={String.fromCodePoint(0x1F9FC)} value={clean} color="#3B82F6" compact hideValue />
        <StatBar label={String.fromCodePoint(0x26A1)} value={energy} color="#8B5CF6" compact hideValue />
      </View>
      )}

      {!(shopOpen || inventoryOpen || gameOpen) && (
      <ActionDock
        isSleeping={isSleeping}
        isWashing={isWashing}
        canAct={canAct}
        feedDisabled={!canAct || hunger >= 100 || coins < FEED_COST}
        soapDisabled={isSleeping || clean >= 100}
        onFeed={feed}
        onToggleSleep={toggleSleep}
        onSoapDragStart={() => {
          if (clean >= 100) { showToast('Schon sauber'); return; }
          setSoapDrag({ active: true, x: 0, y: 0 });
          setIsWashing(true);
          lastWashPosRef.current = null;
          washAwardedRef.current = false;
          try {
            petAreaRef.current?.measureInWindow?.((x, y, w, h) => { petAreaWindowRef.current = { x, y, w, h }; });
            mainRef.current?.measureInWindow?.((x, y, w, h) => { mainWindowRef.current = { x, y }; });
          } catch {}
        }}
        onSoapDragMove={(pageX, pageY) => {
          const mx = Math.max(0, pageX - mainWindowRef.current.x);
          const my = Math.max(0, pageY - mainWindowRef.current.y);
          setSoapDrag((s) => ({ active: true, x: mx, y: my }));
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
                    setXp((x) => x + XP_WASH);
                    setCoins((c) => c + COIN_WASH);
                    showToast(`Sauber! +${XP_WASH} XP  +${COIN_WASH} Coins`);
                    if (hapticsOn) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
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
        }}
        onSoapDragEnd={() => {
          setSoapDrag({ active: false, x: 0, y: 0 });
          setIsWashing(false);
          lastWashPosRef.current = null;
        }}
      />
      )}

      <StatusBar style="auto" />
      <ShopScreen
        open={shopOpen}
        coins={coins}
        inventory={inventory}
        species={petType || 'seestern'}
        equipped={equipped}
        onClose={() => setShopOpen(false)}
        onBuy={handleShopPurchase}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
      />
      <InventoryScreen
        open={inventoryOpen}
        inventory={inventory}
        equipped={equipped}
        species={petType || 'seestern'}
        onClose={() => setInventoryOpen(false)}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
      />
      <SettingsScreen
        open={settingsOpen}
        sound={soundOn}
        haptics={hapticsOn}
        onChange={(patch) => {
          const next = { sound: patch.sound ?? soundOn, haptics: patch.haptics ?? hapticsOn };
          setSoundOn(next.sound);
          setHapticsOn(next.haptics);
          saveSettings(next).catch(() => {});
        }}
        onResetPet={() => {
          setPetType(null);
          setSettingsOpen(false);
          setPetSelectOpen(true);
          setEquipped(cloneEquipped());
          // clear from persisted snapshot
          AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
            let snap = {};
            try { if (raw) snap = JSON.parse(raw) || {}; } catch {}
            delete snap.petType;
            snap.equipped = {};
            snap.savedAt = Date.now();
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snap)).catch(() => {});
          });
        }}
        onClose={() => setSettingsOpen(false)}
      />
      <PetSelectScreen
        open={petSelectOpen}
        onSelect={(id) => {
          const s = String(id || '').trim();
          if (!s) return;
          setPetType(s);
          setPetSelectOpen(false);
          // persist immediately
          AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
            let snap = {};
            try { if (raw) snap = JSON.parse(raw) || {}; } catch {}
            snap.petType = s;
            snap.savedAt = Date.now();
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snap)).catch(() => {});
          });
        }}
      />
      <FriendsScreen
        open={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onVisitFriend={handleVisitFriend}
        onFriendRemoved={handleFriendRemoved}
      />
                  <GamesMenu
        open={gamesMenuOpen}
        onClose={() => setGamesMenuOpen(false)}
        onSelect={(key) => { setSelectedGame(key); setGamesMenuOpen(false); setGameOpen(true); }}
      />
      {visitingFriend && (
        <View style={styles.visitOverlay} pointerEvents="auto">
          <View style={styles.visitCard}>
            <View style={styles.visitHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.visitTitle}>Zu Besuch bei {visitingFriend.name || 'Freund'}</Text>
                <Text style={styles.visitSubtitle}>
                  {`Level ${visitingFriendLevel ?? getLevelInfo(visitingFriend.xp || 0).level}`}
                  {visitingFriendSpecies ? ` - ${visitingFriendSpecies}` : ''}
                  {visitingFriend.code ? ` - Code ${visitingFriend.code}` : ''}
                </Text>
              </View>
              <Pressable style={styles.visitCloseBtn} onPress={handleEndVisit}>
                <Text style={styles.visitCloseText}>{String.fromCodePoint(0x2715)}</Text>
              </Pressable>
            </View>
            <View style={styles.visitPreview}>
              <OutfitPreview species={visitingFriend.petType || petType || 'seestern'} equipped={visitingFriend.equipped} />
            </View>
            <Pressable style={styles.visitActionBtn} onPress={handleEndVisit}>
              <Text style={styles.visitActionText}>Besuch beenden</Text>
            </Pressable>
          </View>
        </View>
      )}
      {incomingVisitor && (
        <View style={styles.visitOverlay} pointerEvents="auto">
          <View style={styles.visitCard}>
            <View style={styles.visitHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.visitTitle}>{incomingVisitor.name || 'Freund'} besucht dich</Text>
                <Text style={styles.visitSubtitle}>
                  Besuch aktiv
                  {incomingVisitorSpecies ? ` - ${incomingVisitorSpecies}` : ''}
                </Text>
              </View>
              <Pressable style={styles.visitCloseBtn} onPress={handleDismissIncomingVisit}>
                <Text style={styles.visitCloseText}>{String.fromCodePoint(0x2715)}</Text>
              </Pressable>
            </View>
            <View style={styles.visitPreview}>
              <OutfitPreview species={incomingVisitor.petType || petType || 'seestern'} equipped={incomingVisitor.equipped || {}} />
            </View>
            <Pressable style={styles.visitActionBtn} onPress={handleDismissIncomingVisit}>
              <Text style={styles.visitActionText}>Besuch beenden</Text>
            </Pressable>
          </View>
        </View>
      )}

      {selectedGame === 'tap' && (
        <TapGameScreen
          open={gameOpen}
          onClose={() => setGameOpen(false)}
          hapticsEnabled={hapticsOn}
          onReward={(score) => {
            const gained = Math.max(0, Math.floor(score));
            const earnedCoins = gained;
            const earnedXp = gained;
            setFun((v) => clamp(v + gained));
            setEmotion('play');
            setCoins((c) => c + earnedCoins);
            setXp((x) => x + earnedXp);
            showToast(`Score ${score}: +${earnedCoins} Coins  +${earnedXp} XP  +${gained} Spass`);
          }}
        />
      )}
      {selectedGame === 'casino' && (
        <CasinoScreen
          open={gameOpen}
          onClose={() => setGameOpen(false)}
          coins={coins}
          onDeltaCoins={(d) => setCoins((c) => Math.max(0, c + (Number(d) || 0)))}
        />
      )}
      {selectedGame === 'catch' && (
        <CatchGameScreen
          open={gameOpen}
          onClose={() => setGameOpen(false)}
          hapticsEnabled={hapticsOn}
          onReward={(score) => {
            const gained = Math.max(0, Math.floor(score));
            const earnedCoins = Math.floor(gained / 2);
            const earnedXp = gained;
            setFun((v) => clamp(v + gained));
            setEmotion('play');
            setCoins((c) => c + earnedCoins);
            setXp((x) => x + earnedXp);
            showToast(`Score ${score}: +${earnedCoins} Coins  +${earnedXp} XP  +${gained} Spass`);
          }}
        />
      )}{selectedGame === 'reaction' && (
        <ReactionGameScreen
          open={gameOpen}
          onClose={() => setGameOpen(false)}
          hapticsEnabled={hapticsOn}
          onReward={(score) => {
            const gained = Math.max(0, Math.floor(score));
            const earnedCoins = Math.floor(gained / 2);
            const earnedXp = gained;
            setFun((v) => clamp(v + gained));
            setEmotion('play');
            setCoins((c) => c + earnedCoins);
            setXp((x) => x + earnedXp);
            showToast(`Score ${score}: +${earnedCoins} Coins  +${earnedXp} XP  +${gained} Spass`);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  headerSettingsBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#E5E7EB' },
  headerSettingsIcon: { fontSize: 18, color: '#111827', fontWeight: '800' },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 140,
    position: 'relative',
  },
  title: { display: 'none' },
  headerTitleWrap: { display: 'none' },
  stats: {
    position: 'absolute',
    right: 11,
    bottom: 17,
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 8,
    backgroundColor: '#D8B4FE',
    borderColor: '#E9D5FF',
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  actions: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  soapGhost: {
    position: 'absolute',
    zIndex: 50,
    elevation: 6,
  },
  visitOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 400, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.5)', paddingHorizontal: 24 },
  visitCard: { width: '90%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, gap: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } },
  visitHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  visitTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  visitSubtitle: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  visitCloseBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  visitCloseText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  visitPreview: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.8 }] },
  visitActionBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  visitActionText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});






















































































































