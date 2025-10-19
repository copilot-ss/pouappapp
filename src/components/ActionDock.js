import React from 'react';
import { Pressable, StyleSheet, Text, View, PanResponder, Image } from 'react-native';

const SOAP_ICON = require('../../assets/ui/soap.png');

function IconButton({ label, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => [
        styles.btn,
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      <Text style={styles.iconText}>{label}</Text>
    </Pressable>
  );
}

export default function ActionDock({
  isSleeping,
  isWashing,
  canAct,
  onFeed,
  onToggleSleep,
  feedDisabled,
  soapDisabled,
  onSoapDragStart,
  onSoapDragMove,
  onSoapDragEnd,
}) {
  const holdRef = React.useRef(null);
  const activeRef = React.useRef(false);
  const soapPan = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !soapDisabled,
        onMoveShouldSetPanResponder: () => !soapDisabled,
        onPanResponderGrant: () => {
          if (soapDisabled) return;
          activeRef.current = false;
          holdRef.current = setTimeout(() => {
            activeRef.current = true;
            onSoapDragStart && onSoapDragStart();
          }, 250);
        },
        onPanResponderMove: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          if (!activeRef.current) return;
          onSoapDragMove && onSoapDragMove(pageX, pageY);
        },
        onPanResponderRelease: () => {
          if (holdRef.current) clearTimeout(holdRef.current);
          if (activeRef.current) onSoapDragEnd && onSoapDragEnd();
          holdRef.current = null;
          activeRef.current = false;
        },
        onPanResponderTerminate: () => {
          if (holdRef.current) clearTimeout(holdRef.current);
          if (activeRef.current) onSoapDragEnd && onSoapDragEnd();
          holdRef.current = null;
          activeRef.current = false;
        },
      }),
    [soapDisabled, onSoapDragStart, onSoapDragMove, onSoapDragEnd]
  );

  const sleepLabel = isSleeping ? String.fromCodePoint(0x1F319) : String.fromCodePoint(0x2600);

  return (
    <View style={styles.dock} pointerEvents="box-none">
      <IconButton label={String.fromCodePoint(0x1F357)} onPress={onFeed} disabled={feedDisabled ?? !canAct} />
      <IconButton label={sleepLabel} onPress={onToggleSleep} />
      <View style={styles.soapWrap} {...soapPan.panHandlers}>
        <Image source={SOAP_ICON} style={styles.soapIcon} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    right: 12,
    bottom: 260, // above stats
    gap: 12,
    alignItems: 'center',
    zIndex: 30,
    elevation: 6,
  },
  btn: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 22, fontWeight: '600', color: '#111827' },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.8 },
  soapWrap: {
    width: 48,
    height: 48,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soapIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
});



