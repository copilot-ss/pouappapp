import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_USER_KEY } from '../lib/constants';

function randomId() {
  // 16-char base36 id
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

function randomFriendCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  let s = '';
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function loadAccount() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_USER_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && obj.id && obj.code) return obj;
    }
  } catch {}
  return null;
}

export async function ensureAccount() {
  const existing = await loadAccount();
  if (existing) return existing;
  const fresh = { id: randomId(), name: '', code: randomFriendCode(), createdAt: Date.now() };
  try { await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(fresh)); } catch {}
  return fresh;
}

export async function saveAccount(patch) {
  const base = (await loadAccount()) || (await ensureAccount());
  const next = { ...base, ...patch, updatedAt: Date.now() };
  try { await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(next)); } catch {}
  return next;
}

