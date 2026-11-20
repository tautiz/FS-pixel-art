import { PixelCloud, PixelRect, RuneGlyph } from './sprites';

export const SCENE_768_WIDTH = 768;
export const SCENE_768_HEIGHT = 512;

export const SKY_BAND_COLORS_768: readonly string[] = [
  '#4B8AD4',
  '#5A98DE',
  '#6BA6E6',
  '#7CB3EC',
  '#8EC0F1',
  '#A1CCF5',
  '#B6D8F8',
  '#CAE3FA',
];

export const PIXEL_CLOUDS_768: readonly PixelCloud[] = [
  {
    id: 'cloud768-1',
    speed: 'slow',
    delay: '0s',
    rects: [
      { x: 96, y: 14, w: 28, h: 3, fill: '#FFFFFF' },
      { x: 84, y: 17, w: 50, h: 5, fill: '#FFFFFF' },
      { x: 74, y: 22, w: 68, h: 6, fill: '#F0F6FC' },
      { x: 68, y: 28, w: 78, h: 6, fill: '#DCEBF9' },
      { x: 76, y: 34, w: 60, h: 4, fill: '#BBD6F0' },
    ],
  },
  {
    id: 'cloud768-2',
    speed: 'slow',
    delay: '-26s',
    rects: [
      { x: 286, y: 8, w: 38, h: 4, fill: '#FFFFFF' },
      { x: 270, y: 12, w: 68, h: 6, fill: '#FFFFFF' },
      { x: 258, y: 18, w: 92, h: 6, fill: '#F0F6FC' },
      { x: 264, y: 24, w: 80, h: 5, fill: '#DCEBF9' },
      { x: 274, y: 29, w: 58, h: 3, fill: '#BBD6F0' },
    ],
  },
  {
    id: 'cloud768-3',
    speed: 'med',
    delay: '-6s',
    rects: [
      { x: 472, y: 40, w: 32, h: 4, fill: '#FFFFFF' },
      { x: 458, y: 44, w: 58, h: 5, fill: '#F0F6FC' },
      { x: 450, y: 49, w: 74, h: 6, fill: '#DCEBF9' },
      { x: 460, y: 55, w: 52, h: 4, fill: '#BBD6F0' },
    ],
  },
  {
    id: 'cloud768-4',
    speed: 'slow',
    delay: '-22s',
    rects: [
      { x: 584, y: 6, w: 54, h: 5, fill: '#FFFFFF' },
      { x: 564, y: 11, w: 94, h: 7, fill: '#FFFFFF' },
      { x: 548, y: 18, w: 120, h: 8, fill: '#F0F6FC' },
      { x: 556, y: 26, w: 102, h: 6, fill: '#DCEBF9' },
      { x: 570, y: 32, w: 76, h: 4, fill: '#BBD6F0' },
    ],
  },
  {
    id: 'cloud768-5',
    speed: 'med',
    delay: '-15s',
    rects: [
      { x: 378, y: 46, w: 22, h: 3, fill: '#FFFFFF' },
      { x: 368, y: 49, w: 42, h: 4, fill: '#F0F6FC' },
      { x: 364, y: 53, w: 50, h: 4, fill: '#DCEBF9' },
      { x: 372, y: 57, w: 34, h: 3, fill: '#BBD6F0' },
    ],
  },
  {
    id: 'cloud768-6',
    speed: 'med',
    delay: '-2s',
    rects: [
      { x: 186, y: 48, w: 26, h: 3, fill: '#F0F6FC' },
      { x: 178, y: 51, w: 42, h: 4, fill: '#DCEBF9' },
      { x: 184, y: 55, w: 28, h: 3, fill: '#BBD6F0' },
    ],
  },
];

export interface CauldronDetail768 {
  readonly id: string;
  readonly clickX: number;
  readonly clickY: number;
  readonly brewColor: string;
  readonly brewHighlight: string;
  readonly simmerRects: readonly PixelRect[];
  readonly steamWisps: readonly { x: number; y: number; w: number; h: number; delay: string }[];
}

