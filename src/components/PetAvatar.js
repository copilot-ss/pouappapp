import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Easing } from 'react-native';

const SPECIES_MAP = {
  seestern: Starfish,
  pinguin: Penguin,
  schildkroete: Turtle,
  fisch: Fish,
  seepferd: Seahorse,
  delfin: Dolphin,
  qualle: Jellyfish,
};

export function useAvatarMotion(scaleRef) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const wobbleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    floatAnim.setValue(0);
    breatheAnim.setValue(0);
    wobbleAnim.setValue(0);

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: -1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    const wobbleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(wobbleAnim, {
          toValue: 1,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wobbleAnim, {
          toValue: -1,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    floatLoop.start();
    breatheLoop.start();
    wobbleLoop.start();

    return () => {
      floatLoop.stop();
      breatheLoop.stop();
      wobbleLoop.stop();
    };
  }, [floatAnim, breatheAnim, wobbleAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [8, -8],
  });

  const wobble = wobbleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-1.6deg', '1.6deg'],
  });

  const breatheScale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  const transforms = [];
  if (scaleRef) transforms.push({ scale: scaleRef });
  transforms.push({ scale: breatheScale });
  transforms.push({ translateY });
  transforms.push({ rotate: wobble });

  return {
    transforms,
    wiggleValue: wobbleAnim,
    floatValue: floatAnim,
    breatheValue: breatheAnim,
  };
}

function PetAvatar({ scaleRef, species = 'seestern', motion }) {
  const motionData = motion ?? useAvatarMotion(scaleRef);
  const { transforms, wiggleValue, floatValue, breatheValue } = motionData;

  const WrapperComponent = motion ? View : Animated.View;
  const wrapperStyle = motion ? styles.baseWrap : [styles.baseWrap, { transform: transforms }];
  const Renderer = SPECIES_MAP[species] || DefaultCritter;

  return (
    <WrapperComponent style={wrapperStyle} pointerEvents="none">
      <Renderer wiggleValue={wiggleValue} floatValue={floatValue} breatheValue={breatheValue} />
    </WrapperComponent>
  );
}
export default React.memo(PetAvatar);

