import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SHOP_CATEGORIES } from '../../data/shopItems';
import OutfitPreview from '../OutfitPreview';
import { EMPTY_EQUIPPED } from '../../lib/outfit';

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
}) {
  const [tab, setTab] = React.useState(SHOP_CATEGORIES[0]?.key ?? 'head');

  React.useEffect(() => {
    if (!open) return;
    setTab(SHOP_CATEGORIES[0]?.key ?? 'head');
  }, [open]);

  if (!open) return null;

  const category = SHOP_CATEGORIES.find((c) => c.key === tab) || SHOP_CATEGORIES[0];
  const items = category?.items ?? [];

  const handleBuyPress = (item) => {
    if (onBuy) onBuy(item, { equip: true });
  };

  return (
    <View style={styles.screen} pointerEvents="auto">
      <View style={styles.header}>
        <Text style={styles.title}>Unterwasser-Shop</Text>
        <View style={styles.headerRight}>
          <Text style={styles.coins}>{String.fromCodePoint(0x1F4B0)} {coins}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeX}>{String.fromCodePoint(0x2715)}</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Umkleide</Text>
          </View>
          <OutfitPreview species={species} equipped={equipped} />
        </View>

        <View style={styles.tabs}>
          {SHOP_CATEGORIES.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => setTab(c.key)}
              style={[styles.tab, tab === c.key && styles.tabActive]}
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
            const iconChar = Number.isInteger(item.icon) ? iconChar : '?';

            return (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  equippedNow && styles.itemCardEquipped,
                ]}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.itemIcon}>{iconChar}</Text>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                </View>
                <View style={styles.itemMeta}>
                  {ownedCount > 1 ? <Text style={styles.itemCount}>x{ownedCount}</Text> : null}
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
                      onPress={() => handleBuyPress(item)}
                      hitSlop={6}
                      disabled={!canAfford}
                      style={[styles.primaryBtn, !canAfford && styles.btnDisabled]}
                    >
                      <Text style={styles.primaryBtnText}>Kaufen</Text>
                    </Pressable>
                  )}
                </View>

                {!owned && !canAfford ? (
                  <Text style={styles.itemWarning}>Zu wenig Muenzen</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coins: { fontSize: 14, color: '#111827', fontWeight: '700' },
  closeBtn: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  closeX: { fontSize: 28, color: '#111827', fontWeight: '900' },
  scrollContent: { paddingBottom: 32 },
  previewCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  previewHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: '#0F172A' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  tabTextActive: { color: '#FFFFFF' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  itemCard: {
    width: '46%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  itemCardEquipped: {
    borderColor: '#C084FC',
    backgroundColor: '#F5F3FF',
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
  primaryBtnActive: {
    backgroundColor: '#0F172A',
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
  },
  ownedBadgeText: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  itemWarning: { fontSize: 11, fontWeight: '600', color: '#DC2626', textAlign: 'center', marginTop: 6 },
});
