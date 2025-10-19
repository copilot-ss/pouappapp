import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SHOP_CATEGORIES } from '../../data/shopItems';
import OutfitPreview from '../OutfitPreview';
import LottieView from '../LottieView';
import { EMPTY_EQUIPPED, cloneEquipped } from '../../lib/outfit';
import useShopAnimations from './useShopAnimations';

const VENDOR_DEFAULT_GREETING = 'Kalamar: Willkommen im Unterwasser-Shop! Schau dich um und sag Bescheid.';
const KALAMAR_ANIMATION = require('../../../assets/lottie/kalamar.json');
const DOOR_ANIMATION = require('../../../assets/lottie/door-open.json');
const FOOD_CART_ANIMATION = require('../../../assets/lottie/vendor-cart.json');
const BELL_SOUND = require('../../../assets/sounds/doorbell-329311.mp3');

let audioModulePromise;

async function getAudioModule() {
  if (!audioModulePromise) {
    audioModulePromise = import('expo-av')
      .then((mod) => mod?.Audio ?? null)
      .catch((error) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[ShopScreen] expo-av module unavailable', error);
        }
        return null;
      });
  }
  return audioModulePromise;
}

export default function ShopScreen({
  open,
  coins,
  onClose,
  onBuy,
  inventory = {},
  equipped = EMPTY_EQUIPPED,
  species = 'seestern',
  onEquip,
  onUnequip,
  soundEnabled = true,
}) {
  const [tab, setTab] = React.useState(SHOP_CATEGORIES[0]?.key ?? 'head');
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [vendorMessage, setVendorMessage] = React.useState(VENDOR_DEFAULT_GREETING);
  const [previewEquipped, setPreviewEquipped] = React.useState(() => cloneEquipped(equipped));
  const soundRef = React.useRef(null);

  const setVendorMessageWithContext = React.useCallback((text) => {
    setVendorMessage(text);
  }, []);

  const applyPreview = React.useCallback((item) => {
    if (!item) {
      setPreviewEquipped(cloneEquipped(equipped));
      return;
    }
    const next = cloneEquipped(equipped);
    if (item.slot) {
      next[item.slot] = item.id;
    }
    setPreviewEquipped(next);
  }, [equipped]);

  const playBell = React.useCallback(async () => {
    if (!soundEnabled) return;
    const Audio = await getAudioModule();
    if (!Audio || !Audio.Sound || typeof Audio.Sound.createAsync !== 'function') {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[ShopScreen] expo-av Sound API not available; skipping bell sound.');
      }
      return;
    }
    try {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(BELL_SOUND);
        soundRef.current = sound;
      } else if (soundRef.current.setPositionAsync) {
        await soundRef.current.setPositionAsync(0);
      }
      if (soundRef.current?.playAsync) {
        await soundRef.current.playAsync();
      }
    } catch (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[ShopScreen] Bell playback skipped', error);
      }
      if (error && typeof error.message === 'string' && error.message.includes('ExponentAV')) {
        audioModulePromise = Promise.resolve(null);
      }
    }
  }, [soundEnabled]);

  const {
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
    sheetPanHandlers,
    doorKey,
  } = useShopAnimations({ open, playBell });

  React.useEffect(() => {
    return () => {
      if (soundRef.current?.unloadAsync) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      soundRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setTab(SHOP_CATEGORIES[0]?.key ?? 'head');
    setSelectedItem(null);
    setVendorMessageWithContext(VENDOR_DEFAULT_GREETING);
  }, [open, setVendorMessageWithContext]);

  const updateVendorForItem = React.useCallback(
    (item) => {
      if (!item) {
        setVendorMessageWithContext('Kalamar: Such dir etwas Feines aus.');
        return;
      }
      const ownedCount = Number(inventory[item.id] || 0);
      if (ownedCount > 0) {
        setVendorMessageWithContext(`Kalamar: ${item.name}? Die gehoert dir schon.`);
        return;
      }
      if (coins < item.price) {
        const missing = item.price - coins;
        setVendorMessageWithContext(
          `Kalamar: ${item.name} kostet ${item.price} Muenzen. Dir fehlen ${missing}.`
        );
        return;
      }
      setVendorMessageWithContext(
        `Kalamar: ${item.name}? Ein guter Fang fuer ${item.price} Muenzen!`
      );
    },
    [coins, inventory, setVendorMessageWithContext]
  );

  const handleSelectItem = React.useCallback(
    (item) => {
      setSelectedItem(item);
      applyPreview(item);
      updateVendorForItem(item);
    },
    [applyPreview, updateVendorForItem]
  );

  const handleClearSelection = React.useCallback(() => {
    setSelectedItem(null);
    setVendorMessageWithContext('Kalamar: Schau dich weiter um, ich hab Zeit.');
    setPreviewEquipped(cloneEquipped(equipped));
  }, [equipped, setVendorMessageWithContext]);

  const handleVendorPurchase = React.useCallback(
    (itemOverride) => {
      const item = itemOverride || selectedItem;
      if (!item) {
        setVendorMessageWithContext('Kalamar: Zeig mir zuerst, was du willst.');
        return;
      }
      setSelectedItem(item);
      const ownedCount = Number(inventory[item.id] || 0);
      if (ownedCount > 0) {
        setVendorMessageWithContext(`Kalamar: ${item.name} hast du bereits im Netz.`);
        return;
      }
      if (coins < item.price) {
        const missing = item.price - coins;
        setVendorMessageWithContext(`Kalamar: Dir fehlen ${missing} Muenzen fuer ${item.name}.`);
        return;
      }
      const success = onBuy ? onBuy(item, { equip: true }) : false;
      if (success) {
        setSelectedItem(null);
        setPreviewEquipped(cloneEquipped(equipped));
        setVendorMessageWithContext(
          `Kalamar: ${item.name}? Glanzleistung! Viel Spass damit!`
        );
      } else {
        setVendorMessageWithContext('Kalamar: Huch, der Deal ist geplatzt. Versuch es nochmal.');
      }
    },
    [selectedItem, inventory, coins, onBuy, setVendorMessageWithContext]
  );

  React.useEffect(() => {
    if (!open) return;
    if (!selectedItem) return;
    updateVendorForItem(selectedItem);
  }, [coins, inventory, selectedItem, open, updateVendorForItem]);

  if (!open) return null;

  const category = SHOP_CATEGORIES.find((c) => c.key === tab) || SHOP_CATEGORIES[0];
  const items = category?.items ?? [];

  const selectedOwned = selectedItem ? Number(inventory[selectedItem.id] || 0) > 0 : false;
  const selectedPrice = selectedItem?.price ?? 0;
  const vendorButtonDisabled = !selectedItem || selectedOwned || coins < selectedPrice;
  const vendorButtonLabel = !selectedItem
    ? 'Artikel waehlen'
    : selectedOwned
      ? 'Schon im Besitz'
      : `Deal fuer ${selectedPrice} Muenzen`;
  const selectionText = selectedItem
    ? `Auswahl: ${selectedItem.name}${selectedOwned ? ' (Im Besitz)' : ` - ${selectedPrice} Muenzen`}`
    : 'Auswahl: nichts ausgewaehlt';

  return (
    <View style={styles.screen} pointerEvents="auto">
      <Animated.View pointerEvents={overlayPointerEvents} style={[styles.entranceOverlay, { opacity: flashOpacity }]} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.doorStage,
          { opacity: doorOpacity, transform: [{ scale: doorScale }] },
        ]}
      >
        <LottieView
          key={`door-${doorKey}`}
          source={DOOR_ANIMATION}
          autoPlay
          loop={false}
          resizeMode="cover"
          style={styles.doorLottie}
          onAnimationFinish={handleDoorFinish}
        />
      </Animated.View>

      <Animated.View style={[styles.headerWrap, { opacity: vendorOpacity }]}> 
        <View style={styles.header}>
          <Text style={styles.title}>Unterwasser-Shop</Text>
          <View style={styles.headerRight}>
            <Text style={styles.coins}>{String.fromCodePoint(0x1F4B0)} {coins}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Text style={styles.closeX}>{String.fromCodePoint(0x2715)}</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.vendorScene, { opacity: vendorOpacity, transform: [{ translateY: vendorLift }] }]}> 
        <LinearGradient
          colors={['#0F172A', '#15213A', '#111827']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.vendorBackdrop}
        >
          <View style={styles.vendorGlow} />
          <View style={styles.vendorAvatarWrap}>
            <LottieView source={FOOD_CART_ANIMATION} style={styles.vendorCartLottie} autoPlay loop />
            <View style={styles.vendorKalamarWrap}>
              <LottieView source={KALAMAR_ANIMATION} style={styles.vendorKalamarLottie} autoPlay loop />
            </View>
          </View>
          <View style={styles.vendorCounter} />
        </LinearGradient>
        <View style={styles.vendorDialogue}>
          <Text style={styles.vendorName}>Kalamar</Text>
          <Text style={styles.vendorSpeech}>{vendorMessage}</Text>
          <Text style={styles.vendorSelection}>{selectionText}</Text>
          <View style={styles.vendorActions}>
            <Pressable
              onPress={() => handleVendorPurchase()}
              hitSlop={6}
              disabled={vendorButtonDisabled}
              style={({ pressed }) => [
                styles.vendorBuyBtn,
                vendorButtonDisabled && styles.vendorBuyBtnDisabled,
                pressed && !vendorButtonDisabled && styles.vendorBuyBtnPressed,
              ]}
            >
              <Text style={styles.vendorBuyBtnText}>{vendorButtonLabel}</Text>
            </Pressable>
            <Pressable
              onPress={handleClearSelection}
              hitSlop={6}
              style={({ pressed }) => [
                styles.vendorSecondaryBtn,
                pressed && styles.vendorSecondaryBtnPressed,
              ]}
            >
              <Text style={styles.vendorSecondaryBtnText}>Weiter schauen</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
        {...sheetPanHandlers}
      > 
        <Pressable onPress={toggleSheet} hitSlop={12} style={styles.sheetHandlePressable}>
          <View style={styles.sheetHandle} />
        </Pressable>
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={sheetExpanded}
          nestedScrollEnabled
          bounces={false}
          decelerationRate="fast"
          overScrollMode="never"
        >
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Umkleide</Text>
            </View>
            <OutfitPreview species={species} equipped={previewEquipped} />
          </View>

          <View style={styles.tabs}>
            {SHOP_CATEGORIES.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => setTab(c.key)}
                style={({ pressed }) => [
                  styles.tab,
                  tab === c.key && styles.tabActive,
                  pressed && styles.tabPressed,
                ]}
                hitSlop={6}
              >
                <Text style={[styles.tabText, tab === c.key && styles.tabTextActive]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.grid}>
            {items.map((item) => {
              const ownedCount = Number(inventory[item.id] || 0);
              const owned = ownedCount > 0;
              const equippedNow = equipped[item.slot] === item.id;
              const canAfford = coins >= item.price;
              const iconChar = Number.isInteger(item.icon)
                ? String.fromCodePoint(item.icon)
                : typeof item.icon === 'string'
                  ? item.icon
                  : '?';
              const isSelected = selectedItem?.id === item.id;
              const disableBuy = owned || !canAfford;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelectItem(item)}
                  style={({ pressed }) => [
                    styles.itemCard,
                    equippedNow && styles.itemCardEquipped,
                    isSelected && styles.itemCardSelected,
                    pressed && styles.itemCardPressed,
                  ]}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemIcon}>{iconChar}</Text>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  </View>
                  <View style={styles.itemMeta}>
                    {ownedCount > 1 ? <Text style={styles.itemCount}>x{ownedCount}</Text> : null}
                    {equippedNow ? <Text style={styles.itemEquippedHint}>Angelegt</Text> : null}
                  </View>
                  <Text style={styles.itemPrice}>
                    {owned ? 'Im Besitz' : `${item.price} Muenzen`}
                  </Text>

                  <View style={styles.itemButtons}>
                    {owned ? (
                      <View style={styles.ownedBadge}>
                        <Text style={styles.ownedBadgeText}>Im Besitz</Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleVendorPurchase(item)}
                        hitSlop={6}
                        disabled={disableBuy}
                        style={({ pressed }) => [
                          styles.primaryBtn,
                          disableBuy && styles.btnDisabled,
                          pressed && !disableBuy && styles.primaryBtnPressed,
                        ]}
                      >
                        <Text style={styles.primaryBtnText}>Kaufen</Text>
                      </Pressable>
                    )}
                  </View>

                  {!owned && !canAfford ? (
                    <Text style={styles.itemWarning}>Zu wenig Muenzen</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'space-between',
    paddingTop: 32,
  },
  entranceOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 5,
  },
  doorStage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  doorLottie: { width: '100%', height: '100%' },
  headerWrap: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#F1F5F9' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coins: { fontSize: 14, color: '#FACC15', fontWeight: '700' },
  closeBtn: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.65)', borderWidth: 1, borderColor: 'rgba(248, 250, 252, 0.25)' },
  closeX: { fontSize: 26, color: '#F8FAFC', fontWeight: '900' },
  vendorScene: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    marginTop: -24,
    justifyContent: 'flex-start',
  },
  vendorBackdrop: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    overflow: 'hidden',
  },
  vendorGlow: {
    position: 'absolute',
    top: -80,
    left: -80,
    right: -80,
    height: 200,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 200,
    transform: [{ scale: 1.2 }],
  },
  vendorAvatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  vendorCartLottie: { width: 220, height: 220 },
  vendorKalamarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  vendorKalamarLottie: { width: 120, height: 120 },
  vendorCounter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  vendorDialogue: {
    marginTop: -44,
    marginHorizontal: 36,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  vendorName: { fontSize: 16, fontWeight: '700', color: '#1E1B4B' },
  vendorSpeech: { fontSize: 13, color: '#1F2937', lineHeight: 18 },
  vendorSelection: { fontSize: 12, color: '#475569' },
  vendorActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  vendorBuyBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  vendorBuyBtnPressed: {
    transform: [{ scale: 0.97 }],
  },
  vendorBuyBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  vendorBuyBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  vendorSecondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  vendorSecondaryBtnPressed: {
    backgroundColor: '#E0E7FF',
  },
  vendorSecondaryBtnText: { color: '#1E3A8A', fontSize: 12, fontWeight: '700' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  sheetHandlePressable: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 60,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#CBD5F5',
    marginBottom: 12,
  },
  sheetContent: {
    paddingBottom: 36,
    paddingHorizontal: 16,
    gap: 18,
  },
  previewCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  previewHeader: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: '#0F172A' },
  tabPressed: { transform: [{ scale: 0.97 }] },
  tabText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  tabTextActive: { color: '#FFFFFF' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  itemCard: {
    width: '47%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  itemCardEquipped: {
    borderColor: '#C084FC',
    backgroundColor: '#F5F3FF',
  },
  itemCardSelected: {
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  itemCardPressed: {
    transform: [{ scale: 0.97 }],
  },
  itemHeader: {
    alignItems: 'center',
    gap: 6,
  },
  itemIcon: { fontSize: 32 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 18,
  },
  itemCount: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  itemEquippedHint: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  itemPrice: { fontSize: 12, color: '#4B5563' },
  itemButtons: {
    marginTop: 8,
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: '#0EA5E9',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  primaryBtnPressed: {
    transform: [{ scale: 0.97 }],
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  btnDisabled: {
    opacity: 0.4,
  },
  ownedBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    width: '100%',
  },
  ownedBadgeText: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  itemWarning: { fontSize: 11, fontWeight: '600', color: '#DC2626', textAlign: 'center', marginTop: 6 },
});




