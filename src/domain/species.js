export const SPECIES = {
  seestern: { id: 'seestern', name: 'Seestern', emoji: String.fromCodePoint(0x2B50) /* â­ */ },
  schildkroete: { id: 'schildkroete', name: 'Schildkroete', emoji: String.fromCodePoint(0x1F422) /* ðŸ¢ */ },
  pinguin: { id: 'pinguin', name: 'Pinguin', emoji: String.fromCodePoint(0x1F427) /* ðŸ§ */ },
  fisch: { id: 'fisch', name: 'Fisch', emoji: String.fromCodePoint(0x1F41F) /* ðŸŸ */ },
  seepferd: { id: 'seepferd', name: 'Seepferd', emoji: String.fromCodePoint(0x1F99C) /* ðŸ´? Seahorse emoji */ },
  delfin: { id: 'delfin', name: 'Delfin', emoji: String.fromCodePoint(0x1F42C) /* ðŸ¬ */ },
  qualle: { id: 'qualle', name: 'Qualle', emoji: String.fromCodePoint(0x1FABC) /* ðŸª¼ jellyfish */ },
  krabbe: { id: 'krabbe', name: 'Krabbe', emoji: String.fromCodePoint(0x1F980) },};export const SPECIES_ORDER = [
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