export const CAULDRONS_768: readonly CauldronDetail768[] = [
  {
    id: 'c768-back-left',
    clickX: 202,
    clickY: 322,
    brewColor: '#4CC99B',
    brewHighlight: '#9DF5D2',
    simmerRects: [
      { x: 196, y: 322, w: 11, h: 2, fill: '#4CC99B' },
      { x: 199, y: 322, w: 4, h: 1, fill: '#9DF5D2' },
      { x: 204, y: 323, w: 2, h: 1, fill: '#9DF5D2' },
    ],
    steamWisps: [
      { x: 198, y: 318, w: 4, h: 2, delay: '0s' },
      { x: 203, y: 314, w: 3, h: 2, delay: '-0.8s' },
      { x: 200, y: 310, w: 5, h: 2, delay: '-1.5s' },
      { x: 204, y: 306, w: 3, h: 2, delay: '-2.2s' },
      { x: 199, y: 302, w: 2, h: 2, delay: '-2.8s' },
    ],
  },
  {
    id: 'c768-front-left',
    clickX: 211,
    clickY: 366,
    brewColor: '#52D1A2',
    brewHighlight: '#B4FFE2',
    simmerRects: [
      { x: 202, y: 366, w: 16, h: 2, fill: '#52D1A2' },
      { x: 206, y: 366, w: 5, h: 1, fill: '#B4FFE2' },
      { x: 213, y: 367, w: 3, h: 1, fill: '#B4FFE2' },
    ],
    steamWisps: [
      { x: 205, y: 361, w: 5, h: 2, delay: '-0.3s' },
      { x: 212, y: 357, w: 4, h: 2, delay: '-1.0s' },
      { x: 208, y: 352, w: 6, h: 2, delay: '-1.7s' },
      { x: 214, y: 347, w: 3, h: 2, delay: '-2.4s' },
      { x: 207, y: 342, w: 4, h: 2, delay: '-3.0s' },
      { x: 211, y: 337, w: 2, h: 2, delay: '-0.6s' },
    ],
  },
  {
    id: 'c768-back-right',
    clickX: 522,
    clickY: 326,
    brewColor: '#E6A83A',
    brewHighlight: '#FFE699',
    simmerRects: [
      { x: 516, y: 326, w: 11, h: 2, fill: '#E6A83A' },
      { x: 519, y: 326, w: 4, h: 1, fill: '#FFE699' },
      { x: 524, y: 327, w: 2, h: 1, fill: '#FFE699' },
    ],
    steamWisps: [
      { x: 518, y: 321, w: 4, h: 2, delay: '-0.5s' },
      { x: 523, y: 317, w: 3, h: 2, delay: '-1.3s' },
      { x: 520, y: 312, w: 5, h: 2, delay: '-2.0s' },
      { x: 524, y: 307, w: 3, h: 2, delay: '-2.7s' },
      { x: 519, y: 303, w: 2, h: 2, delay: '-1.6s' },
    ],
  },
  {
    id: 'c768-front-right',
    clickX: 660,
    clickY: 368,
    brewColor: '#4CC99B',
    brewHighlight: '#A4F5D6',
    simmerRects: [
      { x: 651, y: 368, w: 18, h: 2, fill: '#4CC99B' },
      { x: 655, y: 368, w: 6, h: 1, fill: '#A4F5D6' },
      { x: 663, y: 369, w: 3, h: 1, fill: '#A4F5D6' },
    ],
    steamWisps: [
      { x: 654, y: 363, w: 5, h: 2, delay: '-0.2s' },
      { x: 662, y: 358, w: 4, h: 2, delay: '-0.9s' },
      { x: 658, y: 353, w: 6, h: 2, delay: '-1.6s' },
      { x: 664, y: 348, w: 3, h: 2, delay: '-2.3s' },
      { x: 656, y: 343, w: 4, h: 2, delay: '-2.9s' },
      { x: 661, y: 338, w: 2, h: 2, delay: '-1.2s' },
    ],
  },
];

export const SCONCES_768: readonly {
  readonly id: string;
  readonly delay: string;
  readonly halo: readonly PixelRect[];
  readonly flame: readonly PixelRect[];
}[] = [
  {
    id: 'sconce768-left',
    delay: '0s',
    halo: [
      { x: 658, y: 170, w: 16, h: 36, fill: '#D38D3D' },
      { x: 655, y: 176, w: 22, h: 24, fill: '#B86B32' },
    ],
    flame: [
      { x: 665, y: 174, w: 2, h: 4, fill: '#FF9E2C' },
      { x: 663, y: 178, w: 6, h: 12, fill: '#FFAA33' },
      { x: 664, y: 180, w: 4, h: 10, fill: '#FFF4B8' },
      { x: 665, y: 183, w: 2, h: 6, fill: '#FFFFFF' },
      { x: 664, y: 190, w: 4, h: 4, fill: '#E85A1A' },
    ],
  },
  {
    id: 'sconce768-right',
    delay: '-0.35s',
    halo: [
      { x: 742, y: 148, w: 16, h: 28, fill: '#D38D3D' },
      { x: 739, y: 152, w: 22, h: 20, fill: '#B86B32' },
    ],
    flame: [
      { x: 749, y: 151, w: 2, h: 3, fill: '#FF9E2C' },
      { x: 747, y: 154, w: 6, h: 10, fill: '#FFAA33' },
      { x: 748, y: 156, w: 4, h: 8, fill: '#FFF4B8' },
      { x: 749, y: 158, w: 2, h: 4, fill: '#FFFFFF' },
      { x: 748, y: 164, w: 4, h: 3, fill: '#E85A1A' },
    ],
  },
];

