// Simple interaction logic: decide reaction based on tap location
export function getZone(x, y, w, h) {
  const nx = x / Math.max(1, w);
  const ny = y / Math.max(1, h);
  if (ny < 0.35) return 'head';
  if (ny > 0.7) return nx < 0.5 ? 'belly-left' : 'belly-right';
  return 'body';
}

export function reactToTap(zone) {
  // Returns { text, funDelta, annoyed }
  switch (zone) {
    case 'head':
      return Math.random() < 0.2
        ? { text: 'Hey, vorsichtig am Kopf!', funDelta: -2, annoyed: true }
        : { text: 'Mag die Kopftaps!', funDelta: +3, annoyed: false };
    case 'belly-left':
    case 'belly-right':
      return Math.random() < 0.6
        ? { text: 'Kitzel! 😆', funDelta: +5, annoyed: false }
        : { text: 'Hihi!', funDelta: +3, annoyed: false };
    default:
      return Math.random() < 0.15
        ? { text: 'Hmm, nicht da.', funDelta: -1, annoyed: true }
        : { text: 'Hallo! 😊', funDelta: +2, annoyed: false };
  }
}

export function handleTap(x, y, w, h) {
  const zone = getZone(x, y, w, h);
  return reactToTap(zone);
}

