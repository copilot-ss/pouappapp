import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hslToHex, lerpHue } from '../lib/color';

function rainbowHueForLevel(level) {
  // base hues in rainbow order (6-step cycle)
  return ((level - 1) * 60) % 360; // 0,60,120,180,240,300, ...
}

function LevelHeader({ levelInfo, onPress }) {
  const { level, percent } = levelInfo || { level: 1, percent: 0 };
  const t = Math.max(0, Math.min(1, (percent || 0) / 100));
  const h0 = rainbowHueForLevel(level);
  const h1 = rainbowHueForLevel(level + 1);
  const h = lerpHue(h0, h1, t);
  const ringColor = hslToHex(h, 80, 55);
  const barColor = hslToHex(h, 80, 50);
  const ringWidth = 2 + Math.min(8, Math.floor(level / 5));
  const borderStyle = level >= 10 ? 'dashed' : 'solid';

  const content = (
    <>
      <View style={[styles.circle, { borderColor: ringColor, borderWidth: ringWidth, borderStyle }]}> 
        <Text style={styles.level}>{level}</Text>
      </View>
      <View style={styles.progressWrap}>
        <View style={styles.progressOuter}>
          <View style={[styles.progressInner, { width: `${Math.round(percent)}%`, backgroundColor: barColor }]} />
        </View>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={styles.wrap}
        hitSlop={12}
        android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: false }}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.wrap}>{content}</View>;
}
export default React.memo(LevelHeader);

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 4 },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  level: { color: '#F9FAFB', fontSize: 14, fontWeight: '800' },
  progressWrap: { width: 120 },
  progressOuter: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressInner: { height: 6, borderRadius: 4 },
});
