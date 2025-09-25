import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export default function ReactionGameScreen({ open, onClose, onReward, hapticsEnabled = true }) {
  const [phase, setPhase] = React.useState('idle'); // idle|wait|go|done
  const [info, setInfo] = React.useState('');
  const [startAt, setStartAt] = React.useState(0);
  const [rt, setRt] = React.useState(null);
  const [early, setEarly] = React.useState(false);
  const [tooSlow, setTooSlow] = React.useState(false);

  const delayTimerRef = React.useRef(null);
  const lateTimerRef = React.useRef(null);
  const phaseRef = React.useRef('idle');
  const lastDelayRef = React.useRef(null);
  const padScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => { phaseRef.current = phase; }, [phase]);

  React.useEffect(() => {
    if (!open) {
      setPhase('idle');
      setInfo('');
      setStartAt(0);
      setRt(null);
      setEarly(false);
      setTooSlow(false);
      clearDelayTimer();
      clearLateTimer();
      return;
    }
  }, [open]);

  const getNextDelay = React.useCallback(() => {
    const min = 700;
    const max = 2600;
    let attempt = min + Math.random() * (max - min);
    const last = lastDelayRef.current;
    if (last != null && Math.abs(attempt - last) < 250) {
      attempt = min + Math.random() * (max - min);
    }
    lastDelayRef.current = attempt;
    return attempt;
  }, []);

  const clearDelayTimer = React.useCallback(() => {
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
  }, []);

  const clearLateTimer = React.useCallback(() => {
    if (lateTimerRef.current) {
      clearTimeout(lateTimerRef.current);
      lateTimerRef.current = null;
    }
  }, []);

  const start = () => {
    setRt(null);
    setEarly(false);
    setTooSlow(false);
    setPhase('wait');
    setInfo('Warte...');
    clearDelayTimer();
    clearLateTimer();
    const delay = getNextDelay();
    delayTimerRef.current = setTimeout(() => {
      setPhase('go');
      setInfo('JETZT!');
      setStartAt(Date.now());
      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      lateTimerRef.current = setTimeout(() => {
        if (phaseRef.current === 'go') {
          setTooSlow(true);
          setRt(1500);
          setPhase('done');
          setInfo('Zu langsam!');
          if (hapticsEnabled) {
            Haptics.selectionAsync().catch(() => {});
          }
        }
      }, 1500);
    }, delay);
  };

  const onTap = () => {
    if (phase === 'wait') {
      clearDelayTimer();
      clearLateTimer();
      setEarly(true);
      setPhase('idle');
      setInfo('Zu frueh! Nochmal.');
      if (hapticsEnabled) {
        Haptics.selectionAsync().catch(() => {});
      }
      return;
    }
    if (phase === 'go') {
      clearLateTimer();
      const t = Date.now() - startAt;
      setRt(t);
      setPhase('done');
      setInfo(`Reaktion: ${t} ms`);
      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    }
  };

  React.useEffect(() => {
    return () => {
      clearDelayTimer();
      clearLateTimer();
    };
  }, [clearDelayTimer, clearLateTimer]);

  // Score: 0..300 (fast = high). 1000ms -> 0, 0ms -> 300
  const score = rt != null ? Math.max(0, Math.floor(300 - (Math.min(1000, rt) / 1000) * 300)) : 0;

  // Visual pulse on GO
  React.useEffect(() => {
    if (!open || phase !== 'go') {
      padScale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(padScale, { toValue: 1.06, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(padScale, { toValue: 1.0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      padScale.setValue(1);
    };
  }, [open, phase, padScale]);

  if (!open) return null;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={["#EEF2FF", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <Text style={styles.title}>Reaktions-Test</Text>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeX}>{String.fromCodePoint(0x2715)}</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        {phase === 'idle' && (
          <View style={{ alignItems: 'center', gap: 16 }}>
            <Text style={styles.hint}>Tippe, sobald das Feld gruen wird. Nicht zu frueh!</Text>
            {early && <Text style={[styles.result, { color: '#EF4444' }]}>Zu frueh! Versuch es nochmal.</Text>}
            <Pressable style={styles.primaryBtn} onPress={start}>
              <Text style={styles.primaryText}>Start</Text>
            </Pressable>
          </View>
        )}
        {phase === 'wait' && (
          <Pressable style={[styles.pad, styles.padWait]} onPress={onTap}>
            <Text style={styles.padText}>{info}</Text>
          </Pressable>
        )}
        {phase === 'go' && (
          <Animated.View style={{ transform: [{ scale: padScale }] }}>
            <Pressable style={[styles.pad, styles.padGo]} onPress={onTap}>
              <Text style={[styles.padText, { color: '#fff' }]}>{info}</Text>
            </Pressable>
          </Animated.View>
        )}
        {phase === 'done' && (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={styles.card}>
              <Text style={styles.resultBig}>{tooSlow ? 'Zu langsam!' : `Reaktion: ${rt} ms`}</Text>
              <Text style={styles.result}>Score: {score}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => {
                  onReward && onReward(score);
                  onClose && onClose();
                }}
              >
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: '#111827', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  secondaryText: { color: '#111827', fontSize: 16, fontWeight: '700' },
  pad: { width: 260, height: 260, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  padWait: { backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#D1D5DB' },
  padGo: { backgroundColor: '#10B981', borderWidth: 2, borderColor: '#059669' },
  padText: { fontSize: 28, fontWeight: '900', color: '#111827' },
  result: { fontSize: 16, fontWeight: '700', color: '#111827' },
  resultBig: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center', gap: 4 },
  hint: { color: '#374151', fontSize: 14, textAlign: 'center', maxWidth: 280 },
});
