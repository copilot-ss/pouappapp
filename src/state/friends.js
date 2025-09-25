import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_FRIENDS_KEY } from '../lib/constants';

export async function loadFriends() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_FRIENDS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function saveFriends(list) {
  try { await AsyncStorage.setItem(STORAGE_FRIENDS_KEY, JSON.stringify(list)); } catch {}
}

export async function addFriend({ code, name }) {
  const list = await loadFriends();
  // Prevent duplicates by code (case-insensitive)
  const exists = list.some((f) => (f.code || '').toUpperCase() === (code || '').toUpperCase());
  if (exists) return list;
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    code: (code || '').toUpperCase().trim(),
    name: (name || '').trim(),
    addedAt: Date.now(),
  };
  const next = [item, ...list].slice(0, 100);
  await saveFriends(next);
  return next;
}

export async function removeFriend(id) {
  const list = await loadFriends();
  const next = list.filter((f) => f.id !== id);
  await saveFriends(next);
  return next;
}

