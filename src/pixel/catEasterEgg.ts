import { InteractiveObjectId } from './interactions';
import { PixelRect } from './sprites';

export const CAT_SECRET_SEQUENCE: readonly InteractiveObjectId[] = [
  'cauldron-front-left',
  'cabinet-runes',
  'sconce-left',
] as const;

export const CAT_APPEARANCE_DURATION_MS = 5800;
export const AMBIENT_CAT_CHECK_INTERVAL_MS = 18_000;
export const AMBIENT_CAT_PROBABILITY = 0.24;
export const CLICK_CAT_BONUS_PROBABILITY = 0.08;

export type CatAppearanceReason = 'sequence' | 'random';

export interface CatAppearance {
  readonly instanceId: string;
  readonly reason: CatAppearanceReason;
  readonly startedAt: number;
  readonly expiresAt: number;
}

export interface CatSequenceStepResult {
  readonly nextProgress: number;
  readonly triggered: boolean;
}

export function advanceCatSequence(
  progress: number,
  clickedId: InteractiveObjectId,
): CatSequenceStepResult {
  const safeProgress =
    progress >= 0 && progress < CAT_SECRET_SEQUENCE.length ? progress : 0;

  if (clickedId === CAT_SECRET_SEQUENCE[safeProgress]) {
    const nextStep = safeProgress + 1;
    if (nextStep >= CAT_SECRET_SEQUENCE.length) {
      return { nextProgress: 0, triggered: true };
    }
    return { nextProgress: nextStep, triggered: false };
  }

  if (clickedId === CAT_SECRET_SEQUENCE[0]) {
    return { nextProgress: 1, triggered: false };
  }

  return { nextProgress: 0, triggered: false };
}

export function shouldTriggerRandomCat(
  rngValue: number,
  probability: number,
  hasActiveCat: boolean,
): boolean {
  if (hasActiveCat) return false;
  if (probability <= 0) return false;
  return rngValue >= 0 && rngValue < probability;
}

export function createCatAppearance(
  reason: CatAppearanceReason,
  nowMs: number,
  sequenceCounter: number,
): CatAppearance {
  return {
    instanceId: `alchemist-cat-${reason}-${sequenceCounter}`,
    reason,
    startedAt: nowMs,
    expiresAt: nowMs + CAT_APPEARANCE_DURATION_MS,
  };
}

export function isCatActive(
  cat: CatAppearance | null,
  nowMs: number,
): boolean {
  return cat !== null && cat.expiresAt > nowMs;
}

export function getCatStatusMessage(reason: CatAppearanceReason): string {
  return reason === 'sequence'
    ? "Secret ritual complete — the Alchemist's Cat slipped out of the shadows!"
    : "A curious Alchemist's Cat strolled across the workbench!";
}

/**
 * Pixel art sprites for the hidden Alchemist's Cat perched on the center counter
 * in front of the corridor doorway (x ~ 103..113, y ~ 55..67 in 192x128;
 * 4x high-detail in 768x512 around x ~ 410..456, y ~ 222..268).
 */
export const CAT_BODY_192: readonly PixelRect[] = [
  // Left & right pointed ears
  { x: 103, y: 56, w: 1, h: 2, fill: '#15131E' },
  { x: 104, y: 57, w: 1, h: 1, fill: '#C8788E' },
  { x: 108, y: 56, w: 1, h: 2, fill: '#15131E' },
  { x: 107, y: 57, w: 1, h: 1, fill: '#C8788E' },
  // Head & indigo highlight
  { x: 104, y: 57, w: 4, h: 1, fill: '#242033' },
  { x: 103, y: 58, w: 6, h: 3, fill: '#15131E' },
  { x: 105, y: 58, w: 2, h: 1, fill: '#2E2842' },
  { x: 106, y: 60, w: 1, h: 1, fill: '#C8788E' },
  // Gold collar & glowing cyan charm
  { x: 104, y: 61, w: 4, h: 1, fill: '#D99B26' },
  { x: 105, y: 61, w: 1, h: 1, fill: '#66E8FF' },
  // Seated torso & paws flush on counter ledge (y=67)
  { x: 104, y: 62, w: 5, h: 4, fill: '#15131E' },
  { x: 108, y: 63, w: 2, h: 4, fill: '#15131E' },
  { x: 105, y: 62, w: 2, h: 3, fill: '#242033' },
  { x: 104, y: 66, w: 3, h: 1, fill: '#36304B' },
  { x: 108, y: 66, w: 2, h: 1, fill: '#242033' },
];

