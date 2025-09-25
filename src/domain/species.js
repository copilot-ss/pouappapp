export const SPECIES = {
  seestern: { id: 'seestern', name: 'Seestern', emoji: String.fromCodePoint(0x2B50) /* ⭐ */ },
  schildkroete: { id: 'schildkroete', name: 'Schildkroete', emoji: String.fromCodePoint(0x1F422) /* 🐢 */ },
  pinguin: { id: 'pinguin', name: 'Pinguin', emoji: String.fromCodePoint(0x1F427) /* 🐧 */ },
  fisch: { id: 'fisch', name: 'Fisch', emoji: String.fromCodePoint(0x1F41F) /* 🐟 */ },
  seepferd: { id: 'seepferd', name: 'Seepferd', emoji: String.fromCodePoint(0x1F99C) /* 🐴? Seahorse emoji */ },
  delfin: { id: 'delfin', name: 'Delfin', emoji: String.fromCodePoint(0x1F42C) /* 🐬 */ },
  qualle: { id: 'qualle', name: 'Qualle', emoji: String.fromCodePoint(0x1FABC) /* 🪼 jellyfish */ },
};

export const SPECIES_ORDER = [
  'seestern',
  'schildkroete',
  'pinguin',
  'fisch',
  'seepferd',
  'delfin',
  'qualle',
];

export function getSpecies(id) {
  return SPECIES[id] || SPECIES['seestern'];
}
