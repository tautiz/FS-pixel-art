export type TimeOfDay = 'day' | 'twilight' | 'moonlit';
export type TimeOfDayMode = 'auto' | 'cycle24' | TimeOfDay;

export const CYCLE_24_DURATION_SECONDS = 24;
export const MIN_CYCLE_DURATION_SECONDS = 6;
export const MAX_CYCLE_DURATION_SECONDS = 300;
export const CYCLE_DURATION_PRESETS = [12, 24, 48, 60, 120] as const;

export function clampCycleDuration(seconds: number): number {
  if (!Number.isFinite(seconds)) return CYCLE_24_DURATION_SECONDS;
  return Math.max(
    MIN_CYCLE_DURATION_SECONDS,
    Math.min(MAX_CYCLE_DURATION_SECONDS, Math.round(seconds)),
  );
}

export interface AtmosphereWeights {
  readonly day: number;
  readonly twilight: number;
  readonly moonlit: number;
}

/**
 * Maps the user's local system clock or virtual cycle hour to a TimeOfDay state:
 * - 07:00–16:59 -> 'day' (morning & business hours)
 * - 05:00–06:59 & 17:00–19:59 -> 'twilight' (dawn & evening sunset)
 * - 20:00–04:59 -> 'moonlit' (night)
 */
export function resolveTimeOfDayFromHour(hour: number): TimeOfDay {
  const normalized = ((Math.floor(hour) % 24) + 24) % 24;
  if (normalized >= 7 && normalized < 17) return 'day';
  if ((normalized >= 5 && normalized < 7) || (normalized >= 17 && normalized < 20)) {
    return 'twilight';
  }
  return 'moonlit';
}

export function resolveTimeOfDayFromDate(date: Date): TimeOfDay {
  return resolveTimeOfDayFromHour(date.getHours());
}

export function normalizeCycleSecond(
  second: number,
  durationSeconds: number = CYCLE_24_DURATION_SECONDS,
): number {
  const duration = clampCycleDuration(durationSeconds);
  const s = Math.floor(second);
  return ((s % duration) + duration) % duration;
}

export function cycleSecondToVirtualHour(
  cycleSecond: number,
  durationSeconds: number = CYCLE_24_DURATION_SECONDS,
): number {
  const duration = clampCycleDuration(durationSeconds);
  const normalized = normalizeCycleSecond(cycleSecond, duration);
  return (normalized / duration) * 24;
}

export function resolveTimeOfDayState(
  mode: TimeOfDayMode,
  now: Date = new Date(),
  cycleSecond = 0,
  durationSeconds: number = CYCLE_24_DURATION_SECONDS,
): TimeOfDay {
  if (mode === 'auto') {
    return resolveTimeOfDayFromDate(now);
  }
  if (mode === 'cycle24') {
    return resolveTimeOfDayFromHour(cycleSecondToVirtualHour(cycleSecond, durationSeconds));
  }
  return mode;
}

