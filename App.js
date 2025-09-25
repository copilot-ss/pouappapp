import React from 'react';
import { Animated, Easing, SafeAreaView, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Background from './src/components/Background';
import PetArea from './src/components/PetArea';
import ActionDock from './src/components/ActionDock';
import LevelHeader from './src/components/LevelHeader';
import StatBar from './src/components/StatBar';
import ShopButton from './src/components/Shop/ShopButton';
import ShopScreen from './src/components/Shop/ShopScreen';
import InventoryButton from './src/components/Inventory/InventoryButton';
import InventoryScreen from './src/components/Inventory/InventoryScreen';
import GameButton from './src/components/Games/GameButton';
import GamesMenu from './src/components/Games/GamesMenu';
import TapGameScreen from './src/components/Games/TapGameScreen';
import ReactionGameScreen from './src/components/Games/ReactionGameScreen2';
import CatchGameScreen from './src/components/Games/CatchGameScreen';
import CasinoScreen from './src/components/Games/CasinoScreen';
import FriendsButton from './src/components/Friends/FriendsButton';
import FriendsScreen from './src/components/Friends/FriendsScreen';
import SettingsScreen from './src/components/Settings/SettingsScreen';
import PetSelectScreen from './src/components/PetSelectScreen';

import {
  STORAGE_KEY,
  DECAY_AWAKE,
  DECAY_SLEEP,
  XP_FEED,
  XP_PLAY,
  XP_WASH,
  COIN_FEED,
  COIN_PLAY,
  COIN_WASH,
  FEED_COST,
  COIN_MINIGAME_PER_POINT,
  ENERGY_COST_TAP,
  ENERGY_COST_CATCH,
  FUN_GAIN_TAP_PER_TAP,
  FUN_GAIN_CATCH,
  COIN_CATCH_REWARD,
  XP_CATCH_REWARD,
  WASH_ROWS,
  WASH_COLS,
  WASH_TARGET_RATIO,
} from './src/lib/constants';
import { getLevelInfo } from './src/lib/progression';
import { handleTap } from './src/domain/interactions';
import { clamp } from './src/lib/utils';
import { cloneEquipped } from './src/lib/outfit';
import { ensureAccount } from './src/state/account';
import { addToInventory } from './src/state/economy';
import {
  cloudAvailable,
  getSession,
  startFriendVisit,
  endFriendVisit,
  endFriendVisitAsHost,
  fetchActiveVisitForHost,
  subscribeToFriendVisits,
} from './src/state/cloudFriends';
import { fetchCloudProgress, upsertCloudProgress } from './src/state/cloudProgress';

const MAX_BUBBLES = 24;
const MAX_FOOD_FLYERS = 10;
const TICK_INTERVAL_MS = 8000;
const OFFLINE_MAX_SECONDS = 60 * 60 * 24;
const CLOUD_SYNC_INTERVAL_MS = 15000;

const BUBBLE_SIZES = [28, 32, 36, 40];
const FOOD_EMOJIS = [0x1f35a, 0x1f35f, 0x1f354, 0x1f363, 0x1f369];

function safeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampStat(value) {
  return clamp(safeNumber(value, 0), 0, 100);
}

function sanitizeInventory(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const next = {};
  for (const key of Object.keys(raw)) {
    const count = Math.floor(safeNumber(raw[key], 0));
    if (count > 0) next[key] = count;
  }
  return next;
}

function sanitizeEquipped(raw, inventory) {
  const base = cloneEquipped(raw);
  for (const slot of Object.keys(base)) {
    const item = base[slot];
    if (item && !inventory[item]) {
      base[slot] = null;
    }
  }
  return base;
}

function createDefaultSnapshot() {
  const now = Date.now();
  return {
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
    sound: true,
    haptics: true,
  };
}

function normalizeSnapshot(raw) {
  const base = createDefaultSnapshot();
  if (!raw || typeof raw !== 'object') return base;
  const inventory = sanitizeInventory(raw.inventory);
  return {
    hunger: clampStat(raw.hunger ?? base.hunger),
    fun: clampStat(raw.fun ?? base.fun),
    clean: clampStat(raw.clean ?? base.clean),
    energy: clampStat(raw.energy ?? base.energy),
    isSleeping: !!raw.isSleeping,
    xp: Math.max(0, Math.floor(safeNumber(raw.xp, base.xp))),
    coins: Math.max(0, Math.floor(safeNumber(raw.coins, base.coins))),
    inventory,
    petType: typeof raw.petType === 'string' ? raw.petType : base.petType,
    equipped: sanitizeEquipped(raw.equipped, inventory),
    savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : base.savedAt,
    sound: raw.sound === false ? false : true,
    haptics: raw.haptics === false ? false : true,
  };
}

function applyDecaySnapshot(snapshot, seconds) {
  const limitedSeconds = Math.max(0, Math.min(OFFLINE_MAX_SECONDS, seconds));
  if (limitedSeconds <= 0) return snapshot;
  const sleeping = !!snapshot.isSleeping;
  const rates = sleeping ? DECAY_SLEEP : DECAY_AWAKE;
  const minutes = limitedSeconds / 60;
  const next = { ...snapshot };
  next.hunger = clampStat(snapshot.hunger - (rates.hunger || 0) * minutes);
  next.fun = clampStat(snapshot.fun - (rates.fun || 0) * minutes);
  next.clean = clampStat(snapshot.clean - (rates.clean || 0) * minutes);
  next.energy = clampStat(snapshot.energy - (rates.energy || 0) * minutes);
  next.savedAt = Date.now();
  return next;
}

function moodFromStats(hunger, fun, clean, energy) {
  const score = (hunger + fun + clean + energy) / 4;
  if (score >= 75) return 'happy';
  if (score <= 35) return 'sad';
  return 'neutral';
}

function toLocalPoint(pageX, pageY, layout) {
  if (!layout) return null;
  const x = pageX - layout.x;
  const y = pageY - layout.y;
  if (x < 0 || y < 0 || x > layout.width || y > layout.height) return null;
  return { x, y };
}

function normalizeCloudSnapshot(row) {
  if (!row) return null;
  return normalizeSnapshot({
    hunger: row.hunger,
    fun: row.fun,
    clean: row.clean,
    energy: row.energy,
    isSleeping: row.is_sleeping,
    xp: row.xp,
    coins: row.coins,
    inventory: row.inventory,
    equipped: row.equipped,
    petType: row.pet_type,
    savedAt: row.saved_at ? Date.parse(row.saved_at) : Date.now(),
  });
}

function normalizeVisit(row) {
  if (!row) return null;
  return {
    hostId: row.host_id,
    visitorId: row.visitor_id,
    name: row.visitor_name || 'Besuch',
    petType: row.visitor_pet_type || null,
    equipped: row.visitor_equipped && typeof row.visitor_equipped === 'object' ? row.visitor_equipped : {},
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
  };
}

export default function App() {
  const [ready, setReady] = React.useState(false);
  const [account, setAccount] = React.useState(null);

  const [hunger, setHunger] = React.useState(80);
  const [fun, setFun] = React.useState(80);
  const [clean, setClean] = React.useState(80);
  const [energy, setEnergy] = React.useState(80);
  const [isSleeping, setIsSleeping] = React.useState(false);
  const [isWashing, setIsWashing] = React.useState(false);
  const [xp, setXp] = React.useState(0);
  const [coins, setCoins] = React.useState(0);
  const [inventory, setInventory] = React.useState({});
  const [equipped, setEquipped] = React.useState(() => cloneEquipped());
  const [petType, setPetType] = React.useState(null);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [hapticsEnabled, setHapticsEnabled] = React.useState(true);

  const [shopOpen, setShopOpen] = React.useState(false);
  const [inventoryOpen, setInventoryOpen] = React.useState(false);
  const [gamesMenuOpen, setGamesMenuOpen] = React.useState(false);
  const [activeGame, setActiveGame] = React.useState(null);
  const [friendsOpen, setFriendsOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [petSelectOpen, setPetSelectOpen] = React.useState(false);

  const [washBubbles, setWashBubbles] = React.useState([]);
  const [foodFlyers, setFoodFlyers] = React.useState([]);
  const [toastMessage, setToastMessage] = React.useState('');
  const [emotion, setEmotion] = React.useState(null);
  const [visitingFriend, setVisitingFriend] = React.useState(null);
  const [incomingVisitor, setIncomingVisitor] = React.useState(null);
  const [cloudSession, setCloudSession] = React.useState(null);

  const toastOpacity = React.useRef(new Animated.Value(0)).current;
  const petScale = React.useRef(new Animated.Value(1)).current;

  const petAreaRef = React.useRef(null);
  const petAreaLayoutRef = React.useRef(null);
  const isSleepingRef = React.useRef(false);
  const soapActiveRef = React.useRef(false);
  const washCellsRef = React.useRef(new Set());
  const emotionTimeoutRef = React.useRef(null);
  const lastSaveTimeoutRef = React.useRef(null);
  const tickIntervalRef = React.useRef(null);
  const lastCloudSyncRef = React.useRef(0);
  const latestSnapshotRef = React.useRef(createDefaultSnapshot());

  const showToast = React.useCallback((text) => {
    setToastMessage(text);
    toastOpacity.stopAnimation();
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(toastOpacity, { toValue: 0, duration: 600, delay: 700, useNativeDriver: true }),
    ]).start();
  }, [toastOpacity]);

  const bump = React.useCallback(() => {
    Animated.sequence([
      Animated.timing(petScale, { toValue: 1.08, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(petScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [petScale]);

  const pushEmotion = React.useCallback((value, duration = 1100) => {
    setEmotion(value);
    if (emotionTimeoutRef.current) clearTimeout(emotionTimeoutRef.current);
    emotionTimeoutRef.current = setTimeout(() => {
      setEmotion(null);
      emotionTimeoutRef.current = null;
    }, duration);
  }, []);

  const applySnapshotToState = React.useCallback((snapshot) => {
    setHunger(snapshot.hunger);
    setFun(snapshot.fun);
    setClean(snapshot.clean);
    setEnergy(snapshot.energy);
    setIsSleeping(snapshot.isSleeping);
    setXp(snapshot.xp);
    setCoins(snapshot.coins);
    setInventory(() => ({ ...snapshot.inventory }));
    setEquipped(() => ({ ...snapshot.equipped }));
    setPetType(snapshot.petType);
    setSoundEnabled(snapshot.sound !== false);
    setHapticsEnabled(snapshot.haptics !== false);
  }, []);

  const updateSnapshotRef = React.useCallback(() => {
    const snapshot = {
      hunger,
      fun,
      clean,
      energy,
      isSleeping,
      xp,
      coins,
      inventory: { ...inventory },
      petType,
      equipped: { ...equipped },
      savedAt: Date.now(),
      sound: soundEnabled,
      haptics: hapticsEnabled,
    };
    latestSnapshotRef.current = snapshot;
    return snapshot;
  }, [hunger, fun, clean, energy, isSleeping, xp, coins, inventory, petType, equipped, soundEnabled, hapticsEnabled]);

  const persistSnapshot = React.useCallback(async (snapshot) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      if (__DEV__) console.warn('Persist snapshot failed', error);
    }
    if (cloudSession) {
      const now = Date.now();
      if (now - lastCloudSyncRef.current > CLOUD_SYNC_INTERVAL_MS) {
        lastCloudSyncRef.current = now;
        upsertCloudProgress(snapshot).catch(() => {});
      }
    }
  }, [cloudSession]);

  const scheduleSave = React.useCallback((snapshot) => {
    if (lastSaveTimeoutRef.current) clearTimeout(lastSaveTimeoutRef.current);
    lastSaveTimeoutRef.current = setTimeout(() => {
      lastSaveTimeoutRef.current = null;
      persistSnapshot(snapshot || latestSnapshotRef.current);
    }, 1200);
  }, [persistSnapshot]);

  const spawnFoodFlyer = React.useCallback(() => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const emoji = FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)];
    const flyer = {
      id,
      opacity: new Animated.Value(1),
      x: new Animated.Value((Math.random() - 0.5) * 40),
      y: new Animated.Value(0),
      scale: new Animated.Value(0.8),
      emoji,
    };
    setFoodFlyers((prev) => [...prev.slice(-MAX_FOOD_FLYERS + 1), flyer]);
    Animated.parallel([
      Animated.timing(flyer.y, { toValue: -80 - Math.random() * 40, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(flyer.scale, { toValue: 1.2, duration: 600, useNativeDriver: true }),
      Animated.timing(flyer.opacity, { toValue: 0, duration: 400, delay: 500, useNativeDriver: true }),
    ]).start(() => {
      setFoodFlyers((prev) => prev.filter((item) => item.id !== id));
    });
  }, []);

  const spawnBubble = React.useCallback((point) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const size = BUBBLE_SIZES[Math.floor(Math.random() * BUBBLE_SIZES.length)];
    const bubble = {
      id,
      x: point.x,
      y: point.y,
      size,
      opacity: new Animated.Value(0.8),
      scale: new Animated.Value(0.6),
    };
    setWashBubbles((prev) => [...prev.slice(-MAX_BUBBLES + 1), bubble]);
    Animated.parallel([
      Animated.timing(bubble.scale, { toValue: 1.1, duration: 300, useNativeDriver: true }),
      Animated.timing(bubble.opacity, { toValue: 0, duration: 400, delay: 260, useNativeDriver: true }),
    ]).start(() => {
      setWashBubbles((prev) => prev.filter((item) => item.id !== id));
    });
  }, []);

  const finishWash = React.useCallback(() => {
    soapActiveRef.current = false;
    setIsWashing(false);
    washCellsRef.current = new Set();
    setClean((prev) => clampStat(prev + 35));
    setFun((prev) => clampStat(prev + 8));
    setCoins((prev) => prev + COIN_WASH);
    setXp((prev) => prev + XP_WASH);
    pushEmotion('wash', 1600);
    bump();
    showToast('Alles sauber!');
    setTimeout(() => setWashBubbles([]), 200);
  }, [bump, showToast, pushEmotion]);

  const handleSoapDragStart = React.useCallback(() => {
    if (clean >= 96) {
      showToast('Schon sauber!');
      return;
    }
    soapActiveRef.current = true;
    washCellsRef.current = new Set();
    setIsWashing(true);
    setWashBubbles([]);
    showToast('Waschen gestartet');
  }, [clean, showToast]);

  const handleSoapDragMove = React.useCallback((pageX, pageY) => {
    if (!soapActiveRef.current) return;
    const layout = petAreaLayoutRef.current;
    const local = toLocalPoint(pageX, pageY, layout);
    if (!local) return;
    spawnBubble(local);
    const col = Math.max(0, Math.min(WASH_COLS - 1, Math.floor((local.x / layout.width) * WASH_COLS)));
    const row = Math.max(0, Math.min(WASH_ROWS - 1, Math.floor((local.y / layout.height) * WASH_ROWS)));
    const key = `${row}:${col}`;
    if (!washCellsRef.current.has(key)) {
      washCellsRef.current.add(key);
      const total = WASH_ROWS * WASH_COLS;
      if (washCellsRef.current.size >= Math.ceil(total * WASH_TARGET_RATIO)) {
        finishWash();
      }
    }
  }, [spawnBubble, finishWash]);

  const handleSoapDragEnd = React.useCallback(() => {
    if (!soapActiveRef.current) {
      setIsWashing(false);
      return;
    }
    soapActiveRef.current = false;
    setIsWashing(false);
    washCellsRef.current = new Set();
    setWashBubbles([]);
    showToast('Waschen abgebrochen');
  }, [showToast]);

  const handlePetAreaLayout = React.useCallback(() => {
    const node = petAreaRef.current;
    if (!node || !node.measureInWindow) return;
    node.measureInWindow((x, y, width, height) => {
      petAreaLayoutRef.current = { x, y, width, height };
    });
  }, []);

  const handleInteract = React.useCallback(({ x, y }) => {
    const layout = petAreaLayoutRef.current;
    if (!layout) return;
    const result = handleTap(x, y, layout.width, layout.height);
    if (!result) return;
    setFun((prev) => clampStat(prev + (result.funDelta || 0)));
    setXp((prev) => prev + Math.max(1, Math.floor(Math.random() * 3)));
    pushEmotion(result.annoyed ? 'annoyed' : 'play', 1200);
    bump();
    if (result.text) showToast(result.text);
  }, [bump, pushEmotion, showToast]);

  const handleFeed = React.useCallback(() => {
    setCoins((current) => {
      if (current < FEED_COST) {
        showToast('Nicht genug Coins');
        return current;
      }
      const after = current - FEED_COST + COIN_FEED;
      setHunger((prev) => clampStat(prev + 22));
      setFun((prev) => clampStat(prev + 6));
      setClean((prev) => clampStat(prev - 2));
      setXp((prev) => prev + XP_FEED);
      spawnFoodFlyer();
      pushEmotion('eat', 1400);
      bump();
      showToast('Lecker!');
      return Math.max(0, after);
    });
  }, [spawnFoodFlyer, pushEmotion, bump, showToast]);

  const handleToggleSleep = React.useCallback(() => {
    setIsSleeping((prev) => {
      const next = !prev;
      showToast(next ? 'Schlafenszeit' : 'Aufgewacht');
      if (!next) {
        setEnergy((value) => clampStat(value - 4));
      }
      return next;
    });
  }, [showToast]);
  const refreshAccount = React.useCallback(async () => {
    try {
      const info = await ensureAccount();
      setAccount(info);
    } catch (error) {
      if (__DEV__) console.warn('Account refresh failed', error);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const cloudEnabled = cloudAvailable();
        const session = cloudEnabled ? await getSession() : null;
        if (!cancelled) setCloudSession(session);
        const accountData = await ensureAccount().catch(() => null);
        if (!cancelled && accountData) setAccount(accountData);

        let snapshot = createDefaultSnapshot();
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            snapshot = normalizeSnapshot(parsed);
          } catch (error) {
            if (__DEV__) console.warn('Snapshot parse failed', error);
          }
        }

        const seconds = Math.max(0, (Date.now() - snapshot.savedAt) / 1000);
        snapshot = applyDecaySnapshot(snapshot, seconds);
        if (!cancelled) {
          applySnapshotToState(snapshot);
          latestSnapshotRef.current = snapshot;
          if (!snapshot.petType) setPetSelectOpen(true);
        }

        if (session) {
          try {
            const remote = await fetchCloudProgress();
            const cloudSnap = normalizeCloudSnapshot(remote);
            if (!cancelled && cloudSnap) {
              if ((cloudSnap.savedAt || 0) > (snapshot.savedAt || 0) + 5000) {
                applySnapshotToState(cloudSnap);
                latestSnapshotRef.current = cloudSnap;
              }
            }
          } catch (error) {
            if (__DEV__) console.warn('Cloud sync failed', error);
          }
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applySnapshotToState]);

  React.useEffect(() => {
    isSleepingRef.current = isSleeping;
  }, [isSleeping]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <Background />
      <Text style={styles.placeholder}>Grundlogik wiederhergestellt - UI folgt.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
  placeholder: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', paddingHorizontal: 24, textAlign: 'center' },
});

