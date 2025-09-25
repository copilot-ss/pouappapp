import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { cloneEquipped, EMPTY_EQUIPPED } from '../lib/outfit';

const AVATAR_SIZE = 340;

const ZERO_OFFSET = { dx: 0, dy: 0 };

const SLOT_OFFSETS = {
  default: { head: ZERO_OFFSET, neck: ZERO_OFFSET, body: ZERO_OFFSET, back: ZERO_OFFSET, buddy: ZERO_OFFSET },
  pinguin: { head: { dx: 0, dy: -18 }, neck: { dx: 0, dy: -8 }, body: { dx: 0, dy: 6 }, back: { dx: 0, dy: 8 }, buddy: { dx: -24, dy: 10 } },
  schildkroete: { head: { dx: -90, dy: 28 }, neck: { dx: -42, dy: 12 }, body: { dx: 0, dy: 12 }, back: { dx: -18, dy: 10 }, buddy: { dx: -48, dy: 0 } },
  fisch: { head: { dx: 70, dy: 8 }, neck: { dx: 60, dy: 6 }, body: { dx: 46, dy: -4 }, back: { dx: 58, dy: -6 }, buddy: { dx: 36, dy: -12 } },
  seepferd: { head: { dx: 24, dy: -32 }, neck: { dx: 20, dy: -22 }, body: { dx: 10, dy: -6 }, back: { dx: 8, dy: -10 }, buddy: { dx: -18, dy: -28 } },
  delfin: { head: { dx: -60, dy: -12 }, neck: { dx: -36, dy: -2 }, body: { dx: -24, dy: -4 }, back: { dx: -30, dy: -6 }, buddy: { dx: -52, dy: -8 } },
  qualle: { head: { dx: 0, dy: -30 }, neck: { dx: 0, dy: -14 }, body: { dx: 0, dy: 18 }, back: { dx: 0, dy: 24 }, buddy: { dx: 12, dy: -12 } },
};

const ITEM_BASE_POSITIONS = {
  head_coral_crown: { slot: 'head', top: 34, left: 100 },
  head_bubble_helmet: { slot: 'head', top: 28, left: 70 },
  head_seaweed_band: { slot: 'head', top: 96, left: 95 },
  neck_pearl_chain: { slot: 'neck', top: 162, left: 80 },
  neck_star_brooch: { slot: 'neck', top: 168, left: 154 },
  neck_kelp_scarf: { slot: 'neck', top: 172, left: 95 },
  body_kelp_wrap: { slot: 'body', top: 200, left: 70 },
  body_coral_armor: { slot: 'body', top: 210, left: 80 },
  body_glow_belt: { slot: 'body', top: 240, left: 70 },
  back_shell_pack: { slot: 'back', top: 210, left: 220, clearRight: true },
  back_bubble_jet: { slot: 'back', top: 220, left: 214, clearRight: true },
  back_coral_cape: { slot: 'back', top: 202, left: 60 },
  buddy_mini_jelly: { slot: 'buddy', top: 122, left: 294, clearRight: true },
  buddy_glow_fish: { slot: 'buddy', top: 168, left: -34 },
  buddy_bubble_shrimp: { slot: 'buddy', top: 214, left: 298, clearRight: true },
};

function getPositionStyle(id, offsets) {
  const base = ITEM_BASE_POSITIONS[id];
  if (!base) return null;
  const slotOffset = offsets[base.slot] || ZERO_OFFSET;
  const style = { top: base.top + slotOffset.dy, left: base.left + slotOffset.dx };
  if (base.clearRight) style.right = null;
  if (base.clearLeft) style.left = null;
  return style;
}

export default function OutfitLayer({ equipped, species = 'seestern' }) {
  const data = cloneEquipped(equipped || EMPTY_EQUIPPED);
  const slotOffsets = SLOT_OFFSETS[species] || SLOT_OFFSETS.default;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {renderHead(data.head, slotOffsets)}
      {renderNeck(data.neck, slotOffsets)}
      {renderBody(data.body, slotOffsets)}
      {renderBack(data.back, slotOffsets)}
      {renderBuddy(data.buddy, slotOffsets)}
    </View>
  );
}

function renderHead(id, offsets) {
  switch (id) {
    case 'head_coral_crown':
      return (
        <View style={[styles.coralCrown, getPositionStyle('head_coral_crown', offsets)]}>
          <View style={[styles.coralSpike, { left: 12, backgroundColor: '#F97316' }]} />
          <View style={[styles.coralSpike, { left: 44, height: 40, backgroundColor: '#FB923C' }]} />
          <View style={[styles.coralSpike, { left: 76, height: 46, backgroundColor: '#F97316' }]} />
          <View style={[styles.coralSpike, { left: 108, height: 38, backgroundColor: '#F59E0B' }]} />
          <View style={styles.coralBand} />
        </View>
      );
    case 'head_bubble_helmet':
      return <View style={[styles.bubbleHelmet, getPositionStyle('head_bubble_helmet', offsets)]} />;
    case 'head_seaweed_band':
      return (
        <View style={[styles.seaweedBand, getPositionStyle('head_seaweed_band', offsets)]}>
          <View style={[styles.seaweedLeaf, { left: -14, transform: [{ rotate: '-24deg' }] }]} />
          <View style={[styles.seaweedLeaf, { right: -14, transform: [{ rotate: '24deg' }] }]} />
        </View>
      );
    default:
      return null;
  }
}