export function formatLocalClockShort(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatCycleClock(
  cycleSecond: number,
  durationSeconds: number = CYCLE_24_DURATION_SECONDS,
): string {
  const hourFloat = cycleSecondToVirtualHour(cycleSecond, durationSeconds);
  const totalMinutes = Math.round(hourFloat * 60) % (24 * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export interface TimeOfDayTheme {
  readonly id: TimeOfDay;
  readonly label: string;
  readonly subtitle: string;
  readonly skyBands192: readonly string[];
  readonly skyBands768: readonly string[];
  readonly cloudFills: {
    readonly top: string;
    readonly mid: string;
    readonly body: string;
    readonly shadow: string;
  };
  readonly birdColor: string;
  readonly steamColor: string;
  readonly motePalette: readonly [string, string, string];
  readonly haloOpacityBoost: number;
  readonly showStars: boolean;
  readonly showMoon: boolean;
}

export interface ResolvedSceneTheme extends TimeOfDayTheme {
  readonly weights: AtmosphereWeights;
  readonly starOpacity: number;
  readonly moonOpacity: number;
}

export const TIME_OF_DAY_THEMES: Record<TimeOfDay, TimeOfDayTheme> = {
  day: {
    id: 'day',
    label: 'Daylight',
    subtitle: 'Sunlit Daytime Study',
    skyBands192: ['#4E8DD7', '#66A4E4', '#85BCF0', '#A8D3F7'],
    skyBands768: [
      '#4B8AD4',
      '#5A98DE',
      '#6BA6E6',
      '#7CB3EC',
      '#8EC0F1',
      '#A1CCF5',
      '#B6D8F8',
      '#CAE3FA',
    ],
    cloudFills: {
      top: '#FFFFFF',
      mid: '#F0F6FC',
      body: '#DCEBF9',
      shadow: '#BBD6F0',
    },
    birdColor: '#324A53',
    steamColor: '#EAEEF5',
    motePalette: ['#FFF6D6', '#FFE6A3', '#DCEEFF'],
    haloOpacityBoost: 1,
    showStars: false,
    showMoon: false,
  },
  twilight: {
    id: 'twilight',
    label: 'Twilight',
    subtitle: 'Dusk Violet Study',
    skyBands192: ['#1B1E3D', '#2D2C58', '#4F406E', '#7C5476'],
    skyBands768: [
      '#171A36',
      '#212246',
      '#2E2D58',
      '#3D3665',
      '#4E3F6E',
      '#644973',
      '#7C5476',
      '#986377',
    ],
    cloudFills: {
      top: '#D4B2C4',
      mid: '#B590AD',
      body: '#8B6D92',
      shadow: '#5D4A6E',
    },
    birdColor: '#1E1D33',
    steamColor: '#B8B4D4',
    motePalette: ['#FFDCA8', '#D8B6FF', '#F2B89B'],
    haloOpacityBoost: 1.45,
    showStars: true,
    showMoon: false,
  },
  moonlit: {
    id: 'moonlit',
    label: 'Moonlit',
    subtitle: 'Cool Moonlit Study',
    skyBands192: ['#070C1C', '#0D1732', '#15254A', '#1F3663'],
    skyBands768: [
      '#060A18',
      '#091023',
      '#0D1730',
      '#12203E',
      '#17284B',
      '#1D325A',
      '#243D6A',
      '#2D4A7B',
    ],
    cloudFills: {
      top: '#607CA6',
      mid: '#48628A',
      body: '#33486B',
      shadow: '#20304C',
    },
    birdColor: '#0D1426',
    steamColor: '#9CB8DC',
    motePalette: ['#CFE6FF', '#99C4F5', '#FFE5A3'],
    haloOpacityBoost: 1.7,
    showStars: true,
    showMoon: true,
  },
};

const SOLAR_KEYFRAMES: readonly {
  readonly hour: number;
  readonly day: number;
  readonly twilight: number;
  readonly moonlit: number;
}[] = [
  { hour: 0, day: 0.0, twilight: 0.0, moonlit: 1.0 },
  { hour: 1, day: 0.0, twilight: 0.02, moonlit: 0.98 },
  { hour: 2, day: 0.0, twilight: 0.06, moonlit: 0.94 },
  { hour: 3, day: 0.0, twilight: 0.14, moonlit: 0.86 },
  { hour: 4, day: 0.0, twilight: 0.34, moonlit: 0.66 },
  { hour: 5, day: 0.08, twilight: 0.68, moonlit: 0.24 },
  { hour: 6, day: 0.32, twilight: 0.68, moonlit: 0.0 },
  { hour: 7, day: 0.68, twilight: 0.32, moonlit: 0.0 },
  { hour: 8, day: 0.85, twilight: 0.15, moonlit: 0.0 },
  { hour: 9, day: 0.93, twilight: 0.07, moonlit: 0.0 },
  { hour: 10, day: 0.97, twilight: 0.03, moonlit: 0.0 },
  { hour: 11, day: 0.99, twilight: 0.01, moonlit: 0.0 },
  { hour: 12, day: 1.0, twilight: 0.0, moonlit: 0.0 },
  { hour: 13, day: 0.98, twilight: 0.02, moonlit: 0.0 },
  { hour: 14, day: 0.94, twilight: 0.06, moonlit: 0.0 },
  { hour: 15, day: 0.86, twilight: 0.14, moonlit: 0.0 },
  { hour: 16, day: 0.70, twilight: 0.30, moonlit: 0.0 },
  { hour: 17, day: 0.36, twilight: 0.64, moonlit: 0.0 },
  { hour: 18, day: 0.0, twilight: 1.0, moonlit: 0.0 },
  { hour: 19, day: 0.0, twilight: 0.64, moonlit: 0.36 },
  { hour: 20, day: 0.0, twilight: 0.28, moonlit: 0.72 },
  { hour: 21, day: 0.0, twilight: 0.14, moonlit: 0.86 },
  { hour: 22, day: 0.0, twilight: 0.06, moonlit: 0.94 },
  { hour: 23, day: 0.0, twilight: 0.02, moonlit: 0.98 },
  { hour: 24, day: 0.0, twilight: 0.0, moonlit: 1.0 },
];

export function weightsForTimeOfDay(timeOfDay: TimeOfDay): AtmosphereWeights {
  if (timeOfDay === 'day') return { day: 1, twilight: 0, moonlit: 0 };
  if (timeOfDay === 'twilight') return { day: 0, twilight: 1, moonlit: 0 };
  return { day: 0, twilight: 0, moonlit: 1 };
}

export function resolveAtmosphereWeightsAtHour(hourFloat: number): AtmosphereWeights {
  const h = ((hourFloat % 24) + 24) % 24;
  for (let i = 0; i < SOLAR_KEYFRAMES.length - 1; i++) {
    const a = SOLAR_KEYFRAMES[i];
    const b = SOLAR_KEYFRAMES[i + 1];
    if (h >= a.hour && h <= b.hour) {
      const span = b.hour - a.hour || 1;
      const t = (h - a.hour) / span;
      const day = a.day + (b.day - a.day) * t;
      const twilight = a.twilight + (b.twilight - a.twilight) * t;
      const moonlit = a.moonlit + (b.moonlit - a.moonlit) * t;
      const sum = day + twilight + moonlit || 1;
      return {
        day: day / sum,
        twilight: twilight / sum,
        moonlit: moonlit / sum,
      };
    }
  }
  return { day: 0, twilight: 0, moonlit: 1 };
}

export function resolveAtmosphereWeights(
  mode: TimeOfDayMode,
  now: Date = new Date(),
  cycleSecond = 0,
  durationSeconds: number = CYCLE_24_DURATION_SECONDS,
): AtmosphereWeights {
  if (mode === 'cycle24') {
    return resolveAtmosphereWeightsAtHour(cycleSecondToVirtualHour(cycleSecond, durationSeconds));
  }
  return weightsForTimeOfDay(resolveTimeOfDayState(mode, now, cycleSecond, durationSeconds));
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function toHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [clampByte(r), clampByte(g), clampByte(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function parseHexRgb(hex: string): [number, number, number] {
  const normalized = hex.toUpperCase();
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ];
}

export function blendThreeHexColors(
  dayHex: string,
  twilightHex: string,
  moonlitHex: string,
  weights: AtmosphereWeights,
): string {
  if (weights.day >= 0.999) return dayHex.toUpperCase();
  if (weights.twilight >= 0.999) return twilightHex.toUpperCase();
  if (weights.moonlit >= 0.999) return moonlitHex.toUpperCase();

  const [dr, dg, db] = parseHexRgb(dayHex);
  const [tr, tg, tb] = parseHexRgb(twilightHex);
  const [mr, mg, mb] = parseHexRgb(moonlitHex);

  return toHex(
    dr * weights.day + tr * weights.twilight + mr * weights.moonlit,
    dg * weights.day + tg * weights.twilight + mg * weights.moonlit,
    db * weights.day + tb * weights.twilight + mb * weights.moonlit,
  );
}

/**
 * Deterministically remaps a daytime room palette color into Twilight or Moonlit
 * tones while preserving architectural depth and shadow contrast.
 */
export function remapRoomColor(hex: string, timeOfDay: TimeOfDay): string {
  const normalized = hex.toUpperCase();
  if (timeOfDay === 'day') return normalized;

  const [r, g, b] = parseHexRgb(normalized);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (timeOfDay === 'twilight') {
    // Cool dusky indigo-violet atmosphere with subdued dusk highlights
    const nr = r * 0.48 + 16 + lum * 14;
    const ng = g * 0.42 + 13 + lum * 12;
    const nb = b * 0.64 + 32 + lum * 24;
    return toHex(nr, ng, nb);
  }

  // Moonlit: midnight navy shadows, cool slate-blue stone/timber, silvery-blue highlights
  const baseL = lum * 255;
  const nr = r * 0.16 + baseL * 0.30 + 6;
  const ng = g * 0.24 + baseL * 0.37 + 11;
  const nb = b * 0.34 + baseL * 0.51 + 26;
  return toHex(nr, ng, nb);
}

export function remapRoomColorWithWeights(hex: string, weights: AtmosphereWeights): string {
  const dayHex = hex.toUpperCase();
  if (weights.day >= 0.999) return dayHex;
  const twilightHex = remapRoomColor(dayHex, 'twilight');
  const moonlitHex = remapRoomColor(dayHex, 'moonlit');
  return blendThreeHexColors(dayHex, twilightHex, moonlitHex, weights);
}

export function dominantTimeOfDayFromWeights(weights: AtmosphereWeights): TimeOfDay {
  if (weights.day >= weights.twilight && weights.day >= weights.moonlit) return 'day';
  if (weights.twilight >= weights.moonlit) return 'twilight';
  return 'moonlit';
}

export function resolveThemeForWeights(
  weights: AtmosphereWeights,
  dominantOverride?: TimeOfDay,
): ResolvedSceneTheme {
  const day = TIME_OF_DAY_THEMES.day;
  const twilight = TIME_OF_DAY_THEMES.twilight;
  const moonlit = TIME_OF_DAY_THEMES.moonlit;
  const dominant = dominantOverride ?? dominantTimeOfDayFromWeights(weights);
  const base = TIME_OF_DAY_THEMES[dominant];

  const starOpacity = Number(
    clamp01(weights.twilight * 0.78 + weights.moonlit * 1.0).toFixed(2),
  );
  const moonOpacity = Number(
    clamp01((weights.moonlit - 0.32) / 0.58).toFixed(2),
  );

  return {
    id: base.id,
    label: base.label,
    subtitle: base.subtitle,
    skyBands192: day.skyBands192.map((c, idx) =>
      blendThreeHexColors(c, twilight.skyBands192[idx], moonlit.skyBands192[idx], weights),
    ),
    skyBands768: day.skyBands768.map((c, idx) =>
      blendThreeHexColors(c, twilight.skyBands768[idx], moonlit.skyBands768[idx], weights),
    ),
    cloudFills: {
      top: blendThreeHexColors(day.cloudFills.top, twilight.cloudFills.top, moonlit.cloudFills.top, weights),
      mid: blendThreeHexColors(day.cloudFills.mid, twilight.cloudFills.mid, moonlit.cloudFills.mid, weights),
      body: blendThreeHexColors(day.cloudFills.body, twilight.cloudFills.body, moonlit.cloudFills.body, weights),
      shadow: blendThreeHexColors(day.cloudFills.shadow, twilight.cloudFills.shadow, moonlit.cloudFills.shadow, weights),
    },
    birdColor: blendThreeHexColors(day.birdColor, twilight.birdColor, moonlit.birdColor, weights),
    steamColor: blendThreeHexColors(day.steamColor, twilight.steamColor, moonlit.steamColor, weights),
    motePalette: [
      blendThreeHexColors(day.motePalette[0], twilight.motePalette[0], moonlit.motePalette[0], weights),
      blendThreeHexColors(day.motePalette[1], twilight.motePalette[1], moonlit.motePalette[1], weights),
      blendThreeHexColors(day.motePalette[2], twilight.motePalette[2], moonlit.motePalette[2], weights),
    ],
    haloOpacityBoost: Number(
      (
        day.haloOpacityBoost * weights.day +
        twilight.haloOpacityBoost * weights.twilight +
        moonlit.haloOpacityBoost * weights.moonlit
      ).toFixed(2),
    ),
    showStars: starOpacity > 0.02,
    showMoon: moonOpacity > 0.02,
    weights,
    starOpacity,
    moonOpacity,
  };
}

export interface TwinkleStar {
  readonly x: number;
  readonly y: number;
  readonly delay: string;
  readonly color: string;
}

export const STARS_192: readonly TwinkleStar[] = [
  { x: 18, y: 3, delay: '0s', color: '#E8F2FF' },
  { x: 34, y: 7, delay: '-1.2s', color: '#CFE2FF' },
  { x: 52, y: 4, delay: '-2.4s', color: '#FFFFFF' },
  { x: 69, y: 11, delay: '-0.7s', color: '#CFE2FF' },
  { x: 84, y: 3, delay: '-1.9s', color: '#FFEEC2' },
  { x: 103, y: 8, delay: '-2.8s', color: '#E8F2FF' },
  { x: 121, y: 4, delay: '-0.4s', color: '#FFFFFF' },
  { x: 141, y: 14, delay: '-1.5s', color: '#CFE2FF' },
  { x: 162, y: 6, delay: '-2.1s', color: '#E8F2FF' },
];

export const STARS_768: readonly TwinkleStar[] = [
  { x: 74, y: 12, delay: '0s', color: '#E8F2FF' },
  { x: 136, y: 28, delay: '-1.2s', color: '#CFE2FF' },
  { x: 208, y: 16, delay: '-2.4s', color: '#FFFFFF' },
  { x: 278, y: 42, delay: '-0.7s', color: '#CFE2FF' },
  { x: 334, y: 14, delay: '-1.9s', color: '#FFEEC2' },
  { x: 410, y: 32, delay: '-2.8s', color: '#E8F2FF' },
  { x: 486, y: 18, delay: '-0.4s', color: '#FFFFFF' },
  { x: 562, y: 54, delay: '-1.5s', color: '#CFE2FF' },
  { x: 648, y: 22, delay: '-2.1s', color: '#E8F2FF' },
  { x: 166, y: 10, delay: '-0.9s', color: '#CFE2FF' },
  { x: 294, y: 6, delay: '-2.2s', color: '#E8F2FF' },
  { x: 520, y: 38, delay: '-1.7s', color: '#FFEEC2' },
];