export const CAT_EYES_192: readonly PixelRect[] = [
  { x: 104, y: 59, w: 1, h: 1, fill: '#52D1A2' },
  { x: 107, y: 59, w: 1, h: 1, fill: '#FFE27A' },
];

export const CAT_TAIL_192: readonly PixelRect[] = [
  { x: 110, y: 65, w: 2, h: 1, fill: '#15131E' },
  { x: 111, y: 62, w: 1, h: 3, fill: '#15131E' },
  { x: 112, y: 60, w: 1, h: 3, fill: '#242033' },
  { x: 111, y: 59, w: 1, h: 1, fill: '#52D1A2' },
];

export const CAT_BODY_768: readonly PixelRect[] = [
  // Pointed ears with rose inner ear & rim highlight
  { x: 414, y: 222, w: 2, h: 2, fill: '#15131E' },
  { x: 413, y: 224, w: 5, h: 6, fill: '#15131E' },
  { x: 415, y: 225, w: 2, h: 4, fill: '#C8788E' },
  { x: 432, y: 222, w: 2, h: 2, fill: '#15131E' },
  { x: 430, y: 224, w: 5, h: 6, fill: '#15131E' },
  { x: 431, y: 225, w: 2, h: 4, fill: '#C8788E' },
  // Crown & rounded cheeks
  { x: 418, y: 226, w: 12, h: 4, fill: '#242033' },
  { x: 412, y: 230, w: 24, h: 12, fill: '#15131E' },
  { x: 414, y: 229, w: 20, h: 3, fill: '#242033' },
  { x: 419, y: 230, w: 8, h: 2, fill: '#36304B' },
  // Whisker hints & nose
  { x: 410, y: 237, w: 3, h: 1, fill: '#4E476A' },
  { x: 435, y: 237, w: 3, h: 1, fill: '#4E476A' },
  { x: 422, y: 238, w: 4, h: 2, fill: '#C8788E' },
  // Alchemical gold collar + luminous rune bell
  { x: 416, y: 242, w: 16, h: 3, fill: '#D99B26' },
  { x: 422, y: 244, w: 4, h: 4, fill: '#66E8FF' },
  { x: 423, y: 245, w: 2, h: 2, fill: '#FFFFFF' },
  // Chest, shoulders & seated haunches flush at y=268
  { x: 415, y: 245, w: 20, h: 18, fill: '#15131E' },
  { x: 428, y: 249, w: 12, h: 16, fill: '#15131E' },
  { x: 417, y: 246, w: 9, h: 12, fill: '#242033' },
  { x: 431, y: 251, w: 6, h: 9, fill: '#242033' },
  // Front paws + back foot toes
  { x: 415, y: 263, w: 6, h: 5, fill: '#2E2842' },
  { x: 422, y: 263, w: 5, h: 5, fill: '#36304B' },
  { x: 431, y: 264, w: 8, h: 4, fill: '#242033' },
];

export const CAT_EYES_768: readonly PixelRect[] = [
  // Left emerald-gold eye + bright pupil glint
  { x: 416, y: 234, w: 5, h: 4, fill: '#52D1A2' },
  { x: 418, y: 234, w: 2, h: 4, fill: '#110F0A' },
  { x: 417, y: 234, w: 1, h: 1, fill: '#FFFFFF' },
  // Right emerald-gold eye + bright pupil glint
  { x: 427, y: 234, w: 5, h: 4, fill: '#FFE27A' },
  { x: 428, y: 234, w: 2, h: 4, fill: '#110F0A' },
  { x: 427, y: 234, w: 1, h: 1, fill: '#FFFFFF' },
];

export const CAT_TAIL_768: readonly PixelRect[] = [
  { x: 439, y: 262, w: 6, h: 4, fill: '#15131E' },
  { x: 443, y: 256, w: 5, h: 7, fill: '#15131E' },
  { x: 446, y: 247, w: 4, h: 10, fill: '#242033' },
  { x: 445, y: 240, w: 4, h: 8, fill: '#242033' },
  { x: 442, y: 237, w: 4, h: 4, fill: '#36304B' },
  { x: 441, y: 237, w: 2, h: 2, fill: '#52D1A2' },
];
