import React from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { SHOP_CATEGORIES } from '../../data/shopItems';
import { listOwnedBy } from '../../state/economy';
import OutfitPreview from '../OutfitPreview';
import { EMPTY_EQUIPPED } from '../../lib/outfit';

function InventoryScreen({
  open,
  inventory = {},
  equipped = EMPTY_EQUIPPED,
  onClose,
  onEquip,
  onUnequip,
  species = 'seestern',
}) {
  const [tab, setTab] = React.useState(SHOP_CATEGORIES[0]?.key ?? 'head');

  React.useEffect(() => {
    if (!open) return;
    setTab(SHOP_CATEGORIES[0]?.key ?? 'head');
  }, [open]);

  if (!open) return null;

  const category = React.useMemo(
    () => SHOP_CATEGORIES.find((c) => c.key === tab) || SHOP_CATEGORIES[0],
    [tab],
  );
  const itemsOwned = React.useMemo(
    () => listOwnedBy(category?.items ?? [], inventory),
    [category, inventory],
  );

  const handleToggle = React.useCallback((item) => {
    if (!item) return;
    const slot = item.slot;
    if (equipped[slot] === item.id) {
      onUnequip && onUnequip(slot);
    } else {
      onEquip && onEquip(slot, item.id);
    }
  }, [equipped, onEquip, onUnequip]);

  const handleUnequipSlot = React.useCallback((slot) => {
    onUnequip && onUnequip(slot);
  }, [onUnequip]);

  return (
    <View style={styles.screen} pointerEvents="auto">
      <View style={styles.header}>
        <Text style={styles.title}>Garderobe</Text>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeX}>{String.fromCodePoint(0x2715)}</Text>
        </Pressable>
      </View>
      <FlatList
        contentContainerStyle={styles.scrollContent}
        data={itemsOwned}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 6 }}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        getItemLayout={(_, index) => ({ length: 170, offset: 170 * index, index })}
        ListHeaderComponent={
          <>
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Aktueller Look</Text>
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
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Hier ist noch nichts. Schau im Shop vorbei!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const equippedNow = equipped[item.slot] === item.id;
          const iconChar = Number.isInteger(item.icon) ? String.fromCodePoint(item.icon) : '?';
          return (
            <Pressable
              onPress={() => handleToggle(item)}
              hitSlop={8}
              style={[styles.itemCard, equippedNow && styles.itemCardEquipped]}
            >
              <Text style={styles.itemIcon}>{iconChar}</Text>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              {item.count > 1 ? (
                <View style={styles.itemMeta}>
                  <Text style={styles.itemCount}>x{item.count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={styles.slotActions}>
            <Text style={styles.slotActionsLabel}>Schnell ablegen</Text>
            <View style={styles.slotActionRow}>
              {SHOP_CATEGORIES.map((cat) => (
                <Pressable key={cat.key} style={styles.slotChip} onPress={() => handleUnequipSlot(cat.slot)} hitSlop={6}>
                  <Text style={styles.slotChipText}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
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
    gap: 12,
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
    gap: 8,
  },
  itemCardEquipped: {
    borderColor: '#C084FC',
    backgroundColor: '#F5F3FF',
  },
  itemIcon: { fontSize: 32 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemCount: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  emptyState: {
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center' },
  slotActions: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  slotActionsLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  slotActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
  },
  slotChipText: { color: '#0369A1', fontWeight: '600', fontSize: 12 },
});

export default React.memo(InventoryScreen);
