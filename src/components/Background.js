import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

export default function Background() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <ImageBackground
        source={require('../../assets/bg-ocean.png')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