function renderNeck(id, offsets) {
  switch (id) {
    case 'neck_pearl_chain':
      return (
        <View style={[styles.pearlChain, getPositionStyle('neck_pearl_chain', offsets)]}>
          {PEARL_POINTS.map((left, idx) => (
            <View key={idx} style={[styles.pearlBead, { left }]} />
          ))}
        </View>
      );
    case 'neck_star_brooch':
      return (
        <View style={[styles.starBrooch, getPositionStyle('neck_star_brooch', offsets)]}>
          <Text style={styles.starBroochText}>{String.fromCodePoint(0x1F31F)}</Text>
        </View>
      );
    case 'neck_kelp_scarf':
      return (
        <View style={[styles.kelpScarf, getPositionStyle('neck_kelp_scarf', offsets)]}>
          <View style={[styles.scarfTail, { left: 8 }]} />
          <View style={[styles.scarfTail, { right: 12, transform: [{ rotate: '28deg' }] }]} />
        </View>
      );
    default:
      return null;
  }
}

function renderBody(id, offsets) {
  switch (id) {
    case 'body_kelp_wrap':
      return <View style={[styles.kelpWrap, getPositionStyle('body_kelp_wrap', offsets)]} />;
    case 'body_coral_armor':
      return (
        <View style={[styles.coralArmor, getPositionStyle('body_coral_armor', offsets)]}>
          <View style={[styles.coralPlate, { top: 26 }]} />
          <View style={[styles.coralPlate, { top: 84, transform: [{ scaleX: 0.88 }] }]} />
        </View>
      );
    case 'body_glow_belt':
      return <View style={[styles.glowBelt, getPositionStyle('body_glow_belt', offsets)]} />;
    default:
      return null;
  }
}

function renderBack(id, offsets) {
  switch (id) {
    case 'back_shell_pack':
      return (
        <View style={[styles.shellPack, getPositionStyle('back_shell_pack', offsets)]}>
          <View style={styles.shellSpiral} />
        </View>
      );
    case 'back_bubble_jet':
      return (
        <View style={[styles.bubbleJet, getPositionStyle('back_bubble_jet', offsets)]}>
          <View style={styles.jetBubbleLarge} />
          <View style={[styles.jetBubbleSmall, { top: 68, left: 6 }]} />
          <View style={[styles.jetBubbleSmall, { top: 86, left: 24 }]} />
        </View>
      );
    case 'back_coral_cape':
      return <View style={[styles.coralCape, getPositionStyle('back_coral_cape', offsets)]} />;
    default:
      return null;
  }
}

function renderBuddy(id, offsets) {
  switch (id) {
    case 'buddy_mini_jelly':
      return (
        <View style={[styles.jellyBuddy, getPositionStyle('buddy_mini_jelly', offsets)]}>
          <View style={styles.jellyBell} />
          <View style={[styles.jellyTentacle, { left: 6 }]} />
          <View style={[styles.jellyTentacle, { left: 18 }]} />
          <View style={[styles.jellyTentacle, { left: 30 }]} />
        </View>
      );
    case 'buddy_glow_fish':
      return (
        <View style={[styles.glowFish, getPositionStyle('buddy_glow_fish', offsets)]}>
          <View style={styles.glowFishTail} />
        </View>
      );
    case 'buddy_bubble_shrimp':
      return (
        <View style={[styles.shrimpBuddy, getPositionStyle('buddy_bubble_shrimp', offsets)]}>
          <View style={[styles.shrimpSegment, { top: 8 }]} />
          <View style={[styles.shrimpSegment, { top: 26, transform: [{ scaleX: 0.9 }] }]} />
          <View style={[styles.shrimpSegment, { top: 42, transform: [{ scaleX: 0.78 }] }]} />
        </View>
      );
    default:
      return null;
  }
}

