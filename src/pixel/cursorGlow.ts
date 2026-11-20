import { AtmosphereWeights, blendThreeHexColors, TimeOfDay } from './timeOfDay';

export interface SceneCursorPoint {
  readonly x: number;
  readonly y: number;
}

export interface RectLike {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface CursorGlowPalette {
  readonly core: string;
  readonly mid: string;
  readonly halo: string;
  readonly boostTarget: string;
}

export const CURSOR_GLOW_PALETTES: Record<TimeOfDay, CursorGlowPalette> = {
  day: {
    core: '#FFFDF0',
    mid: '#FFE799',
    halo: '#F7C65E',
    boostTarget: '#FFFFFF',
  },
  twilight: {
    core: '#FFF2FF',
    mid: '#E3B8FF',
    halo: '#B97CE8',
    boostTarget: '#FFF5FF',
  },
  moonlit: {
    core: '#F4FAFF',
    mid: '#9FD2FF',
    halo: '#5E9DF2',
    boostTarget: '#FFFFFF',
  },
};

export function resolveCursorGlowPalette(weights: AtmosphereWeights): CursorGlowPalette {
  const day = CURSOR_GLOW_PALETTES.day;
  const twilight = CURSOR_GLOW_PALETTES.twilight;
  const moonlit = CURSOR_GLOW_PALETTES.moonlit;
  return {
    core: blendThreeHexColors(day.core, twilight.core, moonlit.core, weights),
    mid: blendThreeHexColors(day.mid, twilight.mid, moonlit.mid, weights),
    halo: blendThreeHexColors(day.halo, twilight.halo, moonlit.halo, weights),
    boostTarget: blendThreeHexColors(
      day.boostTarget,
      twilight.boostTarget,
      moonlit.boostTarget,
      weights,
    ),
  };
}

export function clientPointToSvgCoords(
  clientX: number,
  clientY: number,
  rect: RectLike,
  viewW: number,
  viewH: number,
): SceneCursorPoint | null {
  if (rect.width <= 0 || rect.height <= 0 || viewW <= 0 || viewH <= 0) {
    return null;
  }
  const rawX = ((clientX - rect.left) / rect.width) * viewW;
  const rawY = ((clientY - rect.top) / rect.height) * viewH;
  return {
    x: Math.max(0, Math.min(viewW, rawX)),
    y: Math.max(0, Math.min(viewH, rawY)),
  };
}

export function computeProximityFactor(
  targetX: number,
  targetY: number,
  cursor: SceneCursorPoint | null,
  radius: number,
): number {
  if (!cursor || radius <= 0) return 0;
  const dx = targetX - cursor.x;
  const dy = targetY - cursor.y;
  const dist = Math.hypot(dx, dy);
  if (dist >= radius) return 0;
  const linear = 1 - dist / radius;
  return linear * linear;
}

export function getRuneCenter(
  pixels: readonly { readonly x: number; readonly y: number; readonly w?: number; readonly h?: number }[],
  defaultSize: number,
): SceneCursorPoint {
  if (pixels.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const p of pixels) {
    const w = p.w ?? defaultSize;
    const h = p.h ?? defaultSize;
    sumX += p.x + w / 2;
    sumY += p.y + h / 2;
  }
  return {
    x: sumX / pixels.length,
    y: sumY / pixels.length,
  };
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function blendHexToward(hexA: string, hexB: string, factor: number): string {
  const t = Math.max(0, Math.min(1, factor));
  if (t <= 0) return hexA.toUpperCase();
  if (t >= 1) return hexB.toUpperCase();

  const ar = parseInt(hexA.slice(1, 3), 16);
  const ag = parseInt(hexA.slice(3, 5), 16);
  const ab = parseInt(hexA.slice(5, 7), 16);

  const br = parseInt(hexB.slice(1, 3), 16);
  const bg = parseInt(hexB.slice(3, 5), 16);
  const bb = parseInt(hexB.slice(5, 7), 16);

  const r = clampByte(ar + (br - ar) * t);
  const g = clampByte(ag + (bg - ag) * t);
  const b = clampByte(ab + (bb - ab) * t);

  return (
    '#' +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}
