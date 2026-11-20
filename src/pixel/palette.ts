export interface PaletteSwatch {
  readonly hex: string;
  readonly name: string;
  readonly group: 'architecture' | 'timber' | 'sky' | 'alchemy';
}

export const SCENE_WIDTH = 192;
export const SCENE_HEIGHT = 128;

export const ROOM_PALETTE_NAMES: Record<string, { name: string; group: PaletteSwatch['group'] }> = {
  '#110F0A': { name: 'Obsidian Iron', group: 'architecture' },
  '#2B190E': { name: 'Dark Umber', group: 'timber' },
  '#4F2B16': { name: 'Aged Chestnut', group: 'timber' },
  '#72492C': { name: 'Walnut Desk', group: 'timber' },
  '#382417': { name: 'Espresso Beam', group: 'timber' },
  '#6A3618': { name: 'Kiln Terracotta', group: 'architecture' },
  '#8C542C': { name: 'Clay Brick', group: 'architecture' },
  '#5D311C': { name: 'Mahogany Brick', group: 'architecture' },
  '#4F3626': { name: 'Shadow Timber', group: 'timber' },
  '#8E725F': { name: 'Doorway Plaster', group: 'architecture' },
  '#CD8D4F': { name: 'Tapestry Gold', group: 'alchemy' },
  '#AD754A': { name: 'Sunlit Mortar', group: 'architecture' },
  '#AD6B34': { name: 'Amber Ochre', group: 'alchemy' },
  '#966338': { name: 'Honeyed Oak', group: 'timber' },
  '#2D2216': { name: 'Bookcase Charcoal', group: 'timber' },
  '#654428': { name: 'Saddle Plank', group: 'timber' },
  '#DAA368': { name: 'Sunlit Grain', group: 'timber' },
  '#AC8866': { name: 'Weathered Mortar', group: 'architecture' },
  '#934F1F': { name: 'Sconce Copper', group: 'alchemy' },
  '#706456': { name: 'Corridor Shadow', group: 'architecture' },
  '#906C4E': { name: 'Sandstone Midtone', group: 'architecture' },
  '#D4B392': { name: 'Limestone Parapet', group: 'architecture' },
  '#A19993': { name: 'Daylight Stucco', group: 'architecture' },
  '#E6CAA5': { name: 'Sunlit Limestone', group: 'architecture' },
  '#2F2B25': { name: 'Cast Iron', group: 'alchemy' },
  '#D38D3D': { name: 'Torchlight Amber', group: 'alchemy' },
  '#B86B32': { name: 'Burnished Brick', group: 'architecture' },
  '#34464E': { name: 'Deep Teal Binding', group: 'alchemy' },
  '#708798': { name: 'Silver Vial Glass', group: 'alchemy' },
  '#DFE8F1': { name: 'Daylight Glint', group: 'sky' },
  '#6F7984': { name: 'Pewter Key', group: 'alchemy' },
  '#8DB1D8': { name: 'Azure Binding', group: 'sky' },
  '#A2CBEF': { name: 'Cerulean Glass', group: 'sky' },
};

export const SKY_BAND_COLORS: readonly string[] = [
  '#4E8DD7',
  '#66A4E4',
  '#85BCF0',
  '#A8D3F7',
];

export const ANIMATION_ACCENT_SWATCHES: readonly PaletteSwatch[] = [
  { hex: '#FFF4B8', name: 'Candle Flame Core', group: 'alchemy' },
  { hex: '#FFAA33', name: 'Sconce Torchlight', group: 'alchemy' },
  { hex: '#52D1A2', name: 'Cauldron Simmer', group: 'alchemy' },
  { hex: '#E04F4F', name: 'Ruby Potion Vial', group: 'alchemy' },
  { hex: '#4B8FE2', name: 'Sapphire Potion Vial', group: 'alchemy' },
  { hex: '#F6FAFF', name: 'Cumulus Highlight', group: 'sky' },
];