export const CANDLE_FLAMES_768: readonly { x: number; y: number; delay: string }[] = [
  { x: 477, y: 257, delay: '-0.1s' },
  { x: 488, y: 256, delay: '-0.45s' },
  { x: 497, y: 257, delay: '-0.7s' },
  { x: 505, y: 258, delay: '-0.25s' },
];

export const CARVED_RUNES_768: readonly RuneGlyph[] = [
  {
    id: 'rune768-1',
    delay: '0s',
    pixels: [
      { x: 254, y: 314, w: 2, h: 10 },
      { x: 256, y: 314, w: 4, h: 2 },
      { x: 256, y: 319, w: 3, h: 2 },
      { x: 254, y: 322, w: 5, h: 2 },
    ],
  },
  {
    id: 'rune768-2',
    delay: '-0.5s',
    pixels: [
      { x: 282, y: 314, w: 2, h: 10 },
      { x: 280, y: 317, w: 6, h: 2 },
      { x: 284, y: 321, w: 3, h: 2 },
    ],
  },
  {
    id: 'rune768-3',
    delay: '-1.0s',
    pixels: [
      { x: 308, y: 314, w: 2, h: 10 },
      { x: 310, y: 316, w: 3, h: 2 },
      { x: 312, y: 318, w: 2, h: 4 },
      { x: 310, y: 322, w: 3, h: 2 },
    ],
  },
  {
    id: 'rune768-4',
    delay: '-1.5s',
    pixels: [
      { x: 332, y: 314, w: 6, h: 2 },
      { x: 332, y: 316, w: 2, h: 8 },
      { x: 334, y: 319, w: 4, h: 2 },
    ],
  },
  {
    id: 'rune768-5',
    delay: '-2.0s',
    pixels: [
      { x: 255, y: 344, w: 2, h: 10 },
      { x: 253, y: 347, w: 6, h: 2 },
      { x: 253, y: 352, w: 5, h: 2 },
    ],
  },
  {
    id: 'rune768-6',
    delay: '-2.5s',
    pixels: [
      { x: 282, y: 344, w: 4, h: 2 },
      { x: 281, y: 346, w: 2, h: 6 },
      { x: 285, y: 346, w: 2, h: 6 },
      { x: 282, y: 352, w: 4, h: 2 },
    ],
  },
  {
    id: 'rune768-7',
    delay: '-0.8s',
    pixels: [
      { x: 309, y: 344, w: 5, h: 2 },
      { x: 311, y: 346, w: 2, h: 8 },
      { x: 309, y: 350, w: 5, h: 2 },
    ],
  },
  {
    id: 'rune768-8',
    delay: '-1.3s',
    pixels: [
      { x: 333, y: 344, w: 2, h: 10 },
      { x: 335, y: 346, w: 3, h: 2 },
      { x: 335, y: 350, w: 4, h: 2 },
    ],
  },
];

export const POTION_VIALS_768: readonly {
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly highlight: string;
  readonly delay: string;
}[] = [
  // Left test-tube rack (x: 286..312, y: 270..277)
  { x: 287, y: 271, color: '#E04F4F', highlight: '#FFAEAE', delay: '0s' },
  { x: 293, y: 271, color: '#52D1A2', highlight: '#B4FFE2', delay: '-0.4s' },
  { x: 299, y: 271, color: '#E8A838', highlight: '#FFE699', delay: '-0.9s' },
  { x: 305, y: 271, color: '#4B8FE2', highlight: '#B3D9FF', delay: '-1.3s' },
  { x: 310, y: 271, color: '#E04F4F', highlight: '#FFAEAE', delay: '-0.6s' },
  // Right test-tube rack (x: 350..376, y: 269..277)
  { x: 351, y: 270, color: '#52D1A2', highlight: '#B4FFE2', delay: '-0.2s' },
  { x: 357, y: 270, color: '#E04F4F', highlight: '#FFAEAE', delay: '-0.7s' },
  { x: 363, y: 270, color: '#4B8FE2', highlight: '#B3D9FF', delay: '-1.1s' },
  { x: 369, y: 270, color: '#E8A838', highlight: '#FFE699', delay: '-1.5s' },
  { x: 374, y: 270, color: '#52D1A2', highlight: '#B4FFE2', delay: '-0.5s' },
];

