import { AtmosphereWeights, dominantTimeOfDayFromWeights } from './timeOfDay';

export type WeatherKind = 'none' | 'rain' | 'snow';
export type WeatherMode = 'auto' | 'clear' | 'rain' | 'snow';

export interface ResolvedWeatherState {
  readonly kind: WeatherKind;
  readonly mode: WeatherMode;
  readonly label: string;
  readonly opacity: number;
}

export interface WeatherParticle {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly delay: string;
  readonly duration: string;
  readonly color: string;
  readonly opacity: number;
}

export const RAIN_TWILIGHT_THRESHOLD = 0.42;
export const SNOW_MOONLIT_THRESHOLD = 0.52;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Resolves dynamic atmospheric weather from WeatherMode and AtmosphereWeights:
 * - 'clear' -> no particles
 * - 'rain' -> forced gentle rain overlay
 * - 'snow' -> forced falling snow overlay
 * - 'auto' -> triggers Snow when moonlit >= 0.52, Gentle Rain when twilight >= 0.42, else Clear
 */
export function resolveWeatherState(
  mode: WeatherMode,
  weights: AtmosphereWeights,
): ResolvedWeatherState {
  if (mode === 'clear') {
    return { kind: 'none', mode, label: 'Clear', opacity: 0 };
  }
  if (mode === 'rain') {
    return { kind: 'rain', mode, label: 'Gentle Rain', opacity: 0.92 };
  }
  if (mode === 'snow') {
    return { kind: 'snow', mode, label: 'Falling Snow', opacity: 0.94 };
  }

  // Automatic atmospheric trigger based on live Time of Day weights
  const dominant = dominantTimeOfDayFromWeights(weights);
  if (weights.moonlit >= SNOW_MOONLIT_THRESHOLD || dominant === 'moonlit') {
    const strength = clamp01((weights.moonlit - 0.36) / 0.46);
    if (strength > 0.05) {
      return {
        kind: 'snow',
        mode,
        label: 'Moonlit Snow',
        opacity: Number((0.28 + strength * 0.66).toFixed(2)),
      };
    }
  }

  if (weights.twilight >= RAIN_TWILIGHT_THRESHOLD || dominant === 'twilight') {
    const strength = clamp01((weights.twilight - 0.30) / 0.48);
    if (strength > 0.05) {
      return {
        kind: 'rain',
        mode,
        label: 'Dusk Rain',
        opacity: Number((0.26 + strength * 0.64).toFixed(2)),
      };
    }
  }

  return { kind: 'none', mode, label: 'Clear', opacity: 0 };
}

function makeRainParticles(
  count: number,
  width: number,
  height: number,
  scale: 1 | 4,
): readonly WeatherParticle[] {
  const palette = ['#C8E0FA', '#A6C8F0', '#84B0E4'] as const;
  const list: WeatherParticle[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i * 37 + 13) % count;
    const x = Math.round(((i + 0.5) / count) * width + ((t % 5) - 2) * (scale === 4 ? 7 : 2));
    const clampedX = Math.max(0, Math.min(width - scale, x));
    const phase = ((i * 0.29 + (t % 7) * 0.14) % 1.45).toFixed(2);
    const dur = (1.15 + (t % 5) * 0.14).toFixed(2);
    const h = scale === 4 ? 7 + (t % 3) * 2 : 2 + (t % 2);
    const w = scale === 4 ? (t % 3 === 0 ? 2 : 1) : 1;
    list.push({
      x: clampedX,
      y: -Math.round(height * 0.12) - (t % 6) * scale * 2,
      w,
      h,
      delay: `-${phase}s`,
      duration: `${dur}s`,
      color: palette[i % palette.length],
      opacity: Number((0.46 + (t % 4) * 0.13).toFixed(2)),
    });
  }
  return list;
}

function makeSnowParticles(
  count: number,
  width: number,
  height: number,
  scale: 1 | 4,
): readonly WeatherParticle[] {
  const palette = ['#FFFFFF', '#E2F0FF', '#C2DCFA'] as const;
  const list: WeatherParticle[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i * 29 + 7) % count;
    const x = Math.round(((i + 0.4) / count) * width + ((t % 5) - 2) * (scale === 4 ? 8 : 2));
    const clampedX = Math.max(0, Math.min(width - scale, x));
    const phase = ((i * 0.67 + (t % 6) * 0.92) % 7.2).toFixed(2);
    const dur = (5.8 + (t % 5) * 0.85).toFixed(2);
    const size = scale === 4 ? (t % 4 === 0 ? 3 : 2) : 1;
    list.push({
      x: clampedX,
      y: -Math.round(height * 0.08) - (t % 5) * scale * 2,
      w: size,
      h: size,
      delay: `-${phase}s`,
      duration: `${dur}s`,
      color: palette[i % palette.length],
      opacity: Number((0.62 + (t % 4) * 0.09).toFixed(2)),
    });
  }
  return list;
}

export const RAIN_PARTICLES_192: readonly WeatherParticle[] = makeRainParticles(28, 192, 128, 1);
export const RAIN_PARTICLES_768: readonly WeatherParticle[] = makeRainParticles(44, 768, 512, 4);

export const SNOW_PARTICLES_192: readonly WeatherParticle[] = makeSnowParticles(26, 192, 128, 1);
export const SNOW_PARTICLES_768: readonly WeatherParticle[] = makeSnowParticles(40, 768, 512, 4);
