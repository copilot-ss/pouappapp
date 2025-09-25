export const EQUIP_SLOTS = ['head', 'neck', 'body', 'back', 'buddy'];

const base = {};
for (const slot of EQUIP_SLOTS) {
  base[slot] = null;
}

export const EMPTY_EQUIPPED = Object.freeze(base);

export function cloneEquipped(raw = {}) {
  const next = {};
  for (const slot of EQUIP_SLOTS) {
    const value = raw && typeof raw[slot] === 'string' ? raw[slot] : null;
    next[slot] = value;
  }
  return next;
}
