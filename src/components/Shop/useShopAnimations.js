import React from 'react';
import { Animated, Easing, PanResponder } from 'react-native';

const SHEET_COLLAPSED = 220;

export function useShopAnimations({ open, playBell }) {
  const [overlayPointerEvents, setOverlayPointerEvents] = React.useState('auto');
  const flashOpacity = React.useRef(new Animated.Value(0)).current;
  const doorOpacity = React.useRef(new Animated.Value(0)).current;
  const doorScale = React.useRef(new Animated.Value(1.08)).current;
  const vendorOpacity = React.useRef(new Animated.Value(0)).current;
  const vendorLift = React.useRef(new Animated.Value(18)).current;
  const sheetTranslateY = React.useRef(new Animated.Value(SHEET_COLLAPSED)).current;
  const [sheetExpanded, setSheetExpanded] = React.useState(false);
  const [doorKey, setDoorKey] = React.useState(0);

  const doorDoneRef = React.useRef(false);
  const doorFallbackRef = React.useRef(null);
  const sheetCurrentRef = React.useRef(SHEET_COLLAPSED);
  const sheetStartRef = React.useRef(SHEET_COLLAPSED);

  React.useEffect(() => {
    const id = sheetTranslateY.addListener(({ value }) => {
      sheetCurrentRef.current = value;
    });
    return () => {
      sheetTranslateY.removeListener(id);
    };
  }, [sheetTranslateY]);

  const clampSheetValue = React.useCallback(
    (value) => Math.max(0, Math.min(SHEET_COLLAPSED, value)),
    [],
  );

  const animateSheetTo = React.useCallback(
    (value) => {
      const target = clampSheetValue(value);
      Animated.spring(sheetTranslateY, {
        toValue: target,
        stiffness: 180,
        damping: 24,
        mass: 0.8,
        useNativeDriver: true,
      }).start(() => {
        setSheetExpanded(target === 0);
      });
    },
    [clampSheetValue, sheetTranslateY],
  );

  const toggleSheet = React.useCallback(() => {
    animateSheetTo(sheetExpanded ? SHEET_COLLAPSED : 0);
  }, [animateSheetTo, sheetExpanded]);

  const handleDoorFinish = React.useCallback(() => {
    if (doorDoneRef.current) return;
    doorDoneRef.current = true;
    if (doorFallbackRef.current) {
      clearTimeout(doorFallbackRef.current);
      doorFallbackRef.current = null;
    }
    animateSheetTo(SHEET_COLLAPSED);
    Animated.parallel([
      Animated.timing(doorOpacity, {
        toValue: 0,
        duration: 260,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(doorScale, {
        toValue: 1.02,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(90),
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: 620,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(140),
        Animated.timing(vendorOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(140),
        Animated.timing(vendorLift, {
          toValue: 0,
          duration: 460,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setOverlayPointerEvents('none');
    });
  }, [animateSheetTo, doorOpacity, doorScale, flashOpacity, vendorLift, vendorOpacity]);

  const sheetPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt, gesture) => {
          const vertical = Math.abs(gesture.dy) > Math.abs(gesture.dx);
          if (!vertical) return false;
          const localY = evt.nativeEvent.locationY;
          if (sheetExpanded) {
            return localY <= 80;
          }
          return localY <= 160;
        },
        onMoveShouldSetPanResponder: (evt, gesture) => {
          const vertical = Math.abs(gesture.dy) > Math.abs(gesture.dx);
          if (!vertical) return false;
          const localY = evt.nativeEvent.locationY;
          if (sheetExpanded) {
            return localY <= 80;
          }
          return localY <= 160;
        },
        onPanResponderGrant: () => {
          sheetTranslateY.stopAnimation((value) => {
            sheetStartRef.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const next = clampSheetValue(sheetStartRef.current + gesture.dy);
          sheetTranslateY.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const current = sheetCurrentRef.current;
          const velocity = gesture.vy;
          const threshold = SHEET_COLLAPSED * 0.5;
          let target = current <= threshold ? 0 : SHEET_COLLAPSED;
          if (velocity > 0.4) target = SHEET_COLLAPSED;
          if (velocity < -0.4) target = 0;
          animateSheetTo(target);
        },
        onPanResponderTerminate: (_, gesture) => {
          const current = sheetCurrentRef.current;
          const threshold = SHEET_COLLAPSED * 0.5;
          let target = current <= threshold ? 0 : SHEET_COLLAPSED;
          if (gesture.vy > 0.4) target = SHEET_COLLAPSED;
          if (gesture.vy < -0.4) target = 0;
          animateSheetTo(target);
        },
      }),
    [animateSheetTo, clampSheetValue, sheetExpanded, sheetTranslateY],
  );

  React.useEffect(() => {
    if (!open) {
      setOverlayPointerEvents('auto');
      flashOpacity.setValue(0);
      doorOpacity.setValue(0);
      doorScale.setValue(1.08);
      vendorOpacity.setValue(0);
      vendorLift.setValue(18);
      sheetTranslateY.setValue(SHEET_COLLAPSED);
      sheetCurrentRef.current = SHEET_COLLAPSED;
      sheetStartRef.current = SHEET_COLLAPSED;
      setSheetExpanded(false);
      doorDoneRef.current = false;
      if (doorFallbackRef.current) {
        clearTimeout(doorFallbackRef.current);
        doorFallbackRef.current = null;
      }
      return;
    }

    setOverlayPointerEvents('auto');
    flashOpacity.setValue(0);
    doorOpacity.setValue(0);
    doorScale.setValue(1.08);
    vendorOpacity.setValue(0);
    vendorLift.setValue(18);
    sheetTranslateY.setValue(SHEET_COLLAPSED);
    sheetCurrentRef.current = SHEET_COLLAPSED;
    sheetStartRef.current = SHEET_COLLAPSED;
    setSheetExpanded(false);
    doorDoneRef.current = false;
    setDoorKey((key) => key + 1);
    playBell();

    Animated.parallel([
      Animated.timing(doorOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(doorScale, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(flashOpacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    if (doorFallbackRef.current) {
      clearTimeout(doorFallbackRef.current);
    }
    doorFallbackRef.current = setTimeout(handleDoorFinish, 2200);

    return () => {
      if (doorFallbackRef.current) {
        clearTimeout(doorFallbackRef.current);
        doorFallbackRef.current = null;
      }
    };
  }, [open, playBell, flashOpacity, doorOpacity, doorScale, vendorOpacity, vendorLift, sheetTranslateY, handleDoorFinish]);

  return {
    overlayPointerEvents,
    flashOpacity,
    doorOpacity,
    doorScale,
    vendorOpacity,
    vendorLift,
    sheetTranslateY,
    sheetExpanded,
    toggleSheet,
    handleDoorFinish,
    sheetPanHandlers: sheetPanResponder.panHandlers,
    doorKey,
  };
}

export default useShopAnimations;
