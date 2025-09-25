export const XP_BASE = 50; // XP needed for level 1 -> 2
export const XP_GROWTH = 25; // additional XP per level

export function xpForLevel(level) {
  // XP to go from current level to next level
  return XP_BASE + XP_GROWTH * Math.max(0, level - 1);
}

export function getLevelInfo(totalXp) {
  let xp = Math.max(0, Math.floor(totalXp || 0));
  let level = 1;
  let need = xpForLevel(level);
  while (xp >= need) {
    xp -= need;
    level += 1;
    need = xpForLevel(level);
  }
  const xpInLevel = xp;
  const nextLevelXp = need;
  const percent = nextLevelXp > 0 ? (xpInLevel / nextLevelXp) * 100 : 0;
  return { level, xpInLevel, nextLevelXp, percent };
}

