import React, { useEffect, useMemo, useRef } from "react";
import { Platform, UIManager, StyleSheet, Animated, Text } from "react-native";
import LottieView from "./LottieView";
import PetAvatar, { useAvatarMotion } from "./PetAvatar";
import OutfitLayer from "./OutfitLayer";

const AVATAR_SIZE = 340;

const LOTTIE_VARIANTS = {
  seestern: {
    idle: () => require("../../assets/starfish_idle.json"),
    happy: () => require("../../assets/starfish_cute.json"),
    base: () => require("../../assets/starfish_plain.json"),
    sleep: () => require("../../assets/starfish_idle.json"),
  },
  schildkroete: {
    idle: () => require("../../assets/schildkroete_idle.json"),
    happy: () => require("../../assets/schildkroete_idle.json"),
    base: () => require("../../assets/schildkroete_idle.json"),
    sleep: () => require("../../assets/schildkroete_idle.json"),
  },
  pinguin: {
    idle: () => require("../../assets/pinguin_idle.json"),
    happy: () => require("../../assets/pinguin_idle.json"),
    base: () => require("../../assets/pinguin_idle.json"),
    sleep: () => require("../../assets/pinguin_idle.json"),
  },
  fisch: {
    idle: () => require("../../assets/fisch_idle.json"),
    happy: () => require("../../assets/fisch_idle.json"),
    base: () => require("../../assets/fisch_idle.json"),
    sleep: () => require("../../assets/fisch_idle.json"),
  },
  seepferd: {
    idle: () => require("../../assets/seepferd_idle.json"),
    happy: () => require("../../assets/seepferd_idle.json"),
    base: () => require("../../assets/seepferd_idle.json"),
    sleep: () => require("../../assets/seepferd_idle.json"),
  },
  delfin: {
    idle: () => require("../../assets/delfin_idle.json"),
    happy: () => require("../../assets/delfin_idle.json"),
    base: () => require("../../assets/delfin_idle.json"),
    sleep: () => require("../../assets/delfin_idle.json"),
  },
  qualle: {
    idle: () => require("../../assets/qualle_idle.json"),
    happy: () => require("../../assets/qualle_idle.json"),
    base: () => require("../../assets/qualle_idle.json"),
    sleep: () => require("../../assets/qualle_idle.json"),
  },
  krabbe: {
    idle: () => require("../../assets/krabbe_idle.json"),
    happy: () => require("../../assets/krabbe_idle.json"),
    base: () => require("../../assets/krabbe_idle.json"),
    sleep: () => require("../../assets/krabbe_idle.json"),
  },
};

const DEFAULT_IDLE = () => require("../../assets/pet_idle.json");
const DEFAULT_VARIANTS = {
  idle: DEFAULT_IDLE,
  base: DEFAULT_IDLE,
  happy: DEFAULT_IDLE,
  sleep: DEFAULT_IDLE,
};

function hasNativeLottie() {
  try {
    return !!(
      UIManager?.getViewManagerConfig?.("LottieAnimationView") ||
      UIManager?.getViewManagerConfig?.("RNCAnimatedLottieView")
    );
  } catch {
    return false;
  }
}

export default function PetAvatarLottie({ mood, isSleeping, isWashing, scaleRef, emotion, species, equipped }) {
  const lottieSource = useMemo(() => {
    const variants = LOTTIE_VARIANTS[species] || {};
    const loaders = { ...DEFAULT_VARIANTS, ...variants };

    const sequence = [];
    if (isSleeping) sequence.push("sleep");
    if (emotion === "eat" || emotion === "play" || emotion === "tap") sequence.push("happy");
    sequence.push("idle", "base");

    for (const key of sequence) {
      const loader = loaders[key];
      if (!loader) continue;
      try {
        const asset = loader();
        if (asset) return asset;
      } catch {}
    }

    try {
      return DEFAULT_IDLE();
    } catch {
      return null;
    }
  }, [species, emotion, isSleeping]);

  const heartOpacity = useRef(new Animated.Value(0)).current;
  const heartY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (emotion === "eat" || emotion === "play" || emotion === "tap") {
      heartOpacity.stopAnimation();
      heartY.stopAnimation();
      heartOpacity.setValue(0);
      heartY.setValue(16);
      Animated.parallel([
        Animated.timing(heartOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(heartY, { toValue: -26, duration: 600, useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(heartOpacity, { toValue: 0, duration: 300, delay: 60, useNativeDriver: true }).start();
      });
    }
  }, [emotion, heartOpacity, heartY]);

  const motion = useAvatarMotion(scaleRef);
  const canUseLottie = Platform.OS !== "web" && hasNativeLottie() && !!lottieSource;

  const wrapperTransforms = canUseLottie ? (scaleRef ? [{ scale: scaleRef }] : []) : motion.transforms;

  const avatarNode = canUseLottie ? (
    <LottieView source={lottieSource} autoPlay loop style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }} />
  ) : (
    <PetAvatar species={species} motion={motion} />
  );

  return (
    <Animated.View style={[styles.wrap, wrapperTransforms.length ? { transform: wrapperTransforms } : null]} pointerEvents="none">
      {avatarNode}
      <OutfitLayer equipped={equipped} species={species} />
      <Animated.Text style={[styles.heart, { opacity: heartOpacity, transform: [{ translateY: heartY }] }]}>{String.fromCodePoint(0x2764)}</Animated.Text>
      {isSleeping ? (
        <Text style={styles.zzz}>Zzz</Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", width: AVATAR_SIZE, height: AVATAR_SIZE },
  heart: { position: "absolute", top: AVATAR_SIZE / 2 - 30, fontSize: 26, color: "#EF4444" },
  zzz: { position: "absolute", top: 28, right: 48, fontSize: 18, color: "#6B7280" },
});
