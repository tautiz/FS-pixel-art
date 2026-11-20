export type AnimationLayerId =
  | 'clouds'
  | 'cauldrons'
  | 'lanterns'
  | 'runes'
  | 'potions'
  | 'herbsAndKeys'
  | 'motes';

export interface AnimationLayerMeta {
  readonly id: AnimationLayerId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly elementCount: string;
}

export const ANIMATION_LAYERS: readonly AnimationLayerMeta[] = [
  {
    id: 'clouds',
    label: 'Sky & Drifting Clouds',
    shortLabel: 'Clouds',
    description: 'Cumulus pixel clouds and distant birds gliding behind the ruined brick parapet.',
    elementCount: '5 clouds · 2 birds',
  },
  {
    id: 'cauldrons',
    label: 'Bubbling Cauldrons & Steam',
    shortLabel: 'Cauldrons',
    description: 'Four iron desk cauldrons simmering with emerald & amber brew and rising pixel steam.',
    elementCount: '4 cauldrons · 12 wisps',
  },
  {
    id: 'lanterns',
    label: 'Bookcase Sconces & Candles',
    shortLabel: 'Lanterns',
    description: 'Flickering flame tongues and warm amber pixel halos on the bookcase and workbench.',
    elementCount: '2 sconces · 3 candles',
  },
  {
    id: 'runes',
    label: 'Carved Cabinet Runes',
    shortLabel: 'Runes',
    description: 'Eight carved alchemical glyphs beneath the main counter pulsing in warm gold.',
    elementCount: '8 rune panels',
  },
  {
    id: 'potions',
    label: 'Test-Tube Potion Racks',
    shortLabel: 'Potions',
    description: 'Two workbench racks of ruby, emerald, sapphire, and amber vials with rising bubbles.',
    elementCount: '8 glowing vials',
  },
  {
    id: 'herbsAndKeys',
    label: 'Hanging Keys & Dried Herbs',
    shortLabel: 'Keys & Herbs',
    description: 'Five enchanted cabinet keys and left-wall dried herb bundles swaying gently in the breeze.',
    elementCount: '5 keys · 6 herb bundles',
  },
  {
    id: 'motes',
    label: 'Sunlit Dust Motes',
    shortLabel: 'Dust Motes',
    description: 'Golden daylight motes drifting through the open-air beams above the desks.',
    elementCount: '16 floating motes',
  },
];

export interface PixelRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly fill: string;
}

export interface PixelCloud {
  readonly id: string;
  readonly speed: 'slow' | 'med';
  readonly delay: string;
  readonly rects: readonly PixelRect[];
}

export const PIXEL_CLOUDS: readonly PixelCloud[] = [
  {
    id: 'cloud-1',
    speed: 'slow',
    delay: '0s',
    rects: [
      { x: 24, y: 4, w: 9, h: 1, fill: '#F6FAFF' },
      { x: 21, y: 5, w: 15, h: 2, fill: '#F6FAFF' },
      { x: 18, y: 7, w: 20, h: 2, fill: '#DCEBF9' },
      { x: 20, y: 9, w: 15, h: 1, fill: '#BBD6F0' },
    ],
  },
  {
    id: 'cloud-2',
    speed: 'slow',
    delay: '-26s',
    rects: [
      { x: 74, y: 2, w: 12, h: 1, fill: '#F6FAFF' },
      { x: 70, y: 3, w: 20, h: 2, fill: '#F6FAFF' },
      { x: 67, y: 5, w: 26, h: 2, fill: '#DCEBF9' },
      { x: 69, y: 7, w: 21, h: 1, fill: '#BBD6F0' },
    ],
  },
  {
    id: 'cloud-3',
    speed: 'med',
    delay: '-7s',
    rects: [
      { x: 120, y: 11, w: 12, h: 2, fill: '#F6FAFF' },
      { x: 117, y: 13, w: 18, h: 2, fill: '#F6FAFF' },
      { x: 115, y: 15, w: 22, h: 2, fill: '#DCEBF9' },
      { x: 118, y: 17, w: 16, h: 1, fill: '#BBD6F0' },
    ],
  },
  {
    id: 'cloud-4',
    speed: 'slow',
    delay: '-31s',
    rects: [
      { x: 148, y: 1, w: 18, h: 2, fill: '#F6FAFF' },
      { x: 142, y: 3, w: 28, h: 3, fill: '#F6FAFF' },
      { x: 138, y: 6, w: 32, h: 2, fill: '#DCEBF9' },
      { x: 142, y: 8, w: 24, h: 1, fill: '#BBD6F0' },
    ],
  },
  {
    id: 'cloud-5',
    speed: 'med',
    delay: '-21s',
    rects: [
      { x: 98, y: 12, w: 8, h: 1, fill: '#F6FAFF' },
      { x: 95, y: 13, w: 13, h: 2, fill: '#DCEBF9' },
      { x: 97, y: 15, w: 9, h: 1, fill: '#BBD6F0' },
    ],
  },
];

