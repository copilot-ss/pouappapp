from pathlib import Path\nparts = []\n
parts.append("""import React from 'react';
import { Animated, Easing, SafeAreaView, StyleSheet, View, Text, Pressable } from 'react-native';
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
""")
parts.append("""\nexport default function App() {\n  const [ready, setReady] = React.useState(false);\n  const [account, setAccount] = React.useState(null);\n\n  const [hunger, setHunger] = React.useState(80);\n  const [fun, setFun] = React.useState(80);\n  const [clean, setClean] = React.useState(80);\n  const [energy, setEnergy] = React.useState(80);\n  const [isSleeping, setIsSleeping] = React.useState(false);\n  const [isWashing, setIsWashing] = React.useState(false);\n  const [xp, setXp] = React.useState(0);\n  const [coins, setCoins] = React.useState(0);\n  const [inventory, setInventory] = React.useState({});\n  const [equipped, setEquipped] = React.useState(() => cloneEquipped());\n  const [petType, setPetType] = React.useState(null);\n  const [soundEnabled, setSoundEnabled] = React.useState(true);\n  const [hapticsEnabled, setHapticsEnabled] = React.useState(true);\n\n  const [shopOpen, setShopOpen] = React.useState(false);\n  const [inventoryOpen, setInventoryOpen] = React.useState(false);\n  const [gamesMenuOpen, setGamesMenuOpen] = React.useState(false);\n  const [activeGame, setActiveGame] = React.useState(null);\n  const [friendsOpen, setFriendsOpen] = React.useState(false);\n  const [settingsOpen, setSettingsOpen] = React.useState(false);\n  const [petSelectOpen, setPetSelectOpen] = React.useState(false);\n\n  const [washBubbles, setWashBubbles] = React.useState([]);\n  const [foodFlyers, setFoodFlyers] = React.useState([]);\n  const [toastMessage, setToastMessage] = React.useState('');\n  const [emotion, setEmotion] = React.useState(null);\n  const [visitingFriend, setVisitingFriend] = React.useState(null);\n  const [incomingVisitor, setIncomingVisitor] = React.useState(null);\n  const [cloudSession, setCloudSession] = React.useState(null);\n\n  const toastOpacity = React.useRef(new Animated.Value(0)).current;\n  const petScale = React.useRef(new Animated.Value(1)).current;\n  const petAreaRef = React.useRef(null);\n  const petAreaLayoutRef = React.useRef(null);\n  const isSleepingRef = React.useRef(false);\n  const soapActiveRef = React.useRef(false);\n  const washCellsRef = React.useRef(new Set());\n  const emotionTimeoutRef = React.useRef(null);\n  const lastSaveTimeoutRef = React.useRef(null);\n  const tickIntervalRef = React.useRef(null);\n  const lastCloudSyncRef = React.useRef(0);\n  const latestSnapshotRef = React.useRef(createDefaultSnapshot());\n\n  const showToast = React.useCallback((text) => {\n    setToastMessage(text);\n    toastOpacity.stopAnimation();\n    toastOpacity.setValue(0);\n    Animated.sequence([\n      Animated.timing(toastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),\n      Animated.timing(toastOpacity, { toValue: 0, duration: 600, delay: 700, useNativeDriver: true }),\n    ]).start();\n  }, [toastOpacity]);\n\n  const bump = React.useCallback(() => {\n    Animated.sequence([\n      Animated.timing(petScale, { toValue: 1.08, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),\n      Animated.spring(petScale, { toValue: 1, friction: 4, useNativeDriver: true }),\n    ]).start();\n  }, [petScale]);\n\n  const pushEmotion = React.useCallback((value, duration = 1100) => {\n    setEmotion(value);\n    if (emotionTimeoutRef.current) clearTimeout(emotionTimeoutRef.current);\n    emotionTimeoutRef.current = setTimeout(() => {\n      setEmotion(null);\n      emotionTimeoutRef.current = null;\n    }, duration);\n  }, []);\n\n  const applySnapshotToState = React.useCallback((snapshot) => {\n    setHunger(snapshot.hunger);\n    setFun(snapshot.fun);\n    setClean(snapshot.clean);\n    setEnergy(snapshot.energy);\n    setIsSleeping(snapshot.isSleeping);\n    setXp(snapshot.xp);\n    setCoins(snapshot.coins);\n    setInventory(() => ({ ...snapshot.inventory }));\n    setEquipped(() => ({ ...snapshot.equipped }));\n    setPetType(snapshot.petType);\n    setSoundEnabled(snapshot.sound !== false);\n    setHapticsEnabled(snapshot.haptics !== false);\n  }, []);\n\n  const updateSnapshotRef = React.useCallback(() => {\n    const snapshot = {\n      hunger,\n      fun,\n      clean,\n      energy,\n      isSleeping,\n      xp,\n      coins,\n      inventory: { ...inventory },\n      petType,\n      equipped: { ...equipped },\n      savedAt: Date.now(),\n      sound: soundEnabled,\n      haptics: hapticsEnabled,\n    };\n    latestSnapshotRef.current = snapshot;\n    return snapshot;\n  }, [hunger, fun, clean, energy, isSleeping, xp, coins, inventory, petType, equipped, soundEnabled, hapticsEnabled]);\n""")
parts.append("""\n  const persistSnapshot = React.useCallback(async (snapshot) => {\n    try {\n      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));\n    } catch (error) {\n      if (__DEV__) console.warn('Persist snapshot failed', error);\n    }\n    if (cloudSession) {\n      const now = Date.now();\n      if (now - lastCloudSyncRef.current > CLOUD_SYNC_INTERVAL_MS) {\n        lastCloudSyncRef.current = now;\n        upsertCloudProgress(snapshot).catch(() => {});\n      }\n    }\n  }, [cloudSession]);\n\n  const scheduleSave = React.useCallback((snapshot) => {\n    if (lastSaveTimeoutRef.current) clearTimeout(lastSaveTimeoutRef.current);\n    lastSaveTimeoutRef.current = setTimeout(() => {\n      lastSaveTimeoutRef.current = null;\n      persistSnapshot(snapshot || latestSnapshotRef.current);\n    }, 1200);\n  }, [persistSnapshot]);\n\n  const spawnFoodFlyer = React.useCallback(() => {\n    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;\n    const emoji = FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)];\n    const flyer = {\n      id,\n      opacity: new Animated.Value(1),\n      x: new Animated.Value((Math.random() - 0.5) * 40),\n      y: new Animated.Value(0),\n      scale: new Animated.Value(0.8),\n      emoji,\n    };\n    setFoodFlyers((prev) => [...prev.slice(-MAX_FOOD_FLYERS + 1), flyer]);\n    Animated.parallel([\n      Animated.timing(flyer.y, { toValue: -80 - Math.random() * 40, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),\n      Animated.timing(flyer.scale, { toValue: 1.2, duration: 600, useNativeDriver: true }),\n      Animated.timing(flyer.opacity, { toValue: 0, duration: 400, delay: 500, useNativeDriver: true }),\n    ]).start(() => {\n      setFoodFlyers((prev) => prev.filter((item) => item.id !== id));\n    });\n  }, []);\n\n  const spawnBubble = React.useCallback((point) => {\n    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;\n    const size = BUBBLE_SIZES[Math.floor(Math.random() * BUBBLE_SIZES.length)];\n    const bubble = {\n      id,\n      x: point.x,\n      y: point.y,\n      size,\n      opacity: new Animated.Value(0.8),\n      scale: new Animated.Value(0.6),\n    };\n    setWashBubbles((prev) => [...prev.slice(-MAX_BUBBLES + 1), bubble]);\n    Animated.parallel([\n      Animated.timing(bubble.scale, { toValue: 1.1, duration: 300, useNativeDriver: true }),\n      Animated.timing(bubble.opacity, { toValue: 0, duration: 400, delay: 260, useNativeDriver: true }),\n    ]).start(() => {\n      setWashBubbles((prev) => prev.filter((item) => item.id !== id));\n    });\n  }, []);\n\n  const finishWash = React.useCallback(() => {\n    soapActiveRef.current = false;\n    setIsWashing(false);\n    washCellsRef.current = new Set();\n    setClean((prev) => clampStat(prev + 35));\n    setFun((prev) => clampStat(prev + 8));\n    setCoins((prev) => prev + COIN_WASH);\n    setXp((prev) => prev + XP_WASH);\n    pushEmotion('wash', 1600);\n    bump();\n    showToast('Alles sauber!');\n    setTimeout(() => setWashBubbles([]), 200);\n  }, [bump, showToast, pushEmotion]);\n\n  const handleSoapDragStart = React.useCallback(() => {\n    if (clean >= 96) {\n      showToast('Schon sauber!');\n      return;\n    }\n    soapActiveRef.current = true;\n    washCellsRef.current = new Set();\n    setIsWashing(true);\n    setWashBubbles([]);\n    showToast('Waschen gestartet');\n  }, [clean, showToast]);\n\n  const handleSoapDragMove = React.useCallback((pageX, pageY) => {\n    if (!soapActiveRef.current) return;\n    const layout = petAreaLayoutRef.current;\n    const local = toLocalPoint(pageX, pageY, layout);\n    if (!local) return;\n    spawnBubble(local);\n    const col = Math.max(0, Math.min(WASH_COLS - 1, Math.floor((local.x / layout.width) * WASH_COLS)));\n    const row = Math.max(0, Math.min(WASH_ROWS - 1, Math.floor((local.y / layout.height) * WASH_ROWS)));\n    const key = `${row}:${col}`;\n    if (!washCellsRef.current.has(key)) {\n      washCellsRef.current.add(key);\n      const total = WASH_ROWS * WASH_COLS;\n      if (washCellsRef.current.size >= Math.ceil(total * WASH_TARGET_RATIO)) {\n        finishWash();\n      }\n    }\n  }, [spawnBubble, finishWash]);\n\n  const handleSoapDragEnd = React.useCallback(() => {\n    if (!soapActiveRef.current) {\n      setIsWashing(false);\n      return;\n    }\n    soapActiveRef.current = false;\n    setIsWashing(false);\n    washCellsRef.current = new Set();\n    setWashBubbles([]);\n    showToast('Waschen abgebrochen');\n  }, [showToast]);\n\n  const handlePetAreaLayout = React.useCallback(() => {\n    const node = petAreaRef.current;\n    if (!node || !node.measureInWindow) return;\n    node.measureInWindow((x, y, width, height) => {\n      petAreaLayoutRef.current = { x, y, width, height };\n    });\n  }, []);\n\n  const handleInteract = React.useCallback(({ x, y }) => {\n    const layout = petAreaLayoutRef.current;\n    if (!layout) return;\n    const result = handleTap(x, y, layout.width, layout.height);\n    if (!result) return;\n    setFun((prev) => clampStat(prev + (result.funDelta || 0)));\n    setXp((prev) => prev + Math.max(1, Math.floor(Math.random() * 3)));\n    pushEmotion(result.annoyed ? 'annoyed' : 'play', 1200);\n    bump();\n    if (result.text) showToast(result.text);\n  }, [bump, pushEmotion, showToast]);\n\n  const handleFeed = React.useCallback(() => {\n    setCoins((current) => {\n      if (current < FEED_COST) {\n        showToast('Nicht genug Coins');\n        return current;\n      }\n      const after = current - FEED_COST + COIN_FEED;\n      setHunger((prev) => clampStat(prev + 22));\n      setFun((prev) => clampStat(prev + 6));\n      setClean((prev) => clampStat(prev - 2));\n      setXp((prev) => prev + XP_FEED);\n      spawnFoodFlyer();\n      pushEmotion('eat', 1400);\n      bump();\n      showToast('Lecker!');\n      return Math.max(0, after);\n    });\n  }, [spawnFoodFlyer, pushEmotion, bump, showToast]);\n""")
