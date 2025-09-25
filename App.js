import React from 'react';
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View, Pressable } from 'react-native';
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
    isWashing: false,
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

  const openGame = React.useCallback((key) => {
    if (!key) return;
    if (key === 'tap' && energy < ENERGY_COST_TAP) {
      showToast('Zu wenig Energie fuer Tap-Spiel');
      return;
    }
    if (key === 'catch' && energy < ENERGY_COST_CATCH) {
      showToast('Zu wenig Energie fuer Catch Game');
      return;
    }
    setActiveGame(key);
    if (key === 'tap') {
      setEnergy((prev) => clampStat(prev - ENERGY_COST_TAP));
    } else if (key === 'catch') {
      setEnergy((prev) => clampStat(prev - ENERGY_COST_CATCH));
    }
  }, [energy, showToast]);

  const closeActiveGame = React.useCallback(() => {
    setActiveGame(null);
  }, []);

  const handleGameReward = React.useCallback((key, score) => {
    const safeScore = Math.max(0, Math.floor(Number(score) || 0));
    let funGain = 0;
    let xpGain = 0;
    let coinGain = 0;
    if (key === 'tap') {
      funGain = safeScore * FUN_GAIN_TAP_PER_TAP;
      xpGain = XP_PLAY + Math.floor(safeScore / 3);
      coinGain = COIN_PLAY + safeScore * COIN_MINIGAME_PER_POINT;
    } else if (key === 'reaction') {
      funGain = Math.min(25, Math.floor(safeScore / 5));
      xpGain = XP_PLAY + Math.floor(safeScore / 15);
      coinGain = Math.floor(safeScore / 20);
    } else if (key === 'catch') {
      funGain = FUN_GAIN_CATCH;
      xpGain = XP_PLAY + XP_CATCH_REWARD + Math.floor(safeScore / 2);
      coinGain = COIN_CATCH_REWARD + safeScore * COIN_MINIGAME_PER_POINT;
    }
    if (funGain) setFun((prev) => clampStat(prev + funGain));
    if (xpGain) setXp((prev) => prev + xpGain);
    if (coinGain) setCoins((prev) => Math.max(0, prev + coinGain));
    pushEmotion('play', 1400);
    bump();
    if (coinGain || xpGain) {
      showToast(`Belohnung: +${Math.max(0, Math.floor(coinGain))} Coins, +${xpGain} XP`);
    } else {
      showToast('Gut gespielt!');
    }
  }, [pushEmotion, bump, showToast]);

  const handleCasinoDelta = React.useCallback((delta) => {
    const amount = Math.floor(Number(delta) || 0);
    if (!amount) return;
    setCoins((prev) => Math.max(0, prev + amount));
    showToast(amount > 0 ? `+${amount} Coins` : `${amount} Coins`);
  }, [showToast]);

  const handleBuyItem = React.useCallback((item, options = {}) => {
    if (!item) return;
    setCoins((prevCoins) => {
      if (prevCoins < item.price) {
        showToast('Nicht genug Coins');
        return prevCoins;
      }
      const nextCoins = prevCoins - item.price;
      setInventory((prev) => addToInventory(prev, item.id, 1));
      if (options.equip) {
        setEquipped((prev) => ({ ...prev, [item.slot]: item.id }));
      }
      showToast(`${item.name} gekauft`);
      return nextCoins;
    });
  }, [showToast]);

  const handleEquip = React.useCallback((slot, itemId) => {
    if (!slot) return;
    if (itemId && !inventory[itemId]) return;
    setEquipped((prev) => ({ ...prev, [slot]: itemId || null }));
  }, [inventory]);

  const handleUnequip = React.useCallback((slot) => {
    if (!slot) return;
    setEquipped((prev) => ({ ...prev, [slot]: null }));
  }, []);

  const handleVisitFriend = React.useCallback(async ({ friend, visitor }) => {
    if (!friend) return;
    const payload = {
      id: friend.id,
      kind: friend.kind,
      name: friend.name || friend.displayName || 'Freund',
      code: friend.code || null,
      xp: Math.max(0, Math.floor(friend.xp || 0)),
      petType: friend.petType || null,
      equipped: friend.equipped && typeof friend.equipped === 'object' ? friend.equipped : {},
      visitor,
    };
    setVisitingFriend(payload);
    showToast(`Zu Besuch bei ${payload.name}`);
    if (cloudSession && payload.kind === 'cloud' && payload.id) {
      try {
        await startFriendVisit(payload.id, visitor);
      } catch {}
    }
  }, [cloudSession, showToast]);

  const handleEndVisit = React.useCallback(async () => {
    const target = visitingFriend;
    if (!target) return;
    setVisitingFriend(null);
    showToast('Besuch beendet');
    if (cloudSession && target.kind === 'cloud' && target.id) {
      try {
        await endFriendVisit(target.id);
      } catch {}
    }
  }, [visitingFriend, cloudSession, showToast]);

  const handleFriendRemoved = React.useCallback((friend) => {
    if (friend && friend.kind === 'cloud' && cloudSession) {
      endFriendVisitAsHost(friend.id).catch(() => {});
    }
    showToast('Freund entfernt');
  }, [cloudSession, showToast]);

  const handleSettingsChange = React.useCallback((changes) => {
    if (!changes) return;
    if (Object.prototype.hasOwnProperty.call(changes, 'sound')) {
      setSoundEnabled(!!changes.sound);
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'haptics')) {
      setHapticsEnabled(!!changes.haptics);
    }
  }, []);

  const handleResetPet = React.useCallback(() => {
    const fresh = createDefaultSnapshot();
    fresh.sound = soundEnabled;
    fresh.haptics = hapticsEnabled;
    applySnapshotToState(fresh);
    latestSnapshotRef.current = fresh;
    scheduleSave(fresh);
    setPetSelectOpen(true);
    showToast('Haustier wurde zurueckgesetzt');
  }, [applySnapshotToState, soundEnabled, hapticsEnabled, scheduleSave, showToast]);

  const handlePetSelected = React.useCallback((choice) => {
    setPetType(choice);
    setEquipped(cloneEquipped());
    setPetSelectOpen(false);
    showToast('Tier ausgewaehlt');
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

  React.useEffect(() => {
    const interval = setInterval(()=> {
      const sleeping = isSleepingRef.current;
      const rates = sleeping ? DECAY_SLEEP : DECAY_AWAKE;
      const minutes = (TICK_INTERVAL_MS / 1000) / 60;
      setHunger((prev) => clampStat(prev - (rates.hunger || 0) * minutes));
      setFun((prev) => clampStat(prev - (rates.fun || 0) * minutes));
      setClean((prev) => clampStat(prev - (rates.clean || 0) * minutes));
      setEnergy((prev) => clampStat(prev - (rates.energy || 0) * minutes));
    }, TICK_INTERVAL_MS);
    tickIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const snapshot = updateSnapshotRef();
    scheduleSave(snapshot);
  }, [updateSnapshotRef, scheduleSave, hunger, fun, clean, energy, isSleeping, xp, coins, inventory, petType, equipped, soundEnabled, hapticsEnabled]);

  // Cloud visitor subscription
  React.useEffect(() => {
    if (!cloudSession) return;
    let cancelled = false;
    (async () => {
      try {
        const visit = await fetchActiveVisitForHost();
        if (!cancelled) setIncomingVisitor(normalizeVisit(visit));
      } catch {}
    })();

    const channel = subscribeToFriendVisits(cloudSession.user.id, async () => {
      try {
        const visit = await fetchActiveVisitForHost();
        if (!cancelled) setIncomingVisitor(normalizeVisit(visit));
      } catch {}
    });

    return () => {
      cancelled = true;
      channel?.unsubscribe?.();
    };
  }, [cloudSession]);

  React.useEffect(() => {
    return () => {
      if (lastSaveTimeoutRef.current) clearTimeout(lastSaveTimeoutRef.current);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      if (emotionTimeoutRef.current) clearTimeout(emotionTimeoutRef.current);
      persistSnapshot(latestSnapshotRef.current);
    };
  }, [persistSnapshot]);

  const levelInfo = React.useMemo(() => getLevelInfo(xp), [xp]);
  const mood = React.useMemo(() => moodFromStats(hunger, fun, clean, energy), [hunger, fun, clean, energy]);
  const overlayOpen = shopOpen || inventoryOpen || gamesMenuOpen || Boolean(activeGame) || friendsOpen || settingsOpen || petSelectOpen;
  const primaryUiVisible = !overlayOpen;
  const canAct = primaryUiVisible && !isSleeping && !isWashing;
  const visitorForPet = React.useMemo(() => {
    if (!incomingVisitor) return null;
    return {
      name: incomingVisitor.name,
      petType: incomingVisitor.petType || 'seestern',
      equipped: incomingVisitor.equipped || {},
    };
  }, [incomingVisitor]);

  const selfSnapshot = React.useMemo(() => ({
    name: account?.name || '',
    petType: petType || null,
    equipped: { ...equipped },
    xp,
  }), [account, petType, equipped, xp]);

  if (!ready) {
    return (
      <SafeAreaView style={styles.loading}>
        <StatusBar style="light" />
        <Background />
        <Text style={styles.loadingText}>Lade...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <Background />

      {/* HEADER */}
      <View style={styles.header} pointerEvents={primaryUiVisible ? 'auto' : 'none'}>
        <LevelHeader level={levelInfo.level} progress={levelInfo.progress} xp={xp} coins={coins} onPressProfile={refreshAccount} />
      </View>

      {/* STATS */}
      <View style={styles.stats} pointerEvents={primaryUiVisible ? 'auto' : 'none'}>
        <StatBar label="Hunger" value={hunger} icon="🍗" />
        <StatBar label="Spaß" value={fun} icon="🎉" />
        <StatBar label="Sauber" value={clean} icon="🫧" />
        <StatBar label="Energie" value={energy} icon="⚡" />
      </View>

      {/* PET AREA */}
      <View style={styles.petWrap}>
        <Animated.View style={{ transform: [{ scale: petScale }] }}>
          <PetArea
            ref={petAreaRef}
            style={styles.petArea}
            petType={petType}
            equipped={equipped}
            mood={mood}
            isSleeping={isSleeping}
            isWashing={isWashing}
            visitor={visitorForPet}
            onLayout={handlePetAreaLayout}
            onPress={canAct ? handleInteract : undefined}
            onSoapDragStart={canAct ? handleSoapDragStart : undefined}
            onSoapDragMove={canAct ? handleSoapDragMove : undefined}
            onSoapDragEnd={handleSoapDragEnd}
            emotion={emotion}
          />
        </Animated.View>

        {/* Wash bubbles overlay */}
        {washBubbles.map((b) => (
          <Animated.View
            key={b.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: b.x - b.size / 2,
              top: b.y - b.size / 2,
              width: b.size,
              height: b.size,
              borderRadius: b.size / 2,
              backgroundColor: 'rgba(255,255,255,0.25)',
              opacity: b.opacity,
              transform: [{ scale: b.scale }],
            }}
          />
        ))}

        {/* Food flyers overlay */}
        {foodFlyers.map((f) => (
          <Animated.Text
            key={f.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: [{ translateX: f.x }, { translateY: f.y }, { scale: f.scale }],
              opacity: f.opacity,
              fontSize: 24,
            }}
          >
            {String.fromCodePoint(f.emoji)}
          </Animated.Text>
        ))}
      </View>

      {/* ACTION DOCK + QUICK BUTTONS */}
      <View style={styles.dock} pointerEvents={primaryUiVisible ? 'auto' : 'none'}>
        <ActionDock
          onFeed={handleFeed}
          onSleepToggle={handleToggleSleep}
          onWashStart={handleSoapDragStart}
          onOpenGames={() => setGamesMenuOpen(true)}
          disabled={!canAct}
        />
      </View>

      <View style={styles.quickRow} pointerEvents={primaryUiVisible ? 'auto' : 'none'}>
        <ShopButton coins={coins} onPress={() => setShopOpen(true)} />
        <InventoryButton onPress={() => setInventoryOpen(true)} />
        <GameButton onPress={() => setGamesMenuOpen(true)} />
        <FriendsButton onPress={() => setFriendsOpen(true)} hasIncoming={!!incomingVisitor} />
        <Pressable style={styles.settingsBtn} onPress={() => setSettingsOpen(true)}>
          <Text style={styles.settingsTxt}>⚙️</Text>
        </Pressable>
      </View>

      {/* TOAST */}
      <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastOpacity }]}> 
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      {/* OVERLAYS */}
      {shopOpen && (
        <ShopScreen
          visible={shopOpen}
          coins={coins}
          inventory={inventory}
          equipped={equipped}
          onBuy={handleBuyItem}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
          onClose={() => setShopOpen(false)}
        />
      )}

      {inventoryOpen && (
        <InventoryScreen
          visible={inventoryOpen}
          inventory={inventory}
          equipped={equipped}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
          onClose={() => setInventoryOpen(false)}
        />
      )}

      {gamesMenuOpen && !activeGame && (
        <GamesMenu
          visible={gamesMenuOpen}
          onSelect={(k) => (k === 'casino' ? setActiveGame('casino') : openGame(k))}
          onClose={() => setGamesMenuOpen(false)}
        />
      )}

      {activeGame === 'tap' && (
        <TapGameScreen onClose={closeActiveGame} onFinish={(score) => { handleGameReward('tap', score); closeActiveGame(); }} />
      )}
      {activeGame === 'reaction' && (
        <ReactionGameScreen onClose={closeActiveGame} onFinish={(score) => { handleGameReward('reaction', score); closeActiveGame(); }} />
      )}
      {activeGame === 'catch' && (
        <CatchGameScreen onClose={closeActiveGame} onFinish={(score) => { handleGameReward('catch', score); closeActiveGame(); }} />
      )}
      {activeGame === 'casino' && (
        <CasinoScreen onClose={closeActiveGame} onDelta={handleCasinoDelta} />
      )}

      {friendsOpen && (
        <FriendsScreen
          visible={friendsOpen}
          onClose={() => setFriendsOpen(false)}
          onVisit={handleVisitFriend}
          onEndVisit={handleEndVisit}
          onFriendRemoved={handleFriendRemoved}
          visitingFriend={visitingFriend}
          selfSnapshot={selfSnapshot}
        />
      )}

      {settingsOpen && (
        <SettingsScreen
          visible={settingsOpen}
          sound={soundEnabled}
          haptics={hapticsEnabled}
          onChange={handleSettingsChange}
          onResetPet={handleResetPet}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {petSelectOpen && (
        <PetSelectScreen visible={petSelectOpen} onSelect={handlePetSelected} />
      )}

      {/* VISITOR BANNER */}
      {incomingVisitor && primaryUiVisible && (
        <View style={styles.visitorBanner}>
          <Text style={styles.visitorText}>👋 {incomingVisitor.name} besucht dich gerade</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
  loadingText: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', paddingHorizontal: 24, textAlign: 'center' },
  header: { position: 'absolute', top: 8, left: 12, right: 12 },
  stats: { position: 'absolute', top: 64, left: 12, right: 12, gap: 8 },
  petWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  petArea: { width: '100%', height: '100%' },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 88, alignItems: 'center' },
  quickRow: { position: 'absolute', left: 12, right: 12, bottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingsBtn: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14 },
  settingsTxt: { fontSize: 18, color: '#FFF' },
  toast: { position: 'absolute', bottom: 160, left: 24, right: 24, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(15,23,42,0.85)', alignItems: 'center' },
  toastText: { color: '#E2E8F0', fontWeight: '600' },
  visitorBanner: { position: 'absolute', top: 36, alignSelf: 'center', backgroundColor: 'rgba(15,23,42,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  visitorText: { color: '#E2E8F0', fontWeight: '600' },
});