export interface CauldronSprite {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly scale: 'sm' | 'lg';
  readonly brewColor: string;
  readonly brewHighlight: string;
  readonly body: readonly PixelRect[];
  readonly steam: readonly { x: number; y: number; delay: string; w: number }[];
}

export const CAULDRON_SPRITES: readonly CauldronSprite[] = [
  {
    id: 'cauldron-back-left',
    label: 'Back-left desk cauldron',
    x: 47,
    y: 80,
    scale: 'sm',
    brewColor: '#4CC99B',
    brewHighlight: '#96F0CA',
    body: [
      { x: 48, y: 81, w: 5, h: 1, fill: '#3A352F' },
      { x: 47, y: 82, w: 7, h: 1, fill: '#110F0A' },
      { x: 47, y: 83, w: 7, h: 2, fill: '#1A1713' },
      { x: 48, y: 83, w: 2, h: 1, fill: '#3A352F' },
      { x: 48, y: 85, w: 5, h: 1, fill: '#110F0A' },
      { x: 48, y: 86, w: 1, h: 1, fill: '#110F0A' },
      { x: 52, y: 86, w: 1, h: 1, fill: '#110F0A' },
    ],
    steam: [
      { x: 49, y: 79, delay: '0s', w: 2 },
      { x: 51, y: 78, delay: '-1.1s', w: 1 },
      { x: 50, y: 77, delay: '-2.2s', w: 2 },
    ],
  },
  {
    id: 'cauldron-front-left',
    label: 'Front-left desk cauldron',
    x: 48,
    y: 90,
    scale: 'lg',
    brewColor: '#52D1A2',
    brewHighlight: '#A4F5D6',
    body: [
      { x: 50, y: 91, w: 6, h: 1, fill: '#4A443C' },
      { x: 49, y: 92, w: 8, h: 1, fill: '#110F0A' },
      { x: 48, y: 93, w: 10, h: 3, fill: '#1A1713' },
      { x: 49, y: 93, w: 3, h: 1, fill: '#4A443C' },
      { x: 49, y: 94, w: 2, h: 1, fill: '#35312B' },
      { x: 49, y: 96, w: 8, h: 1, fill: '#110F0A' },
      { x: 50, y: 97, w: 6, h: 1, fill: '#110F0A' },
      { x: 50, y: 98, w: 1, h: 1, fill: '#110F0A' },
      { x: 53, y: 98, w: 1, h: 1, fill: '#110F0A' },
      { x: 55, y: 98, w: 1, h: 1, fill: '#110F0A' },
    ],
    steam: [
      { x: 51, y: 89, delay: '-0.4s', w: 2 },
      { x: 53, y: 88, delay: '-1.6s', w: 2 },
      { x: 52, y: 87, delay: '-2.6s', w: 1 },
    ],
  },
  {
    id: 'cauldron-back-right',
    label: 'Back-right desk cauldron',
    x: 128,
    y: 82,
    scale: 'sm',
    brewColor: '#E6A83A',
    brewHighlight: '#FFE08A',
    body: [
      { x: 129, y: 83, w: 5, h: 1, fill: '#3A352F' },
      { x: 128, y: 84, w: 7, h: 1, fill: '#110F0A' },
      { x: 128, y: 85, w: 7, h: 2, fill: '#1A1713' },
      { x: 129, y: 85, w: 2, h: 1, fill: '#3A352F' },
      { x: 129, y: 87, w: 5, h: 1, fill: '#110F0A' },
      { x: 129, y: 88, w: 1, h: 1, fill: '#110F0A' },
      { x: 133, y: 88, w: 1, h: 1, fill: '#110F0A' },
    ],
    steam: [
      { x: 130, y: 81, delay: '-0.8s', w: 2 },
      { x: 132, y: 80, delay: '-1.9s', w: 1 },
      { x: 131, y: 79, delay: '-2.9s', w: 2 },
    ],
  },
  {
    id: 'cauldron-front-right',
    label: 'Front-right desk cauldron',
    x: 162,
    y: 92,
    scale: 'lg',
    brewColor: '#4CC99B',
    brewHighlight: '#96F0CA',
    body: [
      { x: 164, y: 93, w: 6, h: 1, fill: '#4A443C' },
      { x: 163, y: 94, w: 8, h: 1, fill: '#110F0A' },
      { x: 162, y: 95, w: 10, h: 3, fill: '#1A1713' },
      { x: 163, y: 95, w: 3, h: 1, fill: '#4A443C' },
      { x: 163, y: 96, w: 2, h: 1, fill: '#35312B' },
      { x: 163, y: 98, w: 8, h: 1, fill: '#110F0A' },
      { x: 164, y: 99, w: 6, h: 1, fill: '#110F0A' },
      { x: 164, y: 100, w: 1, h: 1, fill: '#110F0A' },
      { x: 167, y: 100, w: 1, h: 1, fill: '#110F0A' },
      { x: 169, y: 100, w: 1, h: 1, fill: '#110F0A' },
    ],
    steam: [
      { x: 165, y: 91, delay: '-0.2s', w: 2 },
      { x: 167, y: 90, delay: '-1.4s', w: 2 },
      { x: 166, y: 89, delay: '-2.4s', w: 1 },
    ],
  },
];

