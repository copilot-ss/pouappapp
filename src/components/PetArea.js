import React from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import PetAvatarLottie from './PetAvatarLottie';
import OutfitPreview from './OutfitPreview';

const PetArea = React.forwardRef(function PetArea(
{
  mood,
  emotion,
  isSleeping,
  isWashing,
  onLayout,
  panHandlers,
  washBubbles = [],
  foodFlyers = [],
  toastOpacity,
  toastMessage,
  petScale,
  onInteract,
  species,
  equipped,
  visitor = null,
}, ref) {
  return (
    <View
      style={styles.root}
      ref={ref}
      onLayout={onLayout}
      pointerEvents={isWashing ? 'box-only' : 'auto'}
      {...(isWashing ? panHandlers : {})}
      onStartShouldSetResponder={() => !isWashing}
      onResponderRelease={(e) => {
        if (isWashing) return;
        const { locationX, locationY } = e.nativeEvent;
        onInteract && onInteract({ x: locationX, y: locationY });
      }}
    >
      <PetAvatarLottie mood={mood} emotion={emotion} isSleeping={isSleeping} isWashing={isWashing} scaleRef={petScale} species={species} equipped={equipped} />

      {visitor ? (
        <View pointerEvents="none" style={styles.visitorWrap}>
          <Text style={styles.visitorLabel}>{visitor.name ? `${visitor.name} ist zu Besuch` : 'Besuch'}</Text>
          <View style={styles.visitorPreview}>
            <OutfitPreview species={visitor.petType || 'seestern'} equipped={visitor.equipped || {}} />
          </View>
        </View>
      ) : null}

      {(washBubbles || []).map((b) => (
        <View
          key={b.id}
          pointerEvents="none"
          style={{ position: 'absolute', left: b.x - b.size / 2, top: b.y - b.size / 2, zIndex: 20, elevation: 6 }}
        >
          <Animated.View
            style={[
              styles.bubble,
              styles.bubbleCircle,
              {
                width: b.size,
                height: b.size,
                opacity: b.opacity,
                transform: [{ scale: b.scale }],
              },
            ]}
          />
        </View>
      ))}

      {(foodFlyers || []).map((f) => (
        <Animated.Text
          key={f.id}
          pointerEvents="none"
          style={[
            styles.food,
            { left: 0, top: 0, opacity: f.opacity, transform: [{ translateX: f.x }, { translateY: f.y }, { scale: f.scale }] },
          ]}
        >
          {String.fromCodePoint(f.emoji)}
        </Animated.Text>
      ))}

      <Animated.Text style={[styles.toast, { opacity: toastOpacity }]}>{toastMessage}</Animated.Text>
    </View>
  );
});

export default PetArea;

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  bubble: { position: 'absolute' },
  bubbleCircle: {
    borderRadius: 9999,
    backgroundColor: 'rgba(20,184,166,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.6)',
  },
  food: { position: 'absolute', zIndex: 25, elevation: 7, fontSize: 22 },
  visitorWrap: { position: 'absolute', bottom: -24, right: -36, alignItems: 'center', gap: 4, zIndex: 12 },
  visitorLabel: { backgroundColor: 'rgba(15,23,42,0.75)', color: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 11, fontWeight: '600' },
  visitorPreview: { transform: [{ scale: 0.5 }], alignItems: 'center', justifyContent: 'center' },
  toast: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
  },
});