export const HANGING_KEYS_768: readonly {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly glint: string;
  readonly color: string;
  readonly delay: string;
}[] = [
  { id: 'key768-1', x: 372, y: 344, color: '#4B8E92', glint: '#A8F0F4', delay: '0s' },
  { id: 'key768-2', x: 384, y: 344, color: '#9BA5AD', glint: '#FFFFFF', delay: '-0.8s' },
  { id: 'key768-3', x: 396, y: 344, color: '#C89B42', glint: '#FFF0B3', delay: '-1.6s' },
  { id: 'key768-4', x: 408, y: 344, color: '#A86E3B', glint: '#F5C48E', delay: '-2.3s' },
  { id: 'key768-5', x: 419, y: 344, color: '#A84E4E', glint: '#F7A4A4', delay: '-3.1s' },
];

export const HERB_TUFTS_768: readonly {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color: string;
  readonly delay: string;
}[] = [
  { x: 78, y: 86, w: 6, h: 2, color: '#5B6E3A', delay: '0s' },
  { x: 102, y: 106, w: 6, h: 2, color: '#4F2B16', delay: '-1.1s' },
  { x: 78, y: 132, w: 6, h: 2, color: '#5B6E3A', delay: '-2.0s' },
  { x: 106, y: 152, w: 6, h: 2, color: '#6A3618', delay: '-0.6s' },
  { x: 78, y: 176, w: 6, h: 2, color: '#4E5E32', delay: '-2.8s' },
  { x: 110, y: 196, w: 6, h: 2, color: '#5B6E3A', delay: '-1.6s' },
];

export const DUST_MOTES_768: readonly {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly color: string;
  readonly delay: string;
}[] = [
  { x: 156, y: 104, size: 2, color: '#FFF6D6', delay: '0s' },
  { x: 212, y: 136, size: 2, color: '#FFE6A3', delay: '-1.1s' },
  { x: 274, y: 112, size: 2, color: '#DCEEFF', delay: '-2.3s' },
  { x: 332, y: 148, size: 2, color: '#FFE6A3', delay: '-0.6s' },
  { x: 396, y: 120, size: 2, color: '#FFF6D6', delay: '-3.4s' },
  { x: 458, y: 96, size: 2, color: '#DCEEFF', delay: '-1.9s' },
  { x: 524, y: 132, size: 2, color: '#FFF6D6', delay: '-2.8s' },
  { x: 568, y: 184, size: 2, color: '#DCEEFF', delay: '-4.2s' },
  { x: 552, y: 248, size: 2, color: '#FFF6D6', delay: '-0.9s' },
  { x: 590, y: 224, size: 2, color: '#FFE6A3', delay: '-3.1s' },
  { x: 246, y: 230, size: 2, color: '#FFE6A3', delay: '-2.2s' },
  { x: 374, y: 204, size: 2, color: '#FFF6D6', delay: '-4.7s' },
  { x: 438, y: 238, size: 2, color: '#FFE6A3', delay: '-1.5s' },
  { x: 148, y: 288, size: 2, color: '#FFE6A3', delay: '-3.9s' },
  { x: 326, y: 294, size: 2, color: '#FFF6D6', delay: '-2.6s' },
  { x: 618, y: 290, size: 2, color: '#FFE6A3', delay: '-0.3s' },
  { x: 184, y: 176, size: 1, color: '#FFF6D6', delay: '-1.7s' },
  { x: 298, y: 162, size: 1, color: '#DCEEFF', delay: '-3.3s' },
  { x: 422, y: 158, size: 1, color: '#FFE6A3', delay: '-2.1s' },
  { x: 504, y: 174, size: 1, color: '#DCEEFF', delay: '-0.8s' },
  { x: 544, y: 212, size: 1, color: '#FFF6D6', delay: '-4.0s' },
  { x: 268, y: 282, size: 1, color: '#FFE6A3', delay: '-2.9s' },
  { x: 472, y: 286, size: 1, color: '#FFF6D6', delay: '-1.4s' },
  { x: 580, y: 268, size: 1, color: '#DCEEFF', delay: '-3.6s' },
];