export interface SconceSprite {
  readonly id: string;
  readonly halo: readonly PixelRect[];
  readonly flame: readonly PixelRect[];
  readonly delay: string;
}

export const SCONCE_SPRITES: readonly SconceSprite[] = [
  {
    id: 'sconce-left',
    delay: '0s',
    halo: [
      { x: 164, y: 42, w: 5, h: 11, fill: '#D38D3D' },
      { x: 163, y: 44, w: 7, h: 7, fill: '#B86B32' },
    ],
    flame: [
      { x: 166, y: 44, w: 1, h: 2, fill: '#FFAA33' },
      { x: 165, y: 46, w: 3, h: 4, fill: '#FFAA33' },
      { x: 166, y: 46, w: 2, h: 3, fill: '#FFF4B8' },
      { x: 166, y: 50, w: 1, h: 1, fill: '#E85A1A' },
    ],
  },
  {
    id: 'sconce-right',
    delay: '-0.35s',
    halo: [
      { x: 185, y: 37, w: 5, h: 8, fill: '#D38D3D' },
      { x: 184, y: 38, w: 6, h: 6, fill: '#B86B32' },
    ],
    flame: [
      { x: 187, y: 38, w: 1, h: 1, fill: '#FFAA33' },
      { x: 186, y: 39, w: 3, h: 3, fill: '#FFAA33' },
      { x: 187, y: 39, w: 1, h: 2, fill: '#FFF4B8' },
      { x: 187, y: 42, w: 1, h: 1, fill: '#E85A1A' },
    ],
  },
];

export const CANDLE_FLAMES: readonly { x: number; y: number; delay: string }[] = [
  { x: 119, y: 64, delay: '-0.1s' },
  { x: 122, y: 63, delay: '-0.45s' },
  { x: 125, y: 64, delay: '-0.7s' },
];

export interface RuneGlyph {
  readonly id: string;
  readonly delay: string;
  readonly pixels: readonly { x: number; y: number; w?: number; h?: number }[];
}

export const CARVED_RUNES: readonly RuneGlyph[] = [
  {
    id: 'rune-1',
    delay: '0s',
    pixels: [
      { x: 63, y: 78, w: 1, h: 3 },
      { x: 64, y: 78 },
      { x: 64, y: 80 },
    ],
  },
  {
    id: 'rune-2',
    delay: '-0.6s',
    pixels: [
      { x: 70, y: 78 },
      { x: 69, y: 79 },
      { x: 71, y: 79 },
      { x: 70, y: 80 },
    ],
  },
  {
    id: 'rune-3',
    delay: '-1.2s',
    pixels: [
      { x: 77, y: 78, w: 1, h: 3 },
      { x: 78, y: 79 },
      { x: 79, y: 78, w: 1, h: 2 },
    ],
  },
  {
    id: 'rune-4',
    delay: '-1.8s',
    pixels: [
      { x: 84, y: 78, w: 2, h: 1 },
      { x: 84, y: 79 },
      { x: 85, y: 80 },
    ],
  },
  {
    id: 'rune-5',
    delay: '-2.4s',
    pixels: [
      { x: 63, y: 85 },
      { x: 64, y: 86, w: 1, h: 2 },
      { x: 63, y: 87 },
    ],
  },
  {
    id: 'rune-6',
    delay: '-0.9s',
    pixels: [
      { x: 70, y: 85, w: 1, h: 3 },
      { x: 69, y: 86 },
      { x: 71, y: 86 },
    ],
  },
  {
    id: 'rune-7',
    delay: '-1.5s',
    pixels: [
      { x: 77, y: 85, w: 2, h: 1 },
      { x: 78, y: 86, w: 1, h: 2 },
    ],
  },
  {
    id: 'rune-8',
    delay: '-2.1s',
    pixels: [
      { x: 84, y: 85, w: 1, h: 3 },
      { x: 85, y: 86 },
    ],
  },
];

