import React from 'react';
import { Platform, View, UIManager } from 'react-native';

// Cross-platform Lottie wrapper: web uses `lottie-react`, native uses `lottie-react-native`.
export default function LottieView({ source, style, autoPlay = true, loop = true }) {
  if (Platform.OS === 'web') {
    // Android-only project: render a placeholder on web builds
    return <View style={style} />;
  }

  // Native: fall back gracefully if the native view manager is not available (e.g., Expo Go)
  const hasNativeView = !!(
    UIManager?.getViewManagerConfig?.('LottieAnimationView') ||
    UIManager?.getViewManagerConfig?.('RNCAnimatedLottieView')
  );
  if (!hasNativeView) {
    // No native module present (likely Expo Go) → render nothing to avoid runtime error.
    return <View style={style} />;
  }

  try {
    const LottieNative = require('lottie-react-native').default || require('lottie-react-native');
    return <LottieNative source={source} autoPlay={autoPlay} loop={loop} style={style} />;
  } catch {
    // Safety net: if require fails for any reason, render empty placeholder
    return <View style={style} />;
  }
}
