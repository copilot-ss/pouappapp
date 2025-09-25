import React from 'react';
import { StyleSheet, View } from 'react-native';
import PetAvatarLottie from './PetAvatarLottie';
import { cloneEquipped, EMPTY_EQUIPPED } from '../lib/outfit';

const SIZE = 340;

export default function OutfitPreview({ species = 'seestern', equipped }) {
  const data = cloneEquipped(equipped || EMPTY_EQUIPPED);

  return (
    <View style={styles.frame}>
      <PetAvatarLottie
        mood="idle"
        emotion="idle"
        isSleeping={false}
        isWashing={false}
        species={species}
        equipped={data}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
