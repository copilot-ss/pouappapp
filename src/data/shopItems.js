export const SHOP_CATEGORIES = [
  {
    key: 'head',
    label: 'Kopf',
    slot: 'head',
    items: [
      { id: 'head_coral_crown', slot: 'head', name: 'Korallenkrone', price: 42, icon: 0x1F33A },
      { id: 'head_bubble_helmet', slot: 'head', name: 'Blasenhelm', price: 48, icon: 0x1F52E },
      { id: 'head_seaweed_band', slot: 'head', name: 'Seetang-Stirnband', price: 30, icon: 0x1F343 },
    ],
  },
  {
    key: 'neck',
    label: 'Hals',
    slot: 'neck',
    items: [
      { id: 'neck_pearl_chain', slot: 'neck', name: 'Perlenkette', price: 34, icon: 0x1F4FF },
      { id: 'neck_star_brooch', slot: 'neck', name: 'Seestern-Brosche', price: 26, icon: 0x1F31F },
      { id: 'neck_kelp_scarf', slot: 'neck', name: 'Tang-Schal', price: 28, icon: 0x1F331 },
    ],
  },
  {
    key: 'body',
    label: 'Koerper',
    slot: 'body',
    items: [
      { id: 'body_kelp_wrap', slot: 'body', name: 'Seetang-Umhang', price: 36, icon: 0x1F30A },
      { id: 'body_coral_armor', slot: 'body', name: 'Korallenpanzer', price: 52, icon: 0x1F980 },
      { id: 'body_glow_belt', slot: 'body', name: 'Leuchtband', price: 32, icon: 0x1F4A1 },
    ],
  },
  {
    key: 'back',
    label: 'Ruecken',
    slot: 'back',
    items: [
      { id: 'back_shell_pack', slot: 'back', name: 'Muschel-Rucksack', price: 44, icon: 0x1F41A },
      { id: 'back_bubble_jet', slot: 'back', name: 'Blasen-Jet', price: 58, icon: 0x1F4A8 },
      { id: 'back_coral_cape', slot: 'back', name: 'Korallen-Cape', price: 40, icon: 0x1F9AA },
    ],
  },
  {
    key: 'buddy',
    label: 'Begleiter',
    slot: 'buddy',
    items: [
      { id: 'buddy_mini_jelly', slot: 'buddy', name: 'Mini-Qualle', price: 46, icon: 0x1F41E },
      { id: 'buddy_glow_fish', slot: 'buddy', name: 'Leuchtfisch', price: 54, icon: 0x1F41F },
      { id: 'buddy_bubble_shrimp', slot: 'buddy', name: 'Blasen-Garnele', price: 38, icon: 0x1F990 },
    ],
  },
];

export const ALL_SHOP_ITEMS = SHOP_CATEGORIES.flatMap((cat) => cat.items);

export const SHOP_ITEM_MAP = Object.fromEntries(ALL_SHOP_ITEMS.map((item) => [item.id, item]));

export function getItemById(id) {
  return SHOP_ITEM_MAP[id] || null;
}
