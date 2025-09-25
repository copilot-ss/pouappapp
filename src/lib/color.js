export function hslToHex(h, s, l) {
  // h [0..360], s & l [0..100]
  const s1 = Math.max(0, Math.min(100, s)) / 100;
  const l1 = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l1 - 1)) * s1;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (0 <= hp && hp < 1) { r = c; g = x; b = 0; }
  else if (1 <= hp && hp < 2) { r = x; g = c; b = 0; }
  else if (2 <= hp && hp < 3) { r = 0; g = c; b = x; }
  else if (3 <= hp && hp < 4) { r = 0; g = x; b = c; }
  else if (4 <= hp && hp < 5) { r = x; g = 0; b = c; }
  else if (5 <= hp && hp < 6) { r = c; g = 0; b = x; }
  const m = l1 - c / 2;
  const to255 = (v) => Math.round((v + m) * 255);
  const r255 = to255(r), g255 = to255(g), b255 = to255(b);
  return '#' + [r255, g255, b255].map((n) => n.toString(16).padStart(2, '0')).join('');
}

export function lerpHue(a, b, t) {
  // shortest-arc interpolation
  let d = (b - a + 540) % 360 - 180;
  return (a + d * t + 360) % 360;
}

