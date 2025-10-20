import React from 'react';
import { StyleSheet, View } from 'react-native';
import PetAvatarLottie from './PetAvatarLottie';
import { cloneEquipped, EMPTY_EQUIPPED } from '../lib/outfit';

const BASE_SIZE = 340;

export default function OutfitPreview({ species = 'seestern', equipped, size = BASE_SIZE }) {
  const data = cloneEquipped(equipped || EMPTY_EQUIPPED);
  const scale = size / BASE_SIZE;

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <View style={[styles.avatarWrap, { transform: [{ scale }] }]}>
        <PetAvatarLottie
          mood="idle"
          emotion="idle"
          isSleeping={false}
          isWashing={false}
          species={species}
          equipped={data}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
