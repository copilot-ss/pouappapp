import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'pou/settings/v1';

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { sound: true, haptics: true };
    const s = JSON.parse(raw);
    return { sound: s?.sound !== false, haptics: s?.haptics !== false };
  } catch {
    return { sound: true, haptics: true };
  }
}

export async function saveSettings(next) {
  const data = { sound: next?.sound !== false, haptics: next?.haptics !== false };
  try { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(data)); } catch {}
  return data;
}