const PEARL_POINTS = [18, 42, 66, 92, 116, 140];

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignSelf: 'center',
  },
  coralCrown: {
    position: 'absolute',
    top: 34,
    left: (AVATAR_SIZE - 140) / 2,
    width: 140,
    height: 60,
    alignItems: 'center',
  },
  coralBand: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    height: 14,
    borderRadius: 12,
    backgroundColor: '#FDE68A',
    borderWidth: 3,
    borderColor: '#F59E0B',
  },
  coralSpike: {
    position: 'absolute',
    bottom: 16,
    width: 20,
    height: 46,
    borderRadius: 10,
  },
  bubbleHelmet: {
    position: 'absolute',
    top: 28,
    left: (AVATAR_SIZE - 200) / 2,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: 'rgba(191,219,254,0.65)',
    backgroundColor: 'rgba(191,219,254,0.12)',
  },
  seaweedBand: {
    position: 'absolute',
    top: 96,
    left: (AVATAR_SIZE - 150) / 2,
    width: 150,
    height: 26,
    borderRadius: 22,
    backgroundColor: '#047857',
    borderWidth: 3,
    borderColor: '#065F46',
  },
  seaweedLeaf: {
    position: 'absolute',
    top: -24,
    width: 36,
    height: 46,
    borderRadius: 18,
    backgroundColor: '#10B981',
  },
  pearlChain: {
    position: 'absolute',
    top: 162,
    left: (AVATAR_SIZE - 180) / 2,
    width: 180,
    height: 36,
  },
  pearlBead: {
    position: 'absolute',
    top: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E0F2FE',
  },
  starBrooch: {
    position: 'absolute',
    top: 168,
    left: AVATAR_SIZE / 2 - 16,
  },
  starBroochText: {
    fontSize: 28,
    color: '#FACC15',
  },
  kelpScarf: {
    position: 'absolute',
    top: 172,
    left: (AVATAR_SIZE - 150) / 2,
    width: 150,
    height: 34,
    borderRadius: 20,
    backgroundColor: '#0EA5E9',
    borderWidth: 3,
    borderColor: '#0284C7',
  },
  scarfTail: {
    position: 'absolute',
    bottom: -24,
    width: 24,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0284C7',
  },
  kelpWrap: {
    position: 'absolute',
    top: 200,
    left: (AVATAR_SIZE - 200) / 2,
    width: 200,
    height: 110,
    borderRadius: 90,
    backgroundColor: '#047857',
    borderWidth: 6,
    borderColor: '#065F46',
  },
  coralArmor: {
    position: 'absolute',
    top: 210,
    left: (AVATAR_SIZE - 180) / 2,
    width: 180,
    height: 120,
    borderRadius: 90,
    backgroundColor: '#F87171',
    borderWidth: 6,
    borderColor: '#B91C1C',
    overflow: 'hidden',
  },
  coralPlate: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 42,
    borderRadius: 30,
    backgroundColor: 'rgba(254,226,226,0.45)',
  },
  glowBelt: {
    position: 'absolute',
    top: 240,
    left: (AVATAR_SIZE - 200) / 2,
    width: 200,
    height: 28,
    borderRadius: 18,
    backgroundColor: 'rgba(244,114,182,0.8)',
    shadowColor: '#F472B6',
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  shellPack: {
    position: 'absolute',
    top: 210,
    right: 40,
    width: 80,
    height: 90,
    borderRadius: 50,
    backgroundColor: '#FDE68A',
    borderWidth: 5,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shellSpiral: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
  },
  bubbleJet: {
    position: 'absolute',
    top: 220,
    right: 52,
    width: 74,
    height: 112,
    borderRadius: 30,
    backgroundColor: 'rgba(59,130,246,0.45)',
    borderWidth: 4,
    borderColor: '#2563EB',
  },
  jetBubbleLarge: {
    position: 'absolute',
    bottom: -30,
    left: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(191,219,254,0.8)',
  },
  jetBubbleSmall: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(191,219,254,0.7)',
  },
  coralCape: {
    position: 'absolute',
    top: 202,
    left: (AVATAR_SIZE - 220) / 2,
    width: 220,
    height: 142,
    borderBottomLeftRadius: 120,
    borderBottomRightRadius: 120,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    backgroundColor: 'rgba(244,114,182,0.65)',
    borderWidth: 5,
    borderColor: 'rgba(236,72,153,0.85)',
  },
  jellyBuddy: {
    position: 'absolute',
    top: 122,
    right: -12,
    width: 58,
    height: 74,
    alignItems: 'center',
  },
  jellyBell: {
    width: 52,
    height: 46,
    borderRadius: 24,
    backgroundColor: 'rgba(167,139,250,0.9)',
    borderWidth: 3,
    borderColor: '#7C3AED',
  },
  jellyTentacle: {
    position: 'absolute',
    top: 44,
    width: 8,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#C4B5FD',
  },
  glowFish: {
    position: 'absolute',
    top: 168,
    left: -34,
    width: 76,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14,165,233,0.82)',
    borderWidth: 3,
    borderColor: '#38BDF8',
    justifyContent: 'center',
  },
  glowFishTail: {
    position: 'absolute',
    right: -26,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(125,211,252,0.8)',
  },
  shrimpBuddy: {
    position: 'absolute',
    top: 214,
    right: -18,
    width: 60,
    height: 74,
  },
  shrimpSegment: {
    position: 'absolute',
    left: 6,
    width: 48,
    height: 18,
    borderRadius: 12,
    backgroundColor: '#FB7185',
    borderWidth: 3,
    borderColor: '#F43F5E',
  },
});
