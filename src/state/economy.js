// Simple inventory helpers without external deps

export function addToInventory(inventory, itemId, qty = 1) {
  const next = { ...(inventory || {}) };
  const current = Number(next[itemId] || 0);
  next[itemId] = current + qty;
  return next;
}

export function getCount(inventory, itemId) {
  return Number((inventory || {})[itemId] || 0);
}

export function listOwnedBy(items, inventory) {
  return items
    .map((it) => ({ ...it, count: getCount(inventory, it.id) }))
    .filter((it) => it.count > 0);
}

export function removeFromInventory(inventory, itemId, qty = 1) {
  const next = { ...(inventory || {}) };
  const current = Number(next[itemId] || 0);
  const after = Math.max(0, current - qty);
  if (after === 0) {
    delete next[itemId];
  } else {
    next[itemId] = after;
  }
  return next;
}