export interface PotionVial {
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly highlight: string;
  readonly delay: string;
}

export const POTION_VIALS: readonly PotionVial[] = [
  // Left rack (x: 72..78, y: 67..70)
  { x: 72, y: 68, color: '#E04F4F', highlight: '#FF9E9E', delay: '0s' },
  { x: 74, y: 68, color: '#52D1A2', highlight: '#B0FFE2', delay: '-0.5s' },
  { x: 76, y: 68, color: '#E8A838', highlight: '#FFE39E', delay: '-1.0s' },
  { x: 78, y: 68, color: '#4B8FE2', highlight: '#A8D2FF', delay: '-1.4s' },
  // Right rack (x: 88..94, y: 67..70)
  { x: 88, y: 67, color: '#52D1A2', highlight: '#B0FFE2', delay: '-0.3s' },
  { x: 90, y: 67, color: '#E04F4F', highlight: '#FF9E9E', delay: '-0.8s' },
  { x: 92, y: 67, color: '#4B8FE2', highlight: '#A8D2FF', delay: '-1.2s' },
  { x: 94, y: 67, color: '#E8A838', highlight: '#FFE39E', delay: '-1.6s' },
];

export interface HangingKey {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly glint: string;
  readonly delay: string;
}

export const HANGING_KEYS: readonly HangingKey[] = [
  { id: 'key-1', x: 92, y: 85, color: '#4B8E92', glint: '#8BD3D6', delay: '0s' },
  { id: 'key-2', x: 95, y: 85, color: '#9BA5AD', glint: '#DFE8F1', delay: '-0.8s' },
  { id: 'key-3', x: 98, y: 85, color: '#C89B42', glint: '#F2D27E', delay: '-1.6s' },
  { id: 'key-4', x: 101, y: 85, color: '#A86E3B', glint: '#DAA368', delay: '-2.3s' },
  { id: 'key-5', x: 104, y: 85, color: '#A84E4E', glint: '#DC8282', delay: '-3.1s' },
];

export const HERB_TUFTS: readonly { x: number; y: number; w: number; color: string; delay: string }[] = [
  { x: 20, y: 22, w: 3, color: '#5B6E3A', delay: '0s' },
  { x: 26, y: 27, w: 3, color: '#4F2B16', delay: '-1.2s' },
  { x: 20, y: 34, w: 3, color: '#5B6E3A', delay: '-2.1s' },
  { x: 27, y: 39, w: 3, color: '#6A3618', delay: '-0.7s' },
  { x: 20, y: 45, w: 3, color: '#4E5E32', delay: '-3.0s' },
  { x: 28, y: 50, w: 3, color: '#5B6E3A', delay: '-1.8s' },
];

export const DUST_MOTES: readonly { x: number; y: number; color: string; delay: string }[] = [
  { x: 42, y: 26, color: '#FFF6D6', delay: '0s' },
  { x: 58, y: 34, color: '#FFE6A3', delay: '-1.1s' },
  { x: 74, y: 28, color: '#DCEEFF', delay: '-2.3s' },
  { x: 89, y: 38, color: '#FFE6A3', delay: '-0.6s' },
  { x: 104, y: 31, color: '#FFF6D6', delay: '-3.4s' },
  { x: 118, y: 24, color: '#DCEEFF', delay: '-1.9s' },
  { x: 136, y: 33, color: '#FFF6D6', delay: '-2.8s' },
  { x: 146, y: 46, color: '#DCEEFF', delay: '-4.2s' },
  { x: 141, y: 62, color: '#FFF6D6', delay: '-0.9s' },
  { x: 150, y: 56, color: '#FFE6A3', delay: '-3.1s' },
  { x: 64, y: 58, color: '#FFE6A3', delay: '-2.2s' },
  { x: 96, y: 52, color: '#FFF6D6', delay: '-4.7s' },
  { x: 112, y: 60, color: '#FFE6A3', delay: '-1.5s' },
  { x: 38, y: 72, color: '#FFE6A3', delay: '-3.9s' },
  { x: 84, y: 74, color: '#FFF6D6', delay: '-2.6s' },
  { x: 158, y: 74, color: '#FFE6A3', delay: '-0.3s' },
];
