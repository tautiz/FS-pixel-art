export type InteractiveObjectId =
  | 'cauldron-back-left'
  | 'cauldron-front-left'
  | 'cauldron-back-right'
  | 'cauldron-front-right'
  | 'sconce-left'
  | 'sconce-right'
  | 'cabinet-runes'
  | 'potion-rack-left'
  | 'potion-rack-right';

export type InteractionEffectKind =
  | 'smoke-puff'
  | 'arcane-flare'
  | 'rune-surge'
  | 'potion-fizz';

export interface InteractionHitbox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly originX: number;
  readonly originY: number;
}

export interface InteractiveObjectMeta {
  readonly id: InteractiveObjectId;
  readonly name: string;
  readonly ariaLabel: string;
  readonly kind: InteractionEffectKind;
  readonly durationMs: number;
  readonly statusMessage: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly smokeColor: string;
  readonly box192: InteractionHitbox;
  readonly box768: InteractionHitbox;
}

export const INTERACTIVE_OBJECTS: Record<InteractiveObjectId, InteractiveObjectMeta> = {
  'cauldron-back-left': {
    id: 'cauldron-back-left',
    name: 'Back-left Cauldron',
    ariaLabel: 'Trigger smoke puff and color shift on back-left cauldron',
    kind: 'smoke-puff',
    durationMs: 1400,
    statusMessage: 'Back-left cauldron erupted in a violet alchemical smoke puff.',
    primaryColor: '#C56BFF',
    secondaryColor: '#F6D6FF',
    smokeColor: '#D6B8FF',
    box192: { x: 46, y: 79, w: 9, h: 9, originX: 50, originY: 81 },
    box768: { x: 184, y: 316, w: 36, h: 36, originX: 201, originY: 322 },
  },
  'cauldron-front-left': {
    id: 'cauldron-front-left',
    name: 'Front-left Cauldron',
    ariaLabel: 'Trigger smoke puff and color shift on front-left cauldron',
    kind: 'smoke-puff',
    durationMs: 1500,
    statusMessage: 'Front-left cauldron flashed bright cyan-emerald with billowing vapor.',
    primaryColor: '#38F2D6',
    secondaryColor: '#D8FFF9',
    smokeColor: '#A8F5E8',
    box192: { x: 47, y: 89, w: 12, h: 11, originX: 53, originY: 91 },
    box768: { x: 188, y: 356, w: 48, h: 44, originX: 210, originY: 366 },
  },
  'cauldron-back-right': {
    id: 'cauldron-back-right',
    name: 'Back-right Cauldron',
    ariaLabel: 'Trigger smoke puff and color shift on back-right cauldron',
    kind: 'smoke-puff',
    durationMs: 1400,
    statusMessage: 'Back-right cauldron sparked crimson-gold alchemical steam.',
    primaryColor: '#FF5E7E',
    secondaryColor: '#FFD6DF',
    smokeColor: '#FFC4B8',
    box192: { x: 127, y: 81, w: 9, h: 9, originX: 131, originY: 83 },
    box768: { x: 508, y: 320, w: 36, h: 36, originX: 522, originY: 326 },
  },
  'cauldron-front-right': {
    id: 'cauldron-front-right',
    name: 'Front-right Cauldron',
    ariaLabel: 'Trigger smoke puff and color shift on front-right cauldron',
    kind: 'smoke-puff',
    durationMs: 1500,
    statusMessage: 'Front-right cauldron brewed a golden starlight smoke plume.',
    primaryColor: '#FFD147',
    secondaryColor: '#FFF7C2',
    smokeColor: '#FFE8A6',
    box192: { x: 161, y: 91, w: 12, h: 11, originX: 167, originY: 93 },
    box768: { x: 644, y: 360, w: 48, h: 44, originX: 660, originY: 368 },
  },
  'sconce-left': {
    id: 'sconce-left',
    name: 'Left Bookcase Sconce',
    ariaLabel: 'Trigger arcane flare on left bookcase sconce',
    kind: 'arcane-flare',
    durationMs: 1350,
    statusMessage: 'Left bookcase sconce flared into azure arcane fire.',
    primaryColor: '#5AE4FF',
    secondaryColor: '#FFFFFF',
    smokeColor: '#A8EEFF',
    box192: { x: 162, y: 41, w: 9, h: 13, originX: 166, originY: 46 },
    box768: { x: 650, y: 166, w: 32, h: 44, originX: 666, originY: 182 },
  },
  'sconce-right': {
    id: 'sconce-right',
    name: 'Right Bookcase Sconce',
    ariaLabel: 'Trigger arcane flare on right bookcase sconce',
    kind: 'arcane-flare',
    durationMs: 1350,
    statusMessage: 'Right bookcase sconce blazed with amethyst torchlight.',
    primaryColor: '#E078FF',
    secondaryColor: '#FFF0FF',
    smokeColor: '#EBBFFF',
    box192: { x: 183, y: 36, w: 8, h: 11, originX: 187, originY: 40 },
    box768: { x: 734, y: 144, w: 30, h: 38, originX: 750, originY: 158 },
  },
  'cabinet-runes': {
    id: 'cabinet-runes',
    name: 'Carved Cabinet Runes',
    ariaLabel: 'Trigger arcane surge on carved cabinet runes',
    kind: 'rune-surge',
    durationMs: 1450,
    statusMessage: 'Carved cabinet runes surged with cerulean-violet light.',
    primaryColor: '#66E8FF',
    secondaryColor: '#E4A8FF',
    smokeColor: '#B8F3FF',
    box192: { x: 61, y: 76, w: 27, h: 14, originX: 74, originY: 82 },
    box768: { x: 248, y: 308, w: 98, h: 54, originX: 296, originY: 334 },
  },
  'potion-rack-left': {
    id: 'potion-rack-left',
    name: 'Left Potion Rack',
    ariaLabel: 'Trigger effervescent fizz on left potion rack',
    kind: 'potion-fizz',
    durationMs: 1300,
    statusMessage: 'Left potion rack effervesced in ruby and mint vapor.',
    primaryColor: '#FF7096',
    secondaryColor: '#7FFFD4',
    smokeColor: '#FFC7DC',
    box192: { x: 70, y: 65, w: 11, h: 7, originX: 75, originY: 67 },
    box768: { x: 282, y: 264, w: 34, h: 20, originX: 299, originY: 271 },
  },
  'potion-rack-right': {
    id: 'potion-rack-right',
    name: 'Right Potion Rack',
    ariaLabel: 'Trigger effervescent fizz on right potion rack',
    kind: 'potion-fizz',
    durationMs: 1300,
    statusMessage: 'Right potion rack bubbled over with sapphire mist.',
    primaryColor: '#66B8FF',
    secondaryColor: '#FFE588',
    smokeColor: '#C4E4FF',
    box192: { x: 86, y: 64, w: 11, h: 7, originX: 91, originY: 66 },
    box768: { x: 346, y: 263, w: 34, h: 20, originX: 363, originY: 270 },
  },
};