function Starfish({ wiggleValue }) {
  const arms = [0, 72, 144, 216, 288];
  const armAmplitudes = [5, 3, 5, 3, 4];
  return (
    <View style={styles.starfishWrap}>
      {arms.map((deg, index) => {
        const transforms = [{ rotate: `${deg}deg` }];
        if (wiggleValue) {
          const amplitude = armAmplitudes[index % armAmplitudes.length];
          transforms.push({
            rotate: wiggleValue.interpolate({
              inputRange: [-1, 1],
              outputRange: [`-${amplitude}deg`, `${amplitude}deg`],
            }),
          });
        }
        return (
          <Animated.View
            key={deg}
            style={[styles.starfishArm, { transform: transforms }]}
          />
        );
      })}
      <View style={styles.starfishCore}>
        <View style={styles.starfishFace}>
          <View style={[styles.starfishEyeWhite, styles.starfishEyeLeft]}>
            <View style={styles.starfishEyePupil} />
          </View>
          <View style={[styles.starfishEyeWhite, styles.starfishEyeRight]}>
            <View style={styles.starfishEyePupil} />
          </View>
          <View style={[styles.starfishCheek, styles.starfishCheekLeft]} />
          <View style={[styles.starfishCheek, styles.starfishCheekRight]} />
          <View style={styles.starfishSmile} />
        </View>
      </View>
    </View>
  );
}
function Penguin() {
  return (
    <View style={styles.penguinWrap}>
      <View style={styles.penguinBody}>
        <View style={[styles.penguinFlipper, styles.penguinFlipperLeft]} />
        <View style={[styles.penguinFlipper, styles.penguinFlipperRight]} />
        <View style={styles.penguinBelly} />
        <View style={[styles.penguinEyeWhite, { left: 60 }]}>
          <View style={styles.penguinPupil} />
        </View>
        <View style={[styles.penguinEyeWhite, { right: 60 }]}>
          <View style={styles.penguinPupil} />
        </View>
        <View style={styles.penguinBeak} />
        <View style={[styles.penguinFoot, styles.penguinFootLeft]} />
        <View style={[styles.penguinFoot, styles.penguinFootRight]} />
      </View>
    </View>
  );
}
function Turtle() {
  return (
    <View style={styles.turtleWrap}>
      <View style={styles.turtleHead}>
        <View style={styles.turtleEyeWhite}>
          <View style={styles.turtleEyePupil} />
        </View>
      </View>
      <View style={styles.turtleShell}>
        <View style={styles.turtleShellPanel} />
        <View style={[styles.turtleStripe, { top: 42 }]} />
        <View style={[styles.turtleStripe, { top: 82 }]} />
        <View style={[styles.turtleStripe, { top: 122 }]} />
      </View>
      <View style={[styles.turtleLeg, styles.turtleLegFrontLeft]} />
      <View style={[styles.turtleLeg, styles.turtleLegFrontRight]} />
      <View style={[styles.turtleLeg, styles.turtleLegBackLeft]} />
      <View style={[styles.turtleLeg, styles.turtleLegBackRight]} />
      <View style={styles.turtleTail} />
    </View>
  );
}
function Fish() {
  return (
    <View style={styles.fishWrap}>
      <View style={styles.fishBody}>
        <View style={styles.fishPattern} />
        <View style={[styles.fishTail, styles.fishTailTop]} />
        <View style={[styles.fishTail, styles.fishTailBottom]} />
        <View style={[styles.fishFin, styles.fishFinTop]} />
        <View style={[styles.fishFin, styles.fishFinBottom]} />
        <View style={styles.fishEye}>
          <View style={styles.fishPupil} />
        </View>
        <View style={styles.fishCheek} />
      </View>
    </View>
  );
}
function Seahorse() {
  return (
    <View style={styles.seahorseWrap}>
      <View style={styles.seahorseHead}>
        <View style={styles.seahorseEye} />
        <View style={styles.seahorseSnout} />
      </View>
      <View style={styles.seahorseCore}>
        <View style={styles.seahorseBelly} />
      </View>
      <View style={styles.seahorseFin} />
      <View style={styles.seahorseTail} />
      <View style={styles.seahorseTailTip} />
    </View>
  );
}
function Dolphin() {
  return (
    <View style={styles.dolphinWrap}>
      <View style={styles.dolphinBody}>
        <View style={styles.dolphinBackFin} />
        <View style={styles.dolphinTail} />
        <View style={styles.dolphinSnout} />
        <View style={styles.dolphinEye} />
        <View style={[styles.dolphinFin, styles.dolphinFinBottom]} />
      </View>
    </View>
  );
}
function Jellyfish() {
  const tentacles = [-60, -20, 20, 60];
  return (
    <View style={styles.jellyWrap}>
      <View style={styles.jellyBell}>
        <View style={styles.jellyHighlight} />
        <View style={[styles.jellyEye, { left: 62 }]} />
        <View style={[styles.jellyEye, { right: 62 }]} />
        <View style={styles.jellySkirt} />
      </View>
      {tentacles.map((offset, index) => (
        <View
          key={index}
          style={[
            styles.jellyTentacle,
            { left: 110 + offset - 10, transform: [{ rotate: `${offset / 5}deg` }] },
          ]}
        />
      ))}
    </View>
  );
}
function DefaultCritter() {
  return (
    <View style={styles.defaultWrap}>
      <View style={styles.defaultBody} />
    </View>
  );
}
const styles = StyleSheet.create({
  baseWrap: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center' },
  starfishWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  starfishArm: { position: 'absolute', width: 42, height: 170, backgroundColor: '#F59E0B', borderRadius: 30 },
  starfishCore: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  starfishFace: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 },
  starfishEyeWhite: { position: 'absolute', top: 52, width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: 'rgba(249, 115, 22, 0.55)', alignItems: 'center', justifyContent: 'center' },
  starfishEyeLeft: { left: 32 },
  starfishEyeRight: { right: 32 },
  starfishEyePupil: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#0F172A' },
  starfishCheek: { position: 'absolute', bottom: 44, width: 30, height: 16, borderRadius: 14, backgroundColor: 'rgba(251, 146, 60, 0.55)' },
  starfishCheekLeft: { left: 20 },
  starfishCheekRight: { right: 20 },
  starfishSmile: { position: 'absolute', bottom: 42, width: 46, height: 24, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 4, borderColor: '#EA580C', borderTopWidth: 0, backgroundColor: 'transparent' },
  penguinWrap: { width: 220, height: 260, alignItems: 'center', justifyContent: 'center' },
  penguinBody: { width: 190, height: 240, backgroundColor: '#0F172A', borderRadius: 120, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 36, position: 'relative' },
  penguinBelly: { position: 'absolute', bottom: 36, width: 140, height: 170, borderRadius: 80, backgroundColor: '#F3F4F6' },
  penguinEyeWhite: { position: 'absolute', top: 86, width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  penguinPupil: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0F172A' },
  penguinBeak: { position: 'absolute', top: 136, width: 60, height: 32, borderRadius: 18, backgroundColor: '#F97316' },
  penguinFlipper: { position: 'absolute', top: 132, width: 70, height: 120, borderRadius: 60, backgroundColor: '#0F172A' },
  penguinFlipperLeft: { left: -14, transform: [{ rotate: '-14deg' }] },
  penguinFlipperRight: { right: -14, transform: [{ rotate: '14deg' }] },
  penguinFoot: { position: 'absolute', bottom: -18, width: 74, height: 34, borderRadius: 18, backgroundColor: '#FB923C' },
  penguinFootLeft: { left: 22 },
  penguinFootRight: { right: 22 },
  turtleWrap: { width: 260, height: 220, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  turtleShell: { width: 210, height: 170, backgroundColor: '#047857', borderRadius: 110, alignItems: 'center', justifyContent: 'center', borderWidth: 10, borderColor: '#065F46', position: 'relative' },
  turtleShellPanel: { width: 150, height: 120, borderRadius: 70, backgroundColor: '#059669', borderWidth: 6, borderColor: '#10B981' },
  turtleStripe: { position: 'absolute', width: 140, height: 10, borderRadius: 6, backgroundColor: '#34D399', left: 35 },
  turtleHead: { position: 'absolute', left: -70, top: 70, width: 80, height: 80, borderRadius: 40, backgroundColor: '#34D399', alignItems: 'center', justifyContent: 'center' },
  turtleEyeWhite: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ECFEFF', alignItems: 'center', justifyContent: 'center' },
  turtleEyePupil: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1E293B' },
  turtleLeg: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: '#34D399' },
  turtleLegFrontLeft: { top: 54, left: 20 },
  turtleLegFrontRight: { top: 54, right: 20 },
  turtleLegBackLeft: { bottom: 38, left: 30 },
  turtleLegBackRight: { bottom: 38, right: 30 },
  turtleTail: { position: 'absolute', right: -32, top: 110, width: 40, height: 24, borderRadius: 16, backgroundColor: '#34D399', transform: [{ rotate: '18deg' }] },
  fishWrap: { width: 260, height: 170, alignItems: 'center', justifyContent: 'center' },
  fishBody: { width: 210, height: 130, borderRadius: 90, backgroundColor: '#38BDF8', position: 'relative', alignItems: 'flex-end', justifyContent: 'center' },
  fishPattern: { position: 'absolute', right: 18, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.24)' },
  fishTail: { position: 'absolute', left: -46, width: 70, height: 70, borderRadius: 18, backgroundColor: '#0EA5E9' },
  fishTailTop: { top: 16, transform: [{ rotate: '-26deg' }] },
  fishTailBottom: { bottom: 16, transform: [{ rotate: '26deg' }] },
  fishFin: { position: 'absolute', width: 72, height: 46, borderRadius: 28, backgroundColor: '#0EA5E9' },
  fishFinTop: { top: -28, left: 88, transform: [{ rotate: '18deg' }] },
  fishFinBottom: { bottom: -28, left: 88, transform: [{ rotate: '-18deg' }] },
  fishEye: { position: 'absolute', right: 24, top: 44, width: 24, height: 24, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  fishPupil: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0F172A' },
  fishCheek: { position: 'absolute', right: 32, bottom: 42, width: 34, height: 22, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.32)' },
  seahorseWrap: { width: 200, height: 260, alignItems: 'center', justifyContent: 'flex-start', position: 'relative' },
  seahorseHead: { position: 'absolute', top: 0, left: 42, width: 120, height: 100, borderRadius: 60, backgroundColor: '#FB923C' },
  seahorseSnout: { position: 'absolute', right: -30, top: 36, width: 42, height: 26, borderRadius: 14, backgroundColor: '#FB923C' },
  seahorseEye: { position: 'absolute', right: 24, top: 32, width: 16, height: 16, borderRadius: 8, backgroundColor: '#1F2937' },
  seahorseCore: { position: 'absolute', top: 70, left: 42, width: 120, height: 160, backgroundColor: '#F97316', borderTopLeftRadius: 80, borderTopRightRadius: 50, borderBottomLeftRadius: 80, borderBottomRightRadius: 40 },
  seahorseBelly: { position: 'absolute', right: 6, top: 18, width: 72, height: 120, backgroundColor: '#FDBA74', borderTopLeftRadius: 70, borderBottomLeftRadius: 60, borderTopRightRadius: 32, borderBottomRightRadius: 20 },
  seahorseFin: { position: 'absolute', left: 4, top: 142, width: 80, height: 70, borderRadius: 40, backgroundColor: '#FDBA74', transform: [{ rotate: '-12deg' }] },
  seahorseTail: { position: 'absolute', bottom: -4, left: 94, width: 72, height: 72, borderRadius: 40, backgroundColor: '#F97316', transform: [{ rotate: '40deg' }] },
  seahorseTailTip: { position: 'absolute', bottom: -24, left: 114, width: 38, height: 38, borderRadius: 19, backgroundColor: '#FB923C' },
  dolphinWrap: { width: 260, height: 190, alignItems: 'center', justifyContent: 'center' },
  dolphinBody: { width: 220, height: 120, borderRadius: 80, backgroundColor: '#60A5FA', position: 'relative' },
  dolphinBackFin: { position: 'absolute', top: -42, left: 92, width: 72, height: 72, borderRadius: 40, backgroundColor: '#3B82F6', transform: [{ rotate: '22deg' }] },
  dolphinTail: { position: 'absolute', right: -60, top: 24, width: 84, height: 84, borderRadius: 26, backgroundColor: '#3B82F6', transform: [{ rotate: '36deg' }] },
  dolphinSnout: { position: 'absolute', left: -46, top: 44, width: 70, height: 36, borderRadius: 18, backgroundColor: '#60A5FA' },
  dolphinEye: { position: 'absolute', left: 24, top: 44, width: 20, height: 20, borderRadius: 10, backgroundColor: '#1D4ED8' },
  dolphinFin: { position: 'absolute', width: 74, height: 54, borderRadius: 30, backgroundColor: '#3B82F6' },
  dolphinFinBottom: { left: 90, bottom: -32, transform: [{ rotate: '-14deg' }] },
  jellyWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'flex-start', position: 'relative' },
  jellyBell: { marginTop: 12, width: 200, height: 150, borderTopLeftRadius: 110, borderTopRightRadius: 110, borderBottomLeftRadius: 90, borderBottomRightRadius: 90, backgroundColor: '#A855F7', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  jellyHighlight: { position: 'absolute', top: 32, width: 124, height: 62, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.25)' },
  jellyEye: { position: 'absolute', top: 86, width: 26, height: 26, borderRadius: 13, backgroundColor: '#312E81' },
  jellySkirt: { position: 'absolute', bottom: -24, width: 186, height: 44, borderRadius: 28, backgroundColor: '#C084FC' },
  jellyTentacle: { position: 'absolute', top: 150, width: 20, height: 110, borderRadius: 12, backgroundColor: '#C084FC' },
  defaultWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  defaultBody: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#FACC15' },
});
