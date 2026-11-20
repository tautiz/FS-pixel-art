import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countPixelsInRects,
  countPixelsInSpans,
  decodeRectsB64,
  encodeGridSpans,
  rectsB64ToSvgPath,
  spansToSvgPath,
  validateRectsBounds,
  validateSpansBounds,
} from './rle';
import { ROOM_PALETTE_NAMES, SCENE_HEIGHT, SCENE_WIDTH } from './palette';
import { ROOM_COLOR_LAYERS } from './sceneData';
import { ROOM_COLOR_LAYERS_768 } from './sceneData768';
import { ANIMATION_LAYERS, CAULDRON_SPRITES, SCONCE_SPRITES } from './sprites';
import {
  CAULDRONS_768,
  SCENE_768_HEIGHT,
  SCENE_768_WIDTH,
  SCONCES_768,
} from './sprites768';
import {
  advanceCatSequence,
  CAT_APPEARANCE_DURATION_MS,
  CAT_BODY_192,
  CAT_BODY_768,
  CAT_EYES_192,
  CAT_EYES_768,
  CAT_SECRET_SEQUENCE,
  CAT_TAIL_192,
  CAT_TAIL_768,
  createCatAppearance,
  getCatStatusMessage,
  isCatActive,
  shouldTriggerRandomCat,
} from './catEasterEgg';
import {
  blendHexToward,
  clientPointToSvgCoords,
  computeProximityFactor,
  getRuneCenter,
  resolveCursorGlowPalette,
} from './cursorGlow';
import {
  buildEmbedUrl,
  buildInteractiveHtmlWidget,
  buildResponsiveIframeSnippet,
} from './embedExport';
import {
  createInteractionEvent,
  INTERACTIVE_OBJECT_IDS,
  INTERACTIVE_OBJECTS,
  pruneExpiredInteractions,
  upsertActiveInteraction,
} from './interactions';
import { buildStandaloneSvg } from './svgExport';
import {
  clampCycleDuration,
  CYCLE_24_DURATION_SECONDS,
  cycleSecondToVirtualHour,
  formatCycleClock,
  MAX_CYCLE_DURATION_SECONDS,
  MIN_CYCLE_DURATION_SECONDS,
  remapRoomColor,
  remapRoomColorWithWeights,
  resolveAtmosphereWeights,
  resolveAtmosphereWeightsAtHour,
  resolveThemeForWeights,
  resolveTimeOfDayFromDate,
  resolveTimeOfDayState,
  TIME_OF_DAY_THEMES,
} from './timeOfDay';
import {
  RAIN_PARTICLES_192,
  RAIN_PARTICLES_768,
  RAIN_TWILIGHT_THRESHOLD,
  resolveWeatherState,
  SNOW_MOONLIT_THRESHOLD,
  SNOW_PARTICLES_192,
  SNOW_PARTICLES_768,
} from './weather';

