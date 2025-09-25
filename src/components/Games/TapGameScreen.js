import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function TapGameScreen({ open, onClose, onReward, hapticsEnabled = true }) {
  const [running, setRunning] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(10);
  const [score, setScore] = React.useState(0);

  const progress = React.useRef(new Animated.Value(0)).current;
  const tapScale = React.useRef(new Animated.Value(1)).current;
  const scoreScale = React.useRef(new Animated.Value(1)).current;
  const resultOpacity = React.useRef(new Animated.Value(0)).current;
  const [barW, setBarW] = React.useState(0);

  const startRound = React.useCallback(() => {
    setFinished(false);
    setRunning(true);
    setTimeLeft(10);
    setScore(0);
    progress.stopAnimation();
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: false }).start(({ finished: ok }) => {
      if (ok) {
        setRunning(false);
        setFinished(true);
        setTimeLeft(0);
      }
    });
  }, [progress]);

  React.useEffect(() => {
    if (!open) return;
    setFinished(false);
    setRunning(false);
    setTimeLeft(10);
    setScore(0);
    progress.stopAnimation();
    progress.setValue(0);
    resultOpacity.setValue(0);
  }, [open, progress, resultOpacity]);

  React.useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      setRunning(false);
      setFinished(true);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, timeLeft]);

  React.useEffect(() => {
    if (finished) {
      Animated.timing(resultOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  }, [finished, resultOpacity]);

  if (!open) return null;

  const onTap = () => {
    if (!running) return;
    setScore((s) => s + 1);
    tapScale.stopAnimation();
    tapScale.setValue(0.92);
    Animated.spring(tapScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    scoreScale.stopAnimation();
    scoreScale.setValue(1.1);
    Animated.spring(scoreScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(1, barW)] });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Tap-Spiel</Text>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeX}>{String.fromCodePoint(0x2715)}</Text>
        </Pressable>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.info}>Zeit: {timeLeft}s</Text>
        <Animated.Text style={[styles.info, { transform: [{ scale: scoreScale }] }]}>Score: {score}</Animated.Text>
      </View>

      <View style={styles.progressWrap} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
        <View style={styles.progressTrack} />
        <Animated.View style={[styles.progressFill, { width: fillWidth }]} />
      </View>

      <View style={styles.center}>
        {!running && !finished && (
          <Pressable style={styles.primaryBtn} onPress={startRound}>
            <Text style={styles.primaryText}>Start</Text>
          </Pressable>
        )}
        {running && !finished && (
          <Animated.View style={{ transform: [{ scale: tapScale }] }}>
            <Pressable style={styles.tapArea} onPress={onTap}>
              <Text style={styles.tapText}>TAP!</Text>
            </Pressable>
          </Animated.View>
        )}
        {finished && (
          <Animated.View style={[styles.resultBox, { opacity: resultOpacity }] }>
            <Text style={styles.resultTitle}>Fertig!</Text>
            <Text style={styles.resultScore}>Score: {score}</Text>
            <View style={styles.row}>
              <Pressable style={styles.secondaryBtn} onPress={() => { onReward && onReward(score); onClose && onClose(); }}>
                <Text style={styles.secondaryText}>Fertig</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={startRound}>
                <Text style={styles.primaryText}>Nochmal</Text>
              </Pressable>
            </View>
          </Animated.View>
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
  progressWrap: { height: 10, marginHorizontal: 16, borderRadius: 6, overflow: 'hidden', backgroundColor: '#E5E7EB', position: 'relative' },
  progressTrack: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#10B981' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: '#111827', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  tapArea: { width: 200, height: 200, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  tapText: { fontSize: 32, fontWeight: '900', color: '#111827' },
  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  secondaryBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  secondaryText: { color: '#111827', fontSize: 16, fontWeight: '700' },
  resultBox: { alignItems: 'center', gap: 6 },
  resultTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  resultScore: { fontSize: 16, fontWeight: '700', color: '#111827' },
});