export const INTERACTIVE_OBJECT_IDS: readonly InteractiveObjectId[] = Object.keys(
  INTERACTIVE_OBJECTS,
) as InteractiveObjectId[];

export interface ActiveInteraction {
  readonly instanceId: string;
  readonly objectId: InteractiveObjectId;
  readonly startedAt: number;
  readonly expiresAt: number;
}

export function createInteractionEvent(
  objectId: InteractiveObjectId,
  nowMs: number,
  sequenceCounter: number,
): ActiveInteraction {
  const meta = INTERACTIVE_OBJECTS[objectId];
  return {
    instanceId: `${objectId}-${sequenceCounter}`,
    objectId,
    startedAt: nowMs,
    expiresAt: nowMs + meta.durationMs,
  };
}

export function upsertActiveInteraction(
  current: readonly ActiveInteraction[],
  nextEvent: ActiveInteraction,
  nowMs: number,
): readonly ActiveInteraction[] {
  const stillActive = current.filter(
    (item) => item.expiresAt > nowMs && item.objectId !== nextEvent.objectId,
  );
  return [...stillActive, nextEvent];
}

export function pruneExpiredInteractions(
  current: readonly ActiveInteraction[],
  nowMs: number,
): readonly ActiveInteraction[] {
  return current.filter((item) => item.expiresAt > nowMs);
}