function hexLum(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

test('encodeGridSpans and spansToSvgPath round-trip contiguous horizontal runs', () => {
  const grid = [
    ['#110F0A', '#110F0A', null, '#D99B26'],
    [null, '#D99B26', '#D99B26', '#D99B26'],
  ];
  const encoded = encodeGridSpans(grid);
  assert.deepEqual(encoded.get('#110F0A'), [0, 0, 2]);
  assert.deepEqual(encoded.get('#D99B26'), [3, 0, 1, 1, 1, 3]);
  assert.equal(spansToSvgPath(encoded.get('#110F0A')!), 'M0 0h2v1h-2z');
  assert.equal(countPixelsInSpans(encoded.get('#D99B26')!), 4);
});

test('all 192x128 room architecture spans stay within bounds and match pixel counts', () => {
  assert.ok(ROOM_COLOR_LAYERS.length >= 25);
  for (const layer of ROOM_COLOR_LAYERS) {
    assert.ok(
      validateSpansBounds(layer.spans, { width: SCENE_WIDTH, height: SCENE_HEIGHT }),
      `Out-of-bounds span in color ${layer.hex}`,
    );
    assert.equal(
      countPixelsInSpans(layer.spans),
      layer.pixelCount,
      `Pixel count mismatch for ${layer.hex}`,
    );
    assert.ok(
      ROOM_PALETTE_NAMES[layer.hex],
      `Missing palette name metadata for ${layer.hex}`,
    );
  }
});

test('all 768x512 (4x) room architecture 2D rects stay within bounds and match pixel counts', () => {
  assert.ok(ROOM_COLOR_LAYERS_768.length >= 40);
  for (const layer of ROOM_COLOR_LAYERS_768) {
    const rects = decodeRectsB64(layer.rectsB64);
    assert.ok(
      validateRectsBounds(rects, { width: SCENE_768_WIDTH, height: SCENE_768_HEIGHT }),
      `Out-of-bounds 768x512 rect in color ${layer.hex}`,
    );
    assert.equal(
      countPixelsInRects(rects),
      layer.pixelCount,
      `768x512 pixel count mismatch for ${layer.hex}`,
    );
  }
  const samplePath = rectsB64ToSvgPath(ROOM_COLOR_LAYERS_768[0].rectsB64);
  assert.ok(samplePath.startsWith('M'));
});

test('cauldrons and sconces stay within 192x128 and 768x512 bounds', () => {
  assert.equal(CAULDRON_SPRITES.length, 4);
  assert.equal(SCONCE_SPRITES.length, 2);
  assert.equal(CAULDRONS_768.length, 4);
  assert.equal(SCONCES_768.length, 2);
  for (const cauldron of CAULDRON_SPRITES) {
    for (const rect of cauldron.body) {
      assert.ok(rect.x >= 0 && rect.x + rect.w <= SCENE_WIDTH);
      assert.ok(rect.y >= 0 && rect.y + rect.h <= SCENE_HEIGHT);
    }
  }
  for (const cauldron of CAULDRONS_768) {
    for (const rect of cauldron.simmerRects) {
      assert.ok(rect.x >= 0 && rect.x + rect.w <= SCENE_768_WIDTH);
      assert.ok(rect.y >= 0 && rect.y + rect.h <= SCENE_768_HEIGHT);
    }
  }
});

test('remapRoomColor produces valid, darker, cool-shifted twilight and moonlit tones', () => {
  for (const layer of ROOM_COLOR_LAYERS_768) {
    assert.equal(remapRoomColor(layer.hex, 'day'), layer.hex.toUpperCase());
    const twilight = remapRoomColor(layer.hex, 'twilight');
    const moonlit = remapRoomColor(layer.hex, 'moonlit');
    assert.match(twilight, /^#[0-9A-F]{6}$/);
    assert.match(moonlit, /^#[0-9A-F]{6}$/);
  }
  // Bright sunlit limestone & warm ochre shift notably darker and cooler in moonlit mode
  const sunlitDay = '#E6CAA5';
  const sunlitMoon = remapRoomColor(sunlitDay, 'moonlit');
  assert.ok(hexLum(sunlitMoon) < hexLum(sunlitDay) * 0.75);
  const mr = parseInt(sunlitMoon.slice(1, 3), 16);
  const mb = parseInt(sunlitMoon.slice(5, 7), 16);
  assert.ok(mb > mr, `Expected cool blue-dominant moonlight (${sunlitMoon})`);

  const ochreMoon = remapRoomColor('#D38D3D', 'moonlit');
  assert.ok(
    parseInt(ochreMoon.slice(5, 7), 16) > parseInt(ochreMoon.slice(1, 3), 16),
    `Expected warm wood highlights to shift cool in moonlit (${ochreMoon})`,
  );
  assert.equal(TIME_OF_DAY_THEMES.moonlit.showMoon, true);
  assert.equal(TIME_OF_DAY_THEMES.twilight.showStars, true);
});

test('buildStandaloneSvg outputs valid animated SVG across grid presets and Time of Day modes', () => {
  const allLayers = new Set(ANIMATION_LAYERS.map((l) => l.id));
  const svg192 = buildStandaloneSvg({
    gridPreset: '192x128',
    timeOfDay: 'day',
    enabledLayers: allLayers,
    speed: 1,
    paused: false,
  });
  assert.ok(svg192.includes('viewBox="0 0 192 128"'));
  assert.ok(!svg192.includes('id="layer-moon"'));

  const svg768Moon = buildStandaloneSvg({
    gridPreset: '768x512',
    timeOfDay: 'moonlit',
    enabledLayers: allLayers,
    speed: 1,
    paused: false,
  });
  assert.ok(svg768Moon.includes('viewBox="0 0 768 512"'));
  assert.ok(svg768Moon.includes('id="layer-moon"'));
  assert.ok(svg768Moon.includes('id="layer-stars"'));
  assert.ok(svg768Moon.includes('Moonlit'));

  const svg768Twilight = buildStandaloneSvg({
    gridPreset: '768x512',
    timeOfDay: 'twilight',
    enabledLayers: allLayers,
    speed: 2,
    paused: true,
  });
  assert.ok(svg768Twilight.includes('id="layer-stars"'));
  assert.ok(!svg768Twilight.includes('id="layer-moon"'));
  assert.ok(svg768Twilight.includes('paused'));
});

test('interactive objects stay within bounds and one-time interaction sequences expire cleanly', () => {
  assert.equal(INTERACTIVE_OBJECT_IDS.length, 9);
  for (const id of INTERACTIVE_OBJECT_IDS) {
    const meta = INTERACTIVE_OBJECTS[id];
    assert.ok(meta.durationMs >= 1000);
    assert.ok(meta.box192.x >= 0 && meta.box192.x + meta.box192.w <= SCENE_WIDTH);
    assert.ok(meta.box192.y >= 0 && meta.box192.y + meta.box192.h <= SCENE_HEIGHT);
    assert.ok(meta.box768.x >= 0 && meta.box768.x + meta.box768.w <= SCENE_768_WIDTH);
    assert.ok(meta.box768.y >= 0 && meta.box768.y + meta.box768.h <= SCENE_768_HEIGHT);
  }

  const e1 = createInteractionEvent('cauldron-front-left', 1000, 1);
  const e2 = createInteractionEvent('sconce-left', 1100, 2);
  let active = upsertActiveInteraction([], e1, 1000);
  active = upsertActiveInteraction(active, e2, 1100);
  assert.equal(active.length, 2);

  // Re-triggering same object replaces its prior instance instead of stacking
  const e1Replay = createInteractionEvent('cauldron-front-left', 1200, 3);
  active = upsertActiveInteraction(active, e1Replay, 1200);
  assert.equal(active.length, 2);
  assert.equal(active.find((item) => item.objectId === 'cauldron-front-left')?.instanceId, 'cauldron-front-left-3');

  // Sconce expires at 1100 + 1350 = 2450, cauldron replay expires at 1200 + 1500 = 2700
  const afterSconce = pruneExpiredInteractions(active, 2500);
  assert.equal(afterSconce.length, 1);
  assert.equal(afterSconce[0].objectId, 'cauldron-front-left');

  const afterAll = pruneExpiredInteractions(active, 2800);
  assert.equal(afterAll.length, 0);
});

test('resolveTimeOfDayFromDate and resolveTimeOfDayState map local hours to day, twilight, and moonlit', () => {
  // Night (20:00 - 04:59) -> moonlit
  assert.equal(resolveTimeOfDayFromDate(new Date(2026, 10, 19, 0, 15)), 'moonlit');
  assert.equal(resolveTimeOfDayFromDate(new Date(2026, 10, 19, 4, 59)), 'moonlit');
  assert.equal(resolveTimeOfDayFromDate(new Date(2026, 10, 19, 20, 0)), 'moonlit');
  assert.equal(resolveTimeOfDayFromDate(new Date(2026, 10, 19, 23, 45)), 'moonlit');

  // Dawn (05:00 - 06:59) & Sunset (17:00 - 19:59) -> twilight
  assert.equal(resolveTimeOfDayFromDate(new Date(2026, 10, 19, 5, 0)), 'twilight');
  assert.equal(resolveTimeOfDayFromDate(new Date(2026, 10, 19, 6, 59)), 'twilight');
  assert.equal(resolveTimeOfDayFromDate(new Date(2026, 10, 19, 17, 0)), 'twilight');
  assert.equal(resolveTimeOfDayFromDate(new Date(2026, 10, 19, 19, 59)), 'twilight');

  // Business / Daytime hours (07:00 - 16:59) -> day
  assert.equal(resolveTimeOfDayFromDate(new Date(2026, 10, 19, 7, 0)), 'day');
  assert.equal(resolveTimeOfDayFromDate(new Date(2026, 10, 19, 12, 30)), 'day');
  assert.equal(resolveTimeOfDayFromDate(new Date(2026, 10, 19, 16, 59)), 'day');

  // Auto mode delegates to local date; manual modes override
  const noon = new Date(2026, 10, 19, 12, 0);
  assert.equal(resolveTimeOfDayState('auto', noon), 'day');
  assert.equal(resolveTimeOfDayState('moonlit', noon), 'moonlit');
  assert.equal(resolveTimeOfDayState('twilight', noon), 'twilight');
});

test('cursorGlow maps pointer coordinates and computes smooth proximity luminosity shifts', () => {
  const pt = clientPointToSvgCoords(
    550,
    300,
    { left: 100, top: 100, width: 900, height: 600 },
    768,
    512,
  );
  assert.deepEqual(pt, { x: 384, y: 170.66666666666666 });
  assert.equal(
    clientPointToSvgCoords(0, 0, { left: 0, top: 0, width: 0, height: 100 }, 768, 512),
    null,
  );

  // Proximity falls off smoothly to 0 beyond radius
  assert.equal(computeProximityFactor(100, 100, { x: 100, y: 100 }, 72), 1);
  const mid = computeProximityFactor(136, 100, { x: 100, y: 100 }, 72);
  assert.ok(mid > 0.2 && mid < 0.3);
  assert.equal(computeProximityFactor(200, 100, { x: 100, y: 100 }, 72), 0);
  assert.equal(computeProximityFactor(100, 100, null, 72), 0);

  // Rune centroid averages glyph pixels accurately
  const center = getRuneCenter(
    [
      { x: 254, y: 314, w: 2, h: 10 },
      { x: 256, y: 314, w: 4, h: 2 },
    ],
    2,
  );
  assert.equal(center.x, 256.5);
  assert.equal(center.y, 317);

  // Hex blending smoothly brightens toward white/cream target
  assert.equal(blendHexToward('#FFD878', '#FFFFFF', 0), '#FFD878');
  assert.equal(blendHexToward('#FFD878', '#FFFFFF', 1), '#FFFFFF');
  assert.equal(blendHexToward('#FFD878', '#FFFFFF', 0.5), '#FFECBC');
});

test('24-second gradual cycle updates Time of Day state and interpolates colors across every second', () => {
  assert.equal(CYCLE_24_DURATION_SECONDS, 24);
  const now = new Date(2026, 10, 19, 12, 0);

  // Discrete states progress through midnight (moonlit) -> dawn (twilight) -> day -> sunset (twilight) -> night (moonlit)
  assert.equal(resolveTimeOfDayState('cycle24', now, 0), 'moonlit');
  assert.equal(resolveTimeOfDayState('cycle24', now, 5), 'twilight');
  assert.equal(resolveTimeOfDayState('cycle24', now, 12), 'day');
  assert.equal(resolveTimeOfDayState('cycle24', now, 18), 'twilight');
  assert.equal(resolveTimeOfDayState('cycle24', now, 22), 'moonlit');

  // Every second produces normalized weights summing to 1 and valid interpolated theme & glow colors
  const skyBandSamples = new Set<string>();
  const roomColorSamples = new Set<string>();
  for (let s = 0; s < 24; s++) {
    const w = resolveAtmosphereWeights('cycle24', now, s);
    assert.ok(Math.abs(w.day + w.twilight + w.moonlit - 1) < 1e-6);
    const theme = resolveThemeForWeights(w);
    const glow = resolveCursorGlowPalette(w);
    const remapped = remapRoomColorWithWeights('#E6CAA5', w);
    assert.match(theme.skyBands768[0], /^#[0-9A-F]{6}$/);
    assert.match(glow.mid, /^#[0-9A-F]{6}$/);
    assert.match(remapped, /^#[0-9A-F]{6}$/);
    skyBandSamples.add(theme.skyBands768[0]);
    roomColorSamples.add(remapped);
  }
  // Gradual transitions across 24 seconds generate smooth multi-step color variation
  assert.ok(skyBandSamples.size >= 16, `Expected gradual sky color steps, got ${skyBandSamples.size}`);
  assert.ok(roomColorSamples.size >= 14, `Expected gradual room color steps, got ${roomColorSamples.size}`);

  // Dawn (6s) sits visibly between pure twilight and pure daylight
  const dawnWeights = resolveAtmosphereWeightsAtHour(6);
  const dawnTheme = resolveThemeForWeights(dawnWeights);
  assert.ok(dawnWeights.day > 0.2 && dawnWeights.twilight > 0.5);
  assert.notEqual(dawnTheme.skyBands768[0], TIME_OF_DAY_THEMES.day.skyBands768[0]);
  assert.notEqual(dawnTheme.skyBands768[0], TIME_OF_DAY_THEMES.twilight.skyBands768[0]);
});

test('responsive SVG, Interactive HTML widget, and iframe embed snippets support auto-scaling devices', () => {
  const allLayers = new Set(ANIMATION_LAYERS.map((l) => l.id));

  // Responsive SVG uses 100% sizing + preserveAspectRatio and includes cursor-only interactivity & glowing cursor
  const responsiveSvg = buildStandaloneSvg({
    gridPreset: '768x512',
    timeOfDay: 'twilight',
    enabledLayers: allLayers,
    speed: 1,
    paused: false,
    responsive: true,
    enableInteractionMode: true,
    enableGlowingCursor: true,
  });
  assert.ok(responsiveSvg.includes('width="100%" height="100%"'));
  assert.ok(responsiveSvg.includes('preserveAspectRatio="xMidYMid meet"'));
  assert.ok(responsiveSvg.includes('.interactive-target { cursor: pointer; }'));
  assert.ok(responsiveSvg.includes('id="layer-interaction-hitboxes"'));
  assert.ok(responsiveSvg.includes('id="layer-cursor-glow"'));
  assert.ok(!responsiveSvg.includes('stroke-dasharray'));
  assert.ok(!responsiveSvg.includes('interactive-outline'));

  const staticSvg = buildStandaloneSvg({
    gridPreset: '192x128',
    timeOfDay: 'day',
    enabledLayers: allLayers,
    speed: 1,
    paused: false,
    enableInteractionMode: false,
    enableGlowingCursor: false,
  });
  assert.ok(!staticSvg.includes('id="layer-interaction-hitboxes"'));
  assert.ok(!staticSvg.includes('id="layer-cursor-glow"'));

  // Embed URL & responsive iframe snippet preserve grid, time mode, and aspect-ratio responsiveness
  const embedUrl = buildEmbedUrl('https://example.com/study', {
    gridPreset: '768x512',
    timeMode: 'cycle24',
    interactionMode: true,
    glowingCursor: false,
    showControls: true,
    speed: 1,
    enabledLayers: allLayers,
  });
  assert.ok(embedUrl.includes('embed=1'));
  assert.ok(embedUrl.includes('time=cycle24'));
  assert.ok(embedUrl.includes('interactive=1'));
  assert.ok(embedUrl.includes('glow=0'));

  const iframeCode = buildResponsiveIframeSnippet('https://example.com/study', {
    gridPreset: '768x512',
    timeMode: 'cycle24',
    interactionMode: true,
    showControls: true,
    speed: 1,
    enabledLayers: allLayers,
  });
  assert.ok(iframeCode.includes('<iframe'));
  assert.ok(iframeCode.includes('aspect-ratio:3/2'));
  assert.ok(iframeCode.includes('width:100%'));

  // Self-contained Interactive HTML widget includes responsive viewport, 24s runtime, glowing cursor, and borderless click targets
  const widgetHtml = buildInteractiveHtmlWidget({
    gridPreset: '768x512',
    timeMode: 'cycle24',
    timeOfDay: 'moonlit',
    cycleSecond: 3,
    enabledLayers: allLayers,
    speed: 1,
    paused: false,
    enableInteractionMode: true,
    enableGlowingCursor: true,
    showMiniControls: true,
  });
  assert.ok(widgetHtml.startsWith('<!doctype html>'));
  assert.ok(widgetHtml.includes('name="viewport"'));
  assert.ok(widgetHtml.includes('aspect-ratio: 3 / 2'));
  assert.ok(widgetHtml.includes('touch-action: manipulation'));
  assert.ok(widgetHtml.includes('layer-cursor-glow'));
  assert.ok(widgetHtml.includes('layer-interaction-hitboxes'));
  assert.ok(!widgetHtml.includes('hit-outline'));
  assert.ok(!widgetHtml.includes('stroke-dasharray'));
  assert.ok(widgetHtml.includes('"initialMode":"cycle24"'));
  assert.ok(widgetHtml.includes('layer-alchemist-cat'));
  assert.ok(widgetHtml.includes('"catConfig"'));
});

test("hidden Alchemist's Cat sequence, random appearance logic, and pixel sprites are valid", () => {
  assert.equal(CAT_SECRET_SEQUENCE.length, 3);

  // Full secret click sequence triggers on the final object and resets progress
  let step = advanceCatSequence(0, CAT_SECRET_SEQUENCE[0]);
  assert.equal(step.nextProgress, 1);
  assert.equal(step.triggered, false);

  step = advanceCatSequence(step.nextProgress, CAT_SECRET_SEQUENCE[1]);
  assert.equal(step.nextProgress, 2);
  assert.equal(step.triggered, false);

  step = advanceCatSequence(step.nextProgress, CAT_SECRET_SEQUENCE[2]);
  assert.equal(step.triggered, true);
  assert.equal(step.nextProgress, 0);

  // Off-sequence click resets progress unless clicking step 0 again
  const wrongClick = advanceCatSequence(2, 'potion-rack-right');
  assert.deepEqual(wrongClick, { nextProgress: 0, triggered: false });
  const restartClick = advanceCatSequence(2, CAT_SECRET_SEQUENCE[0]);
  assert.deepEqual(restartClick, { nextProgress: 1, triggered: false });

  // Random appearance respects active cooldown and probability threshold
  assert.equal(shouldTriggerRandomCat(0.1, 0.24, false), true);
  assert.equal(shouldTriggerRandomCat(0.1, 0.24, true), false);
  assert.equal(shouldTriggerRandomCat(0.5, 0.24, false), false);

  // Appearance lifecycle & messages
  const cat = createCatAppearance('sequence', 5000, 1);
  assert.equal(isCatActive(cat, 5000 + CAT_APPEARANCE_DURATION_MS - 100), true);
  assert.equal(isCatActive(cat, 5000 + CAT_APPEARANCE_DURATION_MS + 10), false);
  assert.ok(getCatStatusMessage('sequence').includes("Alchemist's Cat"));
  assert.ok(getCatStatusMessage('random').includes("Alchemist's Cat"));

  // Sprite coordinates stay strictly inside 192x128 and 768x512 scene bounds
  for (const r of [...CAT_BODY_192, ...CAT_EYES_192, ...CAT_TAIL_192]) {
    assert.ok(r.x >= 0 && r.x + r.w <= SCENE_WIDTH);
    assert.ok(r.y >= 0 && r.y + r.h <= SCENE_HEIGHT);
  }
  for (const r of [...CAT_BODY_768, ...CAT_EYES_768, ...CAT_TAIL_768]) {
    assert.ok(r.x >= 0 && r.x + r.w <= SCENE_768_WIDTH);
    assert.ok(r.y >= 0 && r.y + r.h <= SCENE_768_HEIGHT);
  }
});

test('dynamic weather overlay resolves atmospheric rain/snow states, respects bounds, and honors pause state in SVG exports', () => {
  // Auto weather responds to atmospheric conditions: daylight=clear, twilight=rain, moonlit=snow
  const dayW = resolveAtmosphereWeights('day', new Date(2026, 10, 19, 12, 0));
  const twilightW = resolveAtmosphereWeights('twilight', new Date(2026, 10, 19, 18, 0));
  const moonlitW = resolveAtmosphereWeights('moonlit', new Date(2026, 10, 19, 23, 0));

  assert.equal(resolveWeatherState('auto', dayW).kind, 'none');
  const autoRain = resolveWeatherState('auto', twilightW);
  assert.equal(autoRain.kind, 'rain');
  assert.ok(autoRain.opacity > 0.5);

  const autoSnow = resolveWeatherState('auto', moonlitW);
  assert.equal(autoSnow.kind, 'snow');
  assert.ok(autoSnow.opacity > 0.5);

  // Explicit overrides take precedence regardless of time of day
  assert.equal(resolveWeatherState('clear', moonlitW).kind, 'none');
  assert.equal(resolveWeatherState('rain', dayW).kind, 'rain');
  assert.equal(resolveWeatherState('snow', dayW).kind, 'snow');

  // Gradual 24s cycle crosses rain & snow thresholds smoothly
  assert.ok(RAIN_TWILIGHT_THRESHOLD > 0 && SNOW_MOONLIT_THRESHOLD > 0);
  const dawnBoundary = resolveAtmosphereWeights('cycle24', new Date(2026, 10, 19, 12, 0), 5);
  assert.equal(resolveWeatherState('auto', dawnBoundary).kind, 'rain');
  const midnightCycle = resolveAtmosphereWeights('cycle24', new Date(2026, 10, 19, 12, 0), 0);
  assert.equal(resolveWeatherState('auto', midnightCycle).kind, 'snow');

  // Particle coordinates remain inside horizontal canvas bounds
  for (const p of [...RAIN_PARTICLES_192, ...SNOW_PARTICLES_192]) {
    assert.ok(p.x >= 0 && p.x + p.w <= SCENE_WIDTH);
    assert.ok(p.w >= 1 && p.h >= 1);
    assert.ok(p.opacity > 0 && p.opacity <= 1);
  }
  for (const p of [...RAIN_PARTICLES_768, ...SNOW_PARTICLES_768]) {
    assert.ok(p.x >= 0 && p.x + p.w <= SCENE_768_WIDTH);
    assert.ok(p.w >= 1 && p.h >= 1);
    assert.ok(p.opacity > 0 && p.opacity <= 1);
  }

  // Standalone SVG omits weather in clear daylight, emits rain/snow in twilight/moonlit, and preserves paused play-state
  const allLayers = new Set(ANIMATION_LAYERS.map((l) => l.id));
  const clearSvg = buildStandaloneSvg({
    gridPreset: '768x512',
    timeOfDay: 'day',
    weatherMode: 'auto',
    enabledLayers: allLayers,
    speed: 1,
    paused: false,
  });
  assert.ok(!clearSvg.includes('id="layer-weather"'));

  const pausedRainSvg = buildStandaloneSvg({
    gridPreset: '768x512',
    timeOfDay: 'twilight',
    weatherMode: 'auto',
    enabledLayers: allLayers,
    speed: 1,
    paused: true,
  });
  assert.ok(pausedRainSvg.includes('id="layer-weather"'));
  assert.ok(pausedRainSvg.includes('data-weather-kind="rain"'));
  assert.ok(pausedRainSvg.includes('.anim-rain-768 { animation: rainFall768 1.30s linear infinite paused; }'));

  const snowSvg192 = buildStandaloneSvg({
    gridPreset: '192x128',
    timeOfDay: 'moonlit',
    weatherMode: 'auto',
    enabledLayers: allLayers,
    speed: 2,
    paused: true,
  });
  assert.ok(snowSvg192.includes('data-weather-kind="snow"'));
  assert.ok(snowSvg192.includes('.anim-snow { animation: snowFall192 3.40s linear infinite paused; }'));

  // Embed URL & interactive HTML widget include weather configuration
  const forcedRainUrl = buildEmbedUrl('https://example.com/study', {
    gridPreset: '768x512',
    timeMode: 'day',
    weatherMode: 'rain',
    interactionMode: true,
    showControls: true,
    speed: 1,
    enabledLayers: allLayers,
  });
  assert.ok(forcedRainUrl.includes('weather=rain'));

  const widget = buildInteractiveHtmlWidget({
    gridPreset: '768x512',
    timeMode: 'cycle24',
    timeOfDay: 'moonlit',
    weatherMode: 'auto',
    enabledLayers: allLayers,
    speed: 1,
    paused: false,
    enableInteractionMode: true,
    enableGlowingCursor: true,
    showMiniControls: true,
  });
  assert.ok(widget.includes('"weatherConfig"'));
  assert.ok(widget.includes('id="layer-weather"') || widget.includes('"layer-weather"'));
});

test('custom day/night cycle durations map virtual solar hours, clocks, and embeds accurately', () => {
  assert.equal(clampCycleDuration(2), MIN_CYCLE_DURATION_SECONDS);
  assert.equal(clampCycleDuration(999), MAX_CYCLE_DURATION_SECONDS);
  assert.equal(clampCycleDuration(Number.NaN), CYCLE_24_DURATION_SECONDS);
  assert.equal(clampCycleDuration(48.4), 48);

  const now = new Date(2026, 10, 19, 12, 0);
  // 12-second fast cycle: 0s=midnight (moonlit), 3s=06:00 (twilight), 6s=12:00 (day), 9s=18:00 (twilight)
  assert.equal(cycleSecondToVirtualHour(3, 12), 6);
  assert.equal(formatCycleClock(3, 12), '06:00');
  assert.equal(resolveTimeOfDayState('cycle24', now, 0, 12), 'moonlit');
  assert.equal(resolveTimeOfDayState('cycle24', now, 3, 12), 'twilight');
  assert.equal(resolveTimeOfDayState('cycle24', now, 6, 12), 'day');
  assert.equal(resolveTimeOfDayState('cycle24', now, 9, 12), 'twilight');

  // 48-second slow cycle supports half-hour virtual clock steps & smooth intermediate interpolation
  assert.equal(formatCycleClock(1, 48), '00:30');
  assert.equal(formatCycleClock(24, 48), '12:00');
  assert.equal(resolveTimeOfDayState('cycle24', now, 24, 48), 'day');
  const step1 = resolveAtmosphereWeights('cycle24', now, 1, 48);
  const step2 = resolveAtmosphereWeights('cycle24', now, 2, 48);
  assert.ok(step1.moonlit > step2.moonlit);
  assert.ok(Math.abs(step1.day + step1.twilight + step1.moonlit - 1) < 1e-6);

  // Embed URL & widget encode custom cycle durations cleanly
  const allLayers = new Set(ANIMATION_LAYERS.map((l) => l.id));
  const customUrl = buildEmbedUrl('https://example.com/study', {
    gridPreset: '768x512',
    timeMode: 'cycle24',
    cycleDurationSeconds: 60,
    interactionMode: true,
    showControls: true,
    speed: 1,
    enabledLayers: allLayers,
  });
  assert.ok(customUrl.includes('cycle=60'));

  const defaultUrl = buildEmbedUrl('https://example.com/study', {
    gridPreset: '768x512',
    timeMode: 'cycle24',
    cycleDurationSeconds: 24,
    interactionMode: true,
    showControls: true,
    speed: 1,
    enabledLayers: allLayers,
  });
  assert.ok(!defaultUrl.includes('cycle='));

  const customWidget = buildInteractiveHtmlWidget({
    gridPreset: '768x512',
    timeMode: 'cycle24',
    timeOfDay: 'day',
    cycleDurationSeconds: 90,
    enabledLayers: allLayers,
    speed: 1,
    paused: false,
    enableInteractionMode: true,
    enableGlowingCursor: true,
    showMiniControls: true,
  });
  assert.ok(customWidget.includes('"cycleDurationSeconds":90'));
});





