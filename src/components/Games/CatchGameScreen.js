import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function CatchGameScreen({ open, onClose, onReward, hapticsEnabled = true }) {
  const [running, setRunning] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(20);
  const [score, setScore] = React.useState(0);
  const [areaW, setAreaW] = React.useState(0);
  const [areaH, setAreaH] = React.useState(0);
  const playAreaRef = React.useRef(null);
  const playBoundsRef = React.useRef({ x: 0, y: 0, width: 0, height: 0 });

  const itemsRef = React.useRef([]); // {id, x, y, emoji}
  const [items, setItems] = React.useState([]);

  const basketX = React.useRef(new Animated.Value(0)).current;
  const basketXRef = React.useRef(0);
  React.useEffect(() => {
    const sub = basketX.addListener(({ value }) => (basketXRef.current = value));
    return () => basketX.removeListener(sub);
  }, [basketX]);

  React.useEffect(() => {
    if (!open) {
      setRunning(false); setFinished(false); setTimeLeft(20); setScore(0);
      itemsRef.current = []; setItems([]);
      basketX.setValue(0);
      return;
    }
  }, [open, basketX]);

  React.useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) { setRunning(false); setFinished(true); try { (itemsRef.current || []).forEach((it) => it.y?.stopAnimation && it.y.stopAnimation()); } catch {} return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, timeLeft]);

  React.useEffect(() => {
    if (!running) return;
    let alive = true;
    let timer = null;
    const loop = () => {
      if (!alive) return;
      spawnItem();
      const elapsed = Math.max(0, 20 - timeLeft);
      const factor = 1 + elapsed * 0.06;
      const interval = Math.max(300, Math.floor(900 / factor));
      timer = setTimeout(loop, interval);
    };
    loop();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [running, areaW, timeLeft]);

  function start() {
    setFinished(false); setScore(0); setTimeLeft(20);
    itemsRef.current = []; setItems([]);
    const startX = Math.max(0, (areaW - 60) / 2);
    basketX.setValue(startX);
    setRunning(true);
  }

  function spawnItem() {
    if (areaW <= 0 || areaH <= 0) return;
    const emojiList = [0x1F34E, 0x1F355, 0x1F369, 0x1F354, 0x1F363];
    const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
    const id = `${Date.now()}-${Math.random()}`;
    const x = Math.random() * Math.max(1, areaW - 40);
    const y = new Animated.Value(-20);
    const item = { id, x, y, emoji };
    itemsRef.current = [...itemsRef.current, item];
    setItems(itemsRef.current.slice());

    const elapsed = Math.max(0, 20 - timeLeft);
    const factor = 1 + elapsed * 0.06;
    const duration = Math.max(700, Math.floor((2500 + Math.random() * 1200) / factor));
    Animated.timing(y, { toValue: areaH - 80, duration, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return; // interrupted
      // check catch
      const bx = basketXRef.current; // current basket translateX
      const catchZone = { left: bx, right: bx + 60 };
      if (x + 20 >= catchZone.left && x + 20 <= catchZone.right) {
        setScore((s) => s + 1);
        if (hapticsEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }
      // remove item
      itemsRef.current = itemsRef.current.filter((it) => it.id !== id);
      setItems(itemsRef.current.slice());
    });
  }

  const handleMoveTo = (pageX) => {
    if (!areaW || !running || finished) return;
    const bounds = playBoundsRef.current;
    const width = bounds.width || areaW;
    const relative = Math.max(0, Math.min(width, pageX - bounds.x));
    const target = Math.max(0, Math.min(areaW - 60, relative - 30));
    basketX.setValue(target);
  };

  if (!open) return null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Catch Game</Text>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeX}>{String.fromCodePoint(0x2715)}</Text>
        </Pressable>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.info}>Zeit: {timeLeft}s</Text>
        <Text style={styles.info}>Score: {score}</Text>
      </View>

      <View
        ref={playAreaRef}
        style={styles.play}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setAreaW(width);
          setAreaH(height);
          requestAnimationFrame(() => {
            try {
              playAreaRef.current?.measureInWindow?.((x, y) => {
                playBoundsRef.current = { x, y, width, height };
              });
            } catch {}
          });
        }}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => handleMoveTo(e.nativeEvent.pageX)}
        onResponderMove={(e) => handleMoveTo(e.nativeEvent.pageX)}
      >
        {items.map((it) => (
          <Animated.Text
            key={it.id}
            style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateX: it.x }, { translateY: it.y }], fontSize: 22 }}
          >
            {String.fromCodePoint(it.emoji)}
          </Animated.Text>
        ))}
        <Animated.View style={[styles.basket, { transform: [{ translateX: basketX }] }]}>
          <Text style={{ fontSize: 22 }}>{String.fromCodePoint(0x1F371)}</Text>
        </Animated.View>
      </View>

      <View style={styles.center}>
        {!running && !finished && (
          <Pressable style={styles.primaryBtn} onPress={start}>
            <Text style={styles.primaryText}>Start</Text>
          </Pressable>
        )}
        {finished && (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={styles.result}>Fertig! Score: {score}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable style={styles.secondaryBtn} onPress={() => { onReward && onReward(score); onClose && onClose(); }}>
                <Text style={styles.secondaryText}>Fertig</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={start}>
                <Text style={styles.primaryText}>Nochmal</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#fff', zIndex: 100, elevation: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  closeX: { fontSize: 28, color: '#111827', fontWeight: '900' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  info: { fontSize: 14, fontWeight: '600', color: '#111827' },
  play: { flex: 1, marginHorizontal: 16, marginTop: 10, borderRadius: 12, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  basket: { position: 'absolute', bottom: 40, width: 60, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB' },
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: '#111827', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  secondaryText: { color: '#111827', fontSize: 16, fontWeight: '700' },
});



