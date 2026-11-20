import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  blendHexToward,
  clientPointToSvgCoords,
  computeProximityFactor,
  getRuneCenter,
  resolveCursorGlowPalette,
  SceneCursorPoint,
} from '../pixel/cursorGlow';
import {
  CatAppearance,
  CAT_BODY_192,
  CAT_BODY_768,
  CAT_EYES_192,
  CAT_EYES_768,
  CAT_TAIL_192,
  CAT_TAIL_768,
} from '../pixel/catEasterEgg';
import {
  ActiveInteraction,
  INTERACTIVE_OBJECT_IDS,
  INTERACTIVE_OBJECTS,
  InteractiveObjectId,
} from '../pixel/interactions';
import { SCENE_HEIGHT, SCENE_WIDTH } from '../pixel/palette';
import { rectsB64ToSvgPath, spansToSvgPath } from '../pixel/rle';
import { ROOM_COLOR_LAYERS } from '../pixel/sceneData';
import { ROOM_COLOR_LAYERS_768 } from '../pixel/sceneData768';
import {
  AnimationLayerId,
  CANDLE_FLAMES,
  CARVED_RUNES,
  CAULDRON_SPRITES,
  DUST_MOTES,
  HANGING_KEYS,
  HERB_TUFTS,
  PIXEL_CLOUDS,
  POTION_VIALS,
  SCONCE_SPRITES,
} from '../pixel/sprites';
import {
  CANDLE_FLAMES_768,
  CARVED_RUNES_768,
  CAULDRONS_768,
  DUST_MOTES_768,
  HANGING_KEYS_768,
  HERB_TUFTS_768,
  PIXEL_CLOUDS_768,
  POTION_VIALS_768,
  SCENE_768_HEIGHT,
  SCENE_768_WIDTH,
  SCONCES_768,
} from '../pixel/sprites768';
import { GridPreset } from '../pixel/svgExport';
import {
  AtmosphereWeights,
  remapRoomColorWithWeights,
  ResolvedSceneTheme,
  resolveThemeForWeights,
  STARS_192,
  STARS_768,
  TimeOfDay,
  TimeOfDayMode,
  weightsForTimeOfDay,
} from '../pixel/timeOfDay';
import {
  RAIN_PARTICLES_192,
  RAIN_PARTICLES_768,
  resolveWeatherState,
  SNOW_PARTICLES_192,
  SNOW_PARTICLES_768,
  WeatherMode,
} from '../pixel/weather';

interface PixelSceneSvgProps {
  readonly gridPreset: GridPreset;
  readonly timeOfDay: TimeOfDay;
  readonly timeMode?: TimeOfDayMode;
  readonly atmosphere?: AtmosphereWeights;
  readonly cycleSecond?: number;
  readonly cycleDurationSeconds?: number;
  readonly weatherMode?: WeatherMode;
  readonly interactionMode: boolean;
  readonly glowingCursorEnabled?: boolean;
  readonly activeInteractions: readonly ActiveInteraction[];
  readonly catAppearance?: CatAppearance | null;
  readonly onTriggerInteraction: (id: InteractiveObjectId) => void;
  readonly enabledLayers: ReadonlySet<AnimationLayerId>;
  readonly highlightedLayer: AnimationLayerId | null;
  readonly paused: boolean;
  readonly speed: number;
  readonly showGrid: boolean;
}

function mapCloudColor(fill: string, theme: ResolvedSceneTheme): string {
  if (fill === '#FFFFFF' || fill === '#F6FAFF') return theme.cloudFills.top;
  if (fill === '#F0F6FC') return theme.cloudFills.mid;
  if (fill === '#DCEBF9') return theme.cloudFills.body;
  return theme.cloudFills.shadow;
}

const CAULDRON_768_ID_MAP: Record<string, InteractiveObjectId> = {
  'c768-back-left': 'cauldron-back-left',
  'c768-front-left': 'cauldron-front-left',
  'c768-back-right': 'cauldron-back-right',
  'c768-front-right': 'cauldron-front-right',
};

const SCONCE_768_ID_MAP: Record<string, InteractiveObjectId> = {
  'sconce768-left': 'sconce-left',
  'sconce768-right': 'sconce-right',
};

export const PixelSceneSvg: React.FC<PixelSceneSvgProps> = ({
  gridPreset,
  timeOfDay,
  timeMode,
  atmosphere,
  cycleSecond,
  cycleDurationSeconds = 24,
  weatherMode = 'auto',
  interactionMode,
  glowingCursorEnabled = true,
  activeInteractions,
  catAppearance = null,
  onTriggerInteraction,
  enabledLayers,
  highlightedLayer,
  paused,
  speed,
  showGrid,
}) => {
  const weights = useMemo(
    () => atmosphere ?? weightsForTimeOfDay(timeOfDay),
    [atmosphere, timeOfDay],
  );
  const theme = useMemo(
    () => resolveThemeForWeights(weights, timeOfDay),
    [weights, timeOfDay],
  );
  const weather = useMemo(
    () => resolveWeatherState(weatherMode, weights),
    [weatherMode, weights],
  );
  const glowPalette = useMemo(() => resolveCursorGlowPalette(weights), [weights]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPointRef = useRef<SceneCursorPoint | null>(null);
  const [cursor, setCursor] = useState<SceneCursorPoint | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const activeByObject = useMemo(() => {
    const map = new Map<InteractiveObjectId, ActiveInteraction>();
    for (const item of activeInteractions) {
      map.set(item.objectId, item);
    }
    return map;
  }, [activeInteractions]);

  const architecturePaths192 = useMemo(
    () =>
      ROOM_COLOR_LAYERS.map((layer) => ({
        hex: layer.hex,
        d: spansToSvgPath(layer.spans),
      })),
    [],
  );

  const architecturePaths768 = useMemo(
    () =>
      ROOM_COLOR_LAYERS_768.map((layer) => ({
        hex: layer.hex,
        d: rectsB64ToSvgPath(layer.rectsB64),
      })),
    [],
  );

  const runeCenters768 = useMemo(
    () => CARVED_RUNES_768.map((r) => getRuneCenter(r.pixels, 2)),
    [],
  );

  const runeCenters192 = useMemo(
    () => CARVED_RUNES.map((r) => getRuneCenter(r.pixels, 1)),
    [],
  );

  const handleObjectKeyDown = (
    e: React.KeyboardEvent<SVGGElement>,
    objectId: InteractiveObjectId,
  ) => {
    if (!interactionMode) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTriggerInteraction(objectId);
    }
  };

  const layerOpacity = (id: AnimationLayerId) => {
    if (!highlightedLayer) return 1;
    return highlightedLayer === id ? 1 : 0.25;
  };

  const is768 = gridPreset === '768x512';
  const viewW = is768 ? SCENE_768_WIDTH : SCENE_WIDTH;
  const viewH = is768 ? SCENE_768_HEIGHT : SCENE_HEIGHT;
  const activeInteractionList = activeInteractions.map((a) => a.objectId).join(',');

  useEffect(() => {
    if (!glowingCursorEnabled) {
      setCursor(null);
    }
  }, [glowingCursorEnabled]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!glowingCursorEnabled) return;
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const point = clientPointToSvgCoords(
        e.clientX,
        e.clientY,
        svgEl.getBoundingClientRect(),
        viewW,
        viewH,
      );
      if (!point) return;
      pendingPointRef.current = point;
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          setCursor(pendingPointRef.current);
        });
      }
    },
    [glowingCursorEnabled, viewW, viewH],
  );

  const handlePointerLeave = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPointRef.current = null;
    setCursor(null);
  }, []);

  if (is768) {
    const runeSurge = activeByObject.get('cabinet-runes');
    const leftRackFizz = activeByObject.get('potion-rack-left');
    const rightRackFizz = activeByObject.get('potion-rack-right');
    const runeProximities768 = runeCenters768.map((center) =>
      computeProximityFactor(center.x, center.y, cursor, 72),
    );
    const moteProximities768 = DUST_MOTES_768.map((m) =>
      computeProximityFactor(m.x, m.y, cursor, 78),
    );
    const litCount768 =
      runeProximities768.filter((p) => p > 0.05).length +
      moteProximities768.filter((p) => p > 0.05).length;

    return (
      <svg
        ref={svgRef}
        data-testid="pixel-scene-svg"
        data-grid={gridPreset}
        data-time={timeOfDay}
        data-time-mode={timeMode ?? timeOfDay}
        data-cycle-second={timeMode === 'cycle24' ? String(cycleSecond ?? 0) : undefined}
        data-cycle-duration={timeMode === 'cycle24' ? String(cycleDurationSeconds) : undefined}
        data-weather={weather.kind}
        data-interaction-mode={interactionMode ? 'true' : 'false'}
        data-active-interactions={activeInteractionList}
        data-cursor-active={cursor ? 'true' : 'false'}
        data-lit-elements={String(litCount768)}
        data-paused={paused ? 'true' : 'false'}
        data-speed={String(speed)}
        viewBox={`0 0 ${viewW} ${viewH}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`Animated 768 by 512 high-detail SVG pixel art of the ${theme.subtitle.toLowerCase()} classroom with drifting sky clouds, bubbling cauldrons, flickering sconces, glowing cabinet runes, potion racks, hanging keys, and dust motes.`}
        className="pixel-svg block h-full w-full select-none"
        style={{ '--anim-speed': String(speed) } as React.CSSProperties}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
      >
        <defs>
          <clipPath id="scene-sky-clip-768">
            <rect x="0" y="0" width={SCENE_768_WIDTH} height="128" />
          </clipPath>
          <radialGradient id="cursor-glow-grad-768" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glowPalette.core} stopOpacity="0.34" />
            <stop offset="45%" stopColor={glowPalette.mid} stopOpacity="0.16" />
            <stop offset="100%" stopColor={glowPalette.halo} stopOpacity="0" />
          </radialGradient>
          <pattern
            id="pixel-grid-pattern-768"
            width="1"
            height="1"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 1 0 L 0 0 0 1"
              fill="none"
              stroke="rgba(255, 248, 232, 0.16)"
              strokeWidth="0.12"
            />
          </pattern>
        </defs>

        {/* Layer 0: Time-of-Day Sky Gradient + Stars & Moon */}
        <g
          id="layer-sky"
          style={{ opacity: highlightedLayer && highlightedLayer !== 'clouds' ? 0.85 : 1 }}
        >
          {theme.skyBands768.map((color, idx) => (
            <rect
              key={`${timeOfDay}-sky-${idx}`}
              x={0}
              y={idx * 16}
              width={SCENE_768_WIDTH}
              height={16}
              fill={color}
            />
          ))}

          {theme.showStars && (
            <g id="layer-stars" data-testid="layer-stars" opacity={theme.starOpacity}>
              {STARS_768.map((s, idx) => (
                <rect
                  key={`star-${idx}`}
                  className="anim-star"
                  style={{ animationDelay: s.delay }}
                  x={s.x}
                  y={s.y}
                  width={2}
                  height={2}
                  fill={s.color}
                />
              ))}
            </g>
          )}

          {theme.showMoon && (
            <g id="layer-moon" data-testid="layer-moon" opacity={theme.moonOpacity}>
              <rect x="498" y="10" width="12" height="2" fill="#EAF3FF" />
              <rect x="494" y="12" width="10" height="3" fill="#EAF3FF" />
              <rect x="491" y="15" width="8" height="4" fill="#DCEBFF" />
              <rect x="490" y="19" width="7" height="7" fill="#DCEBFF" />
              <rect x="491" y="26" width="8" height="4" fill="#C4DCFA" />
              <rect x="494" y="30" width="10" height="3" fill="#B8D4F8" />
              <rect x="498" y="33" width="12" height="2" fill="#A9C8F2" />
            </g>
          )}
        </g>

        {/* Layer 1: High-Detail Drifting Clouds & Sky Birds */}
        {enabledLayers.has('clouds') && (
          <g
            id="layer-clouds"
            data-testid="layer-clouds"
            clipPath="url(#scene-sky-clip-768)"
            style={{ opacity: layerOpacity('clouds') }}
          >
            {PIXEL_CLOUDS_768.map((cloud) => {
              const cls = cloud.speed === 'slow' ? 'anim-cloud-slow-768' : 'anim-cloud-med-768';
              const wrapOffset = cloud.speed === 'slow' ? -SCENE_768_WIDTH : SCENE_768_WIDTH;
              return (
                <g key={cloud.id} className={cls} style={{ animationDelay: cloud.delay }}>
                  {cloud.rects.map((r, idx) => (
                    <rect
                      key={`a-${idx}`}
                      x={r.x}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      fill={mapCloudColor(r.fill, theme)}
                    />
                  ))}
                  {cloud.rects.map((r, idx) => (
                    <rect
                      key={`b-${idx}`}
                      x={r.x + wrapOffset}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      fill={mapCloudColor(r.fill, theme)}
                    />
                  ))}
                </g>
              );
            })}
            <g className="anim-bird-768">
              <rect x="344" y="32" width="2" height="2" fill={theme.birdColor} />
              <rect x="346" y="34" width="2" height="2" fill={theme.birdColor} />
              <rect x="348" y="32" width="2" height="2" fill={theme.birdColor} />
            </g>
            <g className="anim-bird-768" style={{ animationDelay: '-7s' }}>
              <rect x="430" y="24" width="2" height="2" fill={theme.birdColor} />
              <rect x="432" y="26" width="2" height="2" fill={theme.birdColor} />
              <rect x="434" y="24" width="2" height="2" fill={theme.birdColor} />
            </g>
          </g>
        )}

        {/* Layer 2: 768x512 Room Architecture with Time-of-Day Color Remapping */}
        <g
          id="layer-architecture"
          style={{ opacity: highlightedLayer ? 0.65 : 1, transition: 'opacity 180ms ease' }}
        >
          {architecturePaths768.map((p) => (
            <path key={p.hex} d={p.d} fill={remapRoomColorWithWeights(p.hex, weights)} />
          ))}
        </g>

        {/* Layer 3: Swaying Hanging Keys & Dried Herbs */}
        {enabledLayers.has('herbsAndKeys') && (
          <g
            id="layer-herbs-keys"
            data-testid="layer-herbs-keys"
            style={{ opacity: layerOpacity('herbsAndKeys') }}
          >
            {HERB_TUFTS_768.map((h, idx) => (
              <rect
                key={`herb-${idx}`}
                className="anim-herb-768"
                style={{ animationDelay: h.delay }}
                x={h.x}
                y={h.y}
                width={h.w}
                height={h.h}
                fill={remapRoomColorWithWeights(h.color, weights)}
              />
            ))}
            {HANGING_KEYS_768.map((k) => (
              <g key={k.id} className="anim-key" style={{ animationDelay: k.delay }}>
                <rect x={k.x} y={k.y} width={2} height={3} fill={k.glint} />
                <rect x={k.x} y={k.y + 3} width={2} height={14} fill={k.color} opacity="0.72" />
                <rect x={k.x + 2} y={k.y + 15} width={2} height={2} fill={k.glint} />
              </g>
            ))}
          </g>
        )}

        {/* Layer 4: Bookcase Wall Sconces & Counter Candlesticks */}
        {enabledLayers.has('lanterns') && (
          <g
            id="layer-lanterns"
            data-testid="layer-lanterns"
            style={{ opacity: layerOpacity('lanterns') }}
          >
            {SCONCES_768.map((s) => {
              const objId = SCONCE_768_ID_MAP[s.id];
              const active = activeByObject.get(objId);
              const meta = INTERACTIVE_OBJECTS[objId];
              return (
                <g key={s.id}>
                  <g
                    className="anim-halo"
                    style={{
                      animationDelay: s.delay,
                      opacity: active ? 0.92 : timeOfDay === 'day' ? undefined : 0.72,
                    }}
                  >
                    {s.halo.map((r, idx) => (
                      <rect
                        key={idx}
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill={active ? meta.primaryColor : r.fill}
                        opacity={active ? 0.72 : theme.haloOpacityBoost > 1 ? 0.65 : 1}
                      />
                    ))}
                  </g>
                  <g className="anim-flame" style={{ animationDelay: s.delay }}>
                    {s.flame.map((r, idx) => (
                      <rect
                        key={idx}
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill={
                          active
                            ? idx >= 2
                              ? meta.secondaryColor
                              : meta.primaryColor
                            : r.fill
                        }
                      />
                    ))}
                  </g>
                </g>
              );
            })}
            {CANDLE_FLAMES_768.map((c, idx) => (
              <g key={`candle-${idx}`} className="anim-flame" style={{ animationDelay: c.delay }}>
                <rect x={c.x} y={c.y} width={2} height={2} fill="#FFF4B8" />
                <rect x={c.x} y={c.y + 2} width={2} height={3} fill="#FFAA33" />
              </g>
            ))}
          </g>
        )}

        {/* Layer 5: Carved Cabinet Door Runes */}
        {enabledLayers.has('runes') && (
          <g
            id="layer-runes"
            data-testid="layer-runes"
            style={{ opacity: layerOpacity('runes') }}
          >
            {CARVED_RUNES_768.map((rune, rIdx) => {
              const proximity = runeProximities768[rIdx];
              const baseFill = timeOfDay === 'moonlit' ? '#FFE58F' : '#FFD878';
              const runeFill = runeSurge
                ? rIdx % 2 === 0
                  ? INTERACTIVE_OBJECTS['cabinet-runes'].primaryColor
                  : INTERACTIVE_OBJECTS['cabinet-runes'].secondaryColor
                : proximity > 0
                  ? blendHexToward(baseFill, glowPalette.boostTarget, proximity * 0.9)
                  : baseFill;
              const isLit = proximity > 0.05;
              return (
                <g
                  key={rune.id}
                  data-lit={isLit ? 'true' : 'false'}
                  className={runeSurge ? 'anim-rune-surge' : 'anim-rune'}
                  style={{
                    animationDelay: runeSurge ? `${rIdx * 45}ms` : rune.delay,
                    opacity: !runeSurge && isLit ? Math.min(1, 0.78 + proximity * 0.22) : undefined,
                  }}
                >
                  {rune.pixels.map((p, idx) => (
                    <rect
                      key={idx}
                      x={p.x}
                      y={p.y}
                      width={p.w ?? 2}
                      height={p.h ?? 2}
                      fill={runeFill}
                    />
                  ))}
                </g>
              );
            })}
          </g>
        )}

        {/* Layer 6: Test-Tube Potion Racks */}
        {enabledLayers.has('potions') && (
          <g
            id="layer-potions"
            data-testid="layer-potions"
            style={{ opacity: layerOpacity('potions') }}
          >
            {POTION_VIALS_768.map((v, idx) => {
              const rackActive = idx < 5 ? leftRackFizz : rightRackFizz;
              const rackMeta =
                idx < 5
                  ? INTERACTIVE_OBJECTS['potion-rack-left']
                  : INTERACTIVE_OBJECTS['potion-rack-right'];
              return (
                <g key={`vial-${idx}`}>
                  <rect
                    x={v.x}
                    y={v.y}
                    width={2}
                    height={6}
                    fill={rackActive ? (idx % 2 === 0 ? rackMeta.primaryColor : rackMeta.secondaryColor) : v.color}
                    opacity={rackActive ? '1' : '0.88'}
                  />
                  <rect
                    className="anim-bubble-768"
                    style={{ animationDelay: v.delay }}
                    x={v.x}
                    y={v.y}
                    width={2}
                    height={2}
                    fill={rackActive ? '#FFFFFF' : v.highlight}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Layer 7: 4 Cauldrons Simmering Brew & Multi-Strand Pixel Steam */}
        <g
          id="layer-cauldrons"
          data-testid="layer-cauldrons"
          style={{
            opacity: highlightedLayer && highlightedLayer !== 'cauldrons' ? 0.55 : 1,
          }}
        >
          {CAULDRONS_768.map((cauldron) => {
            const objId = CAULDRON_768_ID_MAP[cauldron.id];
            const active = activeByObject.get(objId);
            const meta = INTERACTIVE_OBJECTS[objId];
            return (
              <g key={cauldron.id}>
                {enabledLayers.has('cauldrons') && (
                  <>
                    <g className="anim-simmer-768">
                      {cauldron.simmerRects.map((r, idx) => (
                        <rect
                          key={idx}
                          x={r.x}
                          y={r.y}
                          width={r.w}
                          height={r.h}
                          fill={
                            active
                              ? idx === 0
                                ? meta.primaryColor
                                : meta.secondaryColor
                              : r.fill
                          }
                        />
                      ))}
                    </g>
                    {cauldron.steamWisps.map((s, idx) => (
                      <rect
                        key={`steam-${idx}`}
                        className="anim-steam-768"
                        style={{ animationDelay: s.delay }}
                        x={s.x}
                        y={s.y}
                        width={s.w}
                        height={s.h}
                        fill={active ? meta.smokeColor : theme.steamColor}
                      />
                    ))}
                  </>
                )}
              </g>
            );
          })}
        </g>

        {/* Layer 8: Sunlit / Moonlit Dust Motes */}
        {enabledLayers.has('motes') && (
          <g
            id="layer-motes"
            data-testid="layer-motes"
            style={{ opacity: layerOpacity('motes') }}
          >
            {DUST_MOTES_768.map((m, idx) => {
              const proximity = moteProximities768[idx];
              const baseFill = theme.motePalette[idx % theme.motePalette.length];
              const moteFill =
                proximity > 0
                  ? blendHexToward(baseFill, glowPalette.boostTarget, proximity * 0.92)
                  : baseFill;
              const isLit = proximity > 0.05;
              return (
                <g key={`mote-${idx}`} data-lit={isLit ? 'true' : 'false'}>
                  {proximity > 0.25 && (
                    <rect
                      x={m.x - 1}
                      y={m.y - 1}
                      width={m.size + 2}
                      height={m.size + 2}
                      fill={glowPalette.mid}
                      opacity={Number((proximity * 0.48).toFixed(2))}
                      className="anim-mote-768"
                      style={{ animationDelay: m.delay }}
                    />
                  )}
                  <rect
                    className="anim-mote-768"
                    style={{ animationDelay: m.delay }}
                    x={m.x}
                    y={m.y}
                    width={m.size}
                    height={m.size}
                    fill={moteFill}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Hidden Alchemist's Cat Easter Egg (768x512) */}
        {catAppearance && (
          <g
            key={catAppearance.instanceId}
            id="layer-alchemist-cat"
            data-testid="layer-alchemist-cat"
            data-reason={catAppearance.reason}
            className="pointer-events-none"
          >
            <g className="anim-cat-mist">
              <rect x={410} y={260} width={6} height={4} fill="#D6B8FF" opacity="0.85" />
              <rect x={432} y={258} width={6} height={4} fill="#52D1A2" opacity="0.82" />
              <rect x={422} y={252} width={4} height={4} fill="#FFF4B8" opacity="0.9" />
              <rect x={442} y={262} width={6} height={4} fill="#D6B8FF" opacity="0.8" />
            </g>
            <g className="anim-cat-appear-768">
              <g className="anim-cat-tail">
                {CAT_TAIL_768.map((r, i) => (
                  <rect key={`ct768-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
                ))}
              </g>
              <g className="anim-cat-breath">
                {CAT_BODY_768.map((r, i) => (
                  <rect key={`cb768-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
                ))}
                <g className="anim-cat-blink">
                  {CAT_EYES_768.map((r, i) => (
                    <rect key={`ce768-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
                  ))}
                </g>
              </g>
              <g className="anim-rune">
                <rect x={421} y={214} width={2} height={2} fill="#FFE27A" />
                <rect x={436} y={218} width={2} height={2} fill="#52D1A2" />
              </g>
            </g>
          </g>
        )}

        {/* Layer 9: One-Time Triggered Interaction Sequences */}
        <g id="layer-interactions" data-testid="layer-interactions" className="pointer-events-none">
          {activeInteractions.map((event) => {
            const meta = INTERACTIVE_OBJECTS[event.objectId];
            const { originX, originY } = meta.box768;

            if (meta.kind === 'smoke-puff') {
              return (
                <g key={event.instanceId} data-testid={`effect-${event.objectId}`}>
                  <g className="anim-smoke-rise-768">
                    <rect x={originX - 10} y={originY - 8} width="20" height="8" fill={meta.smokeColor} opacity="0.88" />
                    <rect x={originX - 14} y={originY - 14} width="28" height="8" fill={meta.smokeColor} opacity="0.92" />
                    <rect x={originX - 8} y={originY - 22} width="16" height="8" fill={meta.secondaryColor} opacity="0.9" />
                    <rect x={originX - 4} y={originY - 28} width="10" height="6" fill={meta.primaryColor} opacity="0.82" />
                  </g>
                  <g className="anim-smoke-left-768">
                    <rect x={originX - 16} y={originY - 10} width="8" height="6" fill={meta.smokeColor} />
                    <rect x={originX - 12} y={originY - 18} width="4" height="4" fill={meta.primaryColor} />
                  </g>
                  <g className="anim-smoke-right-768">
                    <rect x={originX + 8} y={originY - 12} width="8" height="6" fill={meta.smokeColor} />
                    <rect x={originX + 10} y={originY - 20} width="4" height="4" fill={meta.secondaryColor} />
                  </g>
                </g>
              );
            }

            if (meta.kind === 'arcane-flare') {
              return (
                <g key={event.instanceId} data-testid={`effect-${event.objectId}`}>
                  <g className="anim-arcane-flare">
                    <rect x={originX - 12} y={originY - 16} width="24" height="32" fill={meta.primaryColor} opacity="0.32" />
                    <rect x={originX - 6} y={originY - 12} width="12" height="22" fill={meta.secondaryColor} opacity="0.55" />
                    <rect x={originX - 2} y={originY - 22} width="4" height="8" fill={meta.secondaryColor} />
                  </g>
                  <g className="anim-smoke-rise-768">
                    <rect x={originX - 6} y={originY - 20} width="4" height="4" fill={meta.primaryColor} />
                    <rect x={originX + 4} y={originY - 26} width="4" height="4" fill={meta.secondaryColor} />
                    <rect x={originX - 2} y={originY - 34} width="6" height="4" fill={meta.smokeColor} opacity="0.85" />
                  </g>
                </g>
              );
            }

            if (meta.kind === 'rune-surge') {
              return (
                <g key={event.instanceId} data-testid={`effect-${event.objectId}`}>
                  <g className="anim-smoke-rise-768">
                    <rect x={originX - 38} y={originY - 14} width="4" height="4" fill={meta.primaryColor} />
                    <rect x={originX - 12} y={originY - 22} width="4" height="4" fill={meta.secondaryColor} />
                    <rect x={originX + 14} y={originY - 18} width="4" height="4" fill={meta.primaryColor} />
                    <rect x={originX + 36} y={originY - 12} width="4" height="4" fill={meta.secondaryColor} />
                  </g>
                </g>
              );
            }

            return (
              <g key={event.instanceId} data-testid={`effect-${event.objectId}`}>
                <g className="anim-potion-fizz-768">
                  <rect x={originX - 10} y={originY - 6} width="4" height="4" fill={meta.primaryColor} />
                  <rect x={originX - 2} y={originY - 10} width="4" height="4" fill={meta.secondaryColor} />
                  <rect x={originX + 6} y={originY - 8} width="4" height="4" fill="#FFFFFF" />
                  <rect x={originX - 6} y={originY - 16} width="12" height="5" fill={meta.smokeColor} opacity="0.85" />
                </g>
              </g>
            );
          })}
        </g>

        {/* Dynamic Atmospheric Weather Particles Overlay (768x512) */}
        {weather.kind !== 'none' && (
          <g
            id="layer-weather"
            data-testid="layer-weather"
            data-weather-kind={weather.kind}
            opacity={weather.opacity}
            className="pointer-events-none"
          >
            {(weather.kind === 'rain' ? RAIN_PARTICLES_768 : SNOW_PARTICLES_768).map((p, idx) => (
              <rect
                key={`w768-${weather.kind}-${idx}`}
                className={weather.kind === 'rain' ? 'anim-rain-768' : 'anim-snow-768'}
                style={
                  {
                    animationDelay: p.delay,
                    '--weather-dur': p.duration,
                  } as React.CSSProperties
                }
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                fill={p.color}
                opacity={p.opacity}
              />
            ))}
          </g>
        )}

        {/* Layer 10: Interactive Hit Targets (active in Interaction Mode) */}
        {interactionMode && (
          <g id="layer-interaction-hitboxes" data-testid="layer-interaction-hitboxes">
            {INTERACTIVE_OBJECT_IDS.map((id) => {
              const meta = INTERACTIVE_OBJECTS[id];
              const box = meta.box768;
              return (
                <g
                  key={id}
                  role="button"
                  tabIndex={0}
                  aria-label={meta.ariaLabel}
                  data-testid={`interactive-${id}`}
                  className="interactive-target"
                  onClick={() => onTriggerInteraction(id)}
                  onKeyDown={(e) => handleObjectKeyDown(e, id)}
                >
                  <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="transparent" />
                </g>
              );
            })}
          </g>
        )}

        {/* Layer 11: Glowing Cursor Follow Aura */}
        {cursor && (
          <g
            id="layer-cursor-glow"
            data-testid="layer-cursor-glow"
            className="pointer-events-none"
          >
            <circle
              cx={cursor.x}
              cy={cursor.y}
              r={54}
              fill="url(#cursor-glow-grad-768)"
            />
            <rect
              x={Math.round(cursor.x) - 1}
              y={Math.round(cursor.y) - 1}
              width={2}
              height={2}
              fill={glowPalette.core}
              opacity="0.88"
            />
            <rect
              x={Math.round(cursor.x) - 3}
              y={Math.round(cursor.y)}
              width={1}
              height={1}
              fill={glowPalette.mid}
              opacity="0.6"
            />
            <rect
              x={Math.round(cursor.x) + 2}
              y={Math.round(cursor.y)}
              width={1}
              height={1}
              fill={glowPalette.mid}
              opacity="0.6"
            />
            <rect
              x={Math.round(cursor.x)}
              y={Math.round(cursor.y) - 3}
              width={1}
              height={1}
              fill={glowPalette.mid}
              opacity="0.6"
            />
            <rect
              x={Math.round(cursor.x)}
              y={Math.round(cursor.y) + 2}
              width={1}
              height={1}
              fill={glowPalette.mid}
              opacity="0.6"
            />
          </g>
        )}

        {/* Optional 768x512 Pixel Grid Overlay */}
        {showGrid && (
          <rect
            data-testid="pixel-grid-overlay"
            x="0"
            y="0"
            width={SCENE_768_WIDTH}
            height={SCENE_768_HEIGHT}
            fill="url(#pixel-grid-pattern-768)"
            className="pointer-events-none"
          />
        )}
      </svg>
    );
  }

  const runeSurge192 = activeByObject.get('cabinet-runes');
  const leftRackFizz192 = activeByObject.get('potion-rack-left');
  const rightRackFizz192 = activeByObject.get('potion-rack-right');
  const runeProximities192 = runeCenters192.map((center) =>
    computeProximityFactor(center.x, center.y, cursor, 18),
  );
  const moteProximities192 = DUST_MOTES.map((m) =>
    computeProximityFactor(m.x, m.y, cursor, 20),
  );
  const litCount192 =
    runeProximities192.filter((p) => p > 0.05).length +
    moteProximities192.filter((p) => p > 0.05).length;

  return (
    <svg
      ref={svgRef}
      data-testid="pixel-scene-svg"
      data-grid={gridPreset}
      data-time={timeOfDay}
      data-time-mode={timeMode ?? timeOfDay}
      data-cycle-second={timeMode === 'cycle24' ? String(cycleSecond ?? 0) : undefined}
      data-cycle-duration={timeMode === 'cycle24' ? String(cycleDurationSeconds) : undefined}
      data-weather={weather.kind}
      data-interaction-mode={interactionMode ? 'true' : 'false'}
      data-active-interactions={activeInteractionList}
      data-cursor-active={cursor ? 'true' : 'false'}
      data-lit-elements={String(litCount192)}
      data-paused={paused ? 'true' : 'false'}
      data-speed={String(speed)}
      viewBox={`0 0 ${viewW} ${viewH}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Animated 192 by 128 SVG pixel art of the ${theme.subtitle.toLowerCase()} classroom with drifting sky clouds, bubbling cauldrons, flickering sconces, glowing cabinet runes, potion racks, hanging keys, and dust motes.`}
      className="pixel-svg block h-full w-full select-none"
      style={{ '--anim-speed': String(speed) } as React.CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
    >
      <defs>
        <clipPath id="scene-sky-clip">
          <rect x="0" y="0" width={SCENE_WIDTH} height="32" />
        </clipPath>
        <radialGradient id="cursor-glow-grad-192" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={glowPalette.core} stopOpacity="0.34" />
          <stop offset="45%" stopColor={glowPalette.mid} stopOpacity="0.16" />
          <stop offset="100%" stopColor={glowPalette.halo} stopOpacity="0" />
        </radialGradient>
        <pattern
          id="pixel-grid-pattern"
          width="1"
          height="1"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 1 0 L 0 0 0 1"
            fill="none"
            stroke="rgba(255, 248, 232, 0.22)"
            strokeWidth="0.08"
          />
        </pattern>
      </defs>

      <g
        id="layer-sky"
        style={{ opacity: highlightedLayer && highlightedLayer !== 'clouds' ? 0.85 : 1 }}
      >
        {theme.skyBands192.map((color, idx) => (
          <rect
            key={`${timeOfDay}-sky192-${idx}`}
            x={0}
            y={idx * 8}
            width={SCENE_WIDTH}
            height={8}
            fill={color}
          />
        ))}
        {theme.showStars && (
          <g id="layer-stars" data-testid="layer-stars" opacity={theme.starOpacity}>
            {STARS_192.map((s, idx) => (
              <rect
                key={`star192-${idx}`}
                className="anim-star"
                style={{ animationDelay: s.delay }}
                x={s.x}
                y={s.y}
                width={1}
                height={1}
                fill={s.color}
              />
            ))}
          </g>
        )}
        {theme.showMoon && (
          <g id="layer-moon" data-testid="layer-moon" opacity={theme.moonOpacity}>
            <rect x="124" y="3" width="3" height="1" fill="#EAF3FF" />
            <rect x="123" y="4" width="2" height="2" fill="#DCEBFF" />
            <rect x="124" y="6" width="3" height="1" fill="#BFD8FA" />
          </g>
        )}
      </g>

      {enabledLayers.has('clouds') && (
        <g
          id="layer-clouds"
          data-testid="layer-clouds"
          clipPath="url(#scene-sky-clip)"
          style={{ opacity: layerOpacity('clouds') }}
        >
          {PIXEL_CLOUDS.map((cloud) => {
            const cls = cloud.speed === 'slow' ? 'anim-cloud-slow' : 'anim-cloud-med';
            const wrapOffset = cloud.speed === 'slow' ? -SCENE_WIDTH : SCENE_WIDTH;
            return (
              <g key={cloud.id} className={cls} style={{ animationDelay: cloud.delay }}>
                {cloud.rects.map((r, idx) => (
                  <rect
                    key={`a-${idx}`}
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    fill={mapCloudColor(r.fill, theme)}
                  />
                ))}
                {cloud.rects.map((r, idx) => (
                  <rect
                    key={`b-${idx}`}
                    x={r.x + wrapOffset}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    fill={mapCloudColor(r.fill, theme)}
                  />
                ))}
              </g>
            );
          })}
          <g className="anim-bird">
            <rect x="86" y="8" width="1" height="1" fill={theme.birdColor} />
            <rect x="87" y="9" width="1" height="1" fill={theme.birdColor} />
            <rect x="88" y="8" width="1" height="1" fill={theme.birdColor} />
          </g>
          <g className="anim-bird" style={{ animationDelay: '-8s' }}>
            <rect x="108" y="6" width="1" height="1" fill={theme.birdColor} />
            <rect x="109" y="7" width="1" height="1" fill={theme.birdColor} />
            <rect x="110" y="6" width="1" height="1" fill={theme.birdColor} />
          </g>
        </g>
      )}

      <g
        id="layer-architecture"
        style={{ opacity: highlightedLayer ? 0.65 : 1, transition: 'opacity 180ms ease' }}
      >
        {architecturePaths192.map((p) => (
          <path key={p.hex} d={p.d} fill={remapRoomColorWithWeights(p.hex, weights)} />
        ))}
      </g>

      {enabledLayers.has('herbsAndKeys') && (
        <g
          id="layer-herbs-keys"
          data-testid="layer-herbs-keys"
          style={{ opacity: layerOpacity('herbsAndKeys') }}
        >
          {HERB_TUFTS.map((h, idx) => (
            <rect
              key={`herb-${idx}`}
              className="anim-herb"
              style={{ animationDelay: h.delay }}
              x={h.x}
              y={h.y}
              width={h.w}
              height={1}
              fill={remapRoomColorWithWeights(h.color, weights)}
            />
          ))}
          <rect
            x="91"
            y="84"
            width="16"
            height="8"
            fill={remapRoomColorWithWeights('#110F0A', weights)}
            opacity="0.88"
          />
          {HANGING_KEYS.map((k) => (
            <g key={k.id} className="anim-key" style={{ animationDelay: k.delay }}>
              <rect x={k.x} y={k.y} width={1} height={1} fill={k.glint} />
              <rect x={k.x} y={k.y + 1} width={1} height={4} fill={k.color} />
              <rect x={k.x + 1} y={k.y + 4} width={1} height={1} fill={k.glint} />
            </g>
          ))}
        </g>
      )}

      {enabledLayers.has('lanterns') && (
        <g
          id="layer-lanterns"
          data-testid="layer-lanterns"
          style={{ opacity: layerOpacity('lanterns') }}
        >
          {SCONCE_SPRITES.map((s) => {
            const objId = s.id as InteractiveObjectId;
            const active = activeByObject.get(objId);
            const meta = INTERACTIVE_OBJECTS[objId];
            return (
              <g key={s.id}>
                <g
                  className="anim-halo"
                  style={{
                    animationDelay: s.delay,
                    opacity: active ? 0.92 : undefined,
                  }}
                >
                  {s.halo.map((r, idx) => (
                    <rect
                      key={idx}
                      x={r.x}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      fill={active ? meta.primaryColor : r.fill}
                      opacity={active ? 0.72 : theme.haloOpacityBoost > 1 ? 0.65 : 1}
                    />
                  ))}
                </g>
                <g className="anim-flame" style={{ animationDelay: s.delay }}>
                  {s.flame.map((r, idx) => (
                    <rect
                      key={idx}
                      x={r.x}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      fill={
                        active
                          ? idx >= 2
                            ? meta.secondaryColor
                            : meta.primaryColor
                          : r.fill
                      }
                    />
                  ))}
                </g>
              </g>
            );
          })}
          {CANDLE_FLAMES.map((c, idx) => (
            <g key={`candle-${idx}`} className="anim-flame" style={{ animationDelay: c.delay }}>
              <rect x={c.x} y={c.y} width={1} height={1} fill="#FFF4B8" />
              <rect x={c.x} y={c.y + 1} width={1} height={1} fill="#FFAA33" />
            </g>
          ))}
        </g>
      )}

      {enabledLayers.has('runes') && (
        <g
          id="layer-runes"
          data-testid="layer-runes"
          style={{ opacity: layerOpacity('runes') }}
        >
          {CARVED_RUNES.map((rune, rIdx) => {
            const proximity = runeProximities192[rIdx];
            const baseFill = timeOfDay === 'moonlit' ? '#FFE58F' : '#FFD878';
            const runeFill = runeSurge192
              ? rIdx % 2 === 0
                ? INTERACTIVE_OBJECTS['cabinet-runes'].primaryColor
                : INTERACTIVE_OBJECTS['cabinet-runes'].secondaryColor
              : proximity > 0
                ? blendHexToward(baseFill, glowPalette.boostTarget, proximity * 0.9)
                : baseFill;
            const isLit = proximity > 0.05;
            return (
              <g
                key={rune.id}
                data-lit={isLit ? 'true' : 'false'}
                className={runeSurge192 ? 'anim-rune-surge' : 'anim-rune'}
                style={{
                  animationDelay: runeSurge192 ? `${rIdx * 45}ms` : rune.delay,
                  opacity: !runeSurge192 && isLit ? Math.min(1, 0.78 + proximity * 0.22) : undefined,
                }}
              >
                {rune.pixels.map((p, idx) => (
                  <rect
                    key={idx}
                    x={p.x}
                    y={p.y}
                    width={p.w ?? 1}
                    height={p.h ?? 1}
                    fill={runeFill}
                  />
                ))}
              </g>
            );
          })}
        </g>
      )}

      {enabledLayers.has('potions') && (
        <g
          id="layer-potions"
          data-testid="layer-potions"
          style={{ opacity: layerOpacity('potions') }}
        >
          <rect x="71" y="67" width="9" height="1" fill={remapRoomColorWithWeights('#966338', weights)} />
          <rect x="71" y="70" width="9" height="1" fill={remapRoomColorWithWeights('#72492C', weights)} />
          <rect x="87" y="66" width="9" height="1" fill={remapRoomColorWithWeights('#966338', weights)} />
          <rect x="87" y="70" width="9" height="1" fill={remapRoomColorWithWeights('#72492C', weights)} />
          {POTION_VIALS.map((v, idx) => {
            const rackActive = idx < 4 ? leftRackFizz192 : rightRackFizz192;
            const rackMeta =
              idx < 4
                ? INTERACTIVE_OBJECTS['potion-rack-left']
                : INTERACTIVE_OBJECTS['potion-rack-right'];
            return (
              <g key={`vial-${idx}`}>
                <rect
                  x={v.x}
                  y={v.y}
                  width={1}
                  height={2}
                  fill={rackActive ? (idx % 2 === 0 ? rackMeta.primaryColor : rackMeta.secondaryColor) : v.color}
                />
                <rect
                  className="anim-bubble"
                  style={{ animationDelay: v.delay }}
                  x={v.x}
                  y={v.y}
                  width={1}
                  height={1}
                  fill={rackActive ? '#FFFFFF' : v.highlight}
                />
              </g>
            );
          })}
        </g>
      )}

      <g
        id="layer-cauldrons"
        data-testid="layer-cauldrons"
        style={{
          opacity: highlightedLayer && highlightedLayer !== 'cauldrons' ? 0.55 : 1,
        }}
      >
        {CAULDRON_SPRITES.map((cauldron) => {
          const objId = cauldron.id as InteractiveObjectId;
          const active = activeByObject.get(objId);
          const meta = INTERACTIVE_OBJECTS[objId];
          return (
            <g key={cauldron.id}>
              {cauldron.body.map((r, idx) => (
                <rect
                  key={idx}
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill={remapRoomColorWithWeights(r.fill, weights)}
                />
              ))}
              {enabledLayers.has('cauldrons') && (
                <>
                  <g className="anim-simmer">
                    <rect
                      x={cauldron.x + 2}
                      y={cauldron.y + 1}
                      width={3}
                      height={1}
                      fill={active ? meta.primaryColor : cauldron.brewColor}
                    />
                    <rect
                      x={cauldron.x + 3}
                      y={cauldron.y + 1}
                      width={1}
                      height={1}
                      fill={active ? meta.secondaryColor : cauldron.brewHighlight}
                    />
                  </g>
                  {cauldron.steam.map((s, idx) => (
                    <rect
                      key={`steam-${idx}`}
                      className="anim-steam"
                      style={{ animationDelay: s.delay }}
                      x={s.x}
                      y={s.y}
                      width={s.w}
                      height={1}
                      fill={active ? meta.smokeColor : theme.steamColor}
                    />
                  ))}
                </>
              )}
            </g>
          );
        })}
      </g>

      {enabledLayers.has('motes') && (
        <g
          id="layer-motes"
          data-testid="layer-motes"
          style={{ opacity: layerOpacity('motes') }}
        >
          {DUST_MOTES.map((m, idx) => {
            const proximity = moteProximities192[idx];
            const baseFill = theme.motePalette[idx % theme.motePalette.length];
            const moteFill =
              proximity > 0
                ? blendHexToward(baseFill, glowPalette.boostTarget, proximity * 0.92)
                : baseFill;
            const isLit = proximity > 0.05;
            return (
              <rect
                key={`mote-${idx}`}
                data-lit={isLit ? 'true' : 'false'}
                className="anim-mote"
                style={{ animationDelay: m.delay }}
                x={m.x}
                y={m.y}
                width={1}
                height={1}
                fill={moteFill}
              />
            );
          })}
        </g>
      )}

      {/* Hidden Alchemist's Cat Easter Egg (192x128) */}
      {catAppearance && (
        <g
          key={catAppearance.instanceId}
          id="layer-alchemist-cat"
          data-testid="layer-alchemist-cat"
          data-reason={catAppearance.reason}
          className="pointer-events-none"
        >
          <g className="anim-cat-mist">
            <rect x={102} y={64} width={2} height={1} fill="#D6B8FF" opacity="0.85" />
            <rect x={109} y={64} width={2} height={1} fill="#52D1A2" opacity="0.82" />
            <rect x={105} y={62} width={1} height={1} fill="#FFF4B8" opacity="0.9" />
          </g>
          <g className="anim-cat-appear-192">
            <g className="anim-cat-tail">
              {CAT_TAIL_192.map((r, i) => (
                <rect key={`ct192-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
              ))}
            </g>
            <g className="anim-cat-breath">
              {CAT_BODY_192.map((r, i) => (
                <rect key={`cb192-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
              ))}
              <g className="anim-cat-blink">
                {CAT_EYES_192.map((r, i) => (
                  <rect key={`ce192-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
                ))}
              </g>
            </g>
            <g className="anim-rune">
              <rect x={105} y={54} width={1} height={1} fill="#FFE27A" />
              <rect x={109} y={55} width={1} height={1} fill="#52D1A2" />
            </g>
          </g>
        </g>
      )}

      <g id="layer-interactions" data-testid="layer-interactions" className="pointer-events-none">
        {activeInteractions.map((event) => {
          const meta = INTERACTIVE_OBJECTS[event.objectId];
          const { originX, originY } = meta.box192;

          if (meta.kind === 'smoke-puff') {
            return (
              <g key={event.instanceId} data-testid={`effect-${event.objectId}`}>
                <g className="anim-smoke-rise">
                  <rect x={originX - 2} y={originY - 2} width="5" height="2" fill={meta.smokeColor} opacity="0.9" />
                  <rect x={originX - 3} y={originY - 4} width="7" height="2" fill={meta.smokeColor} opacity="0.95" />
                  <rect x={originX - 2} y={originY - 6} width="4" height="2" fill={meta.secondaryColor} opacity="0.9" />
                  <rect x={originX - 1} y={originY - 7} width="2" height="1" fill={meta.primaryColor} />
                </g>
                <g className="anim-smoke-left">
                  <rect x={originX - 4} y={originY - 3} width="2" height="2" fill={meta.smokeColor} />
                </g>
                <g className="anim-smoke-right">
                  <rect x={originX + 2} y={originY - 3} width="2" height="2" fill={meta.secondaryColor} />
                </g>
              </g>
            );
          }

          if (meta.kind === 'arcane-flare') {
            return (
              <g key={event.instanceId} data-testid={`effect-${event.objectId}`}>
                <g className="anim-arcane-flare">
                  <rect x={originX - 3} y={originY - 4} width="6" height="8" fill={meta.primaryColor} opacity="0.35" />
                  <rect x={originX - 1} y={originY - 3} width="3" height="6" fill={meta.secondaryColor} opacity="0.6" />
                </g>
                <g className="anim-smoke-rise">
                  <rect x={originX - 1} y={originY - 5} width="1" height="1" fill={meta.primaryColor} />
                  <rect x={originX + 1} y={originY - 6} width="1" height="1" fill={meta.secondaryColor} />
                </g>
              </g>
            );
          }

          if (meta.kind === 'rune-surge') {
            return (
              <g key={event.instanceId} data-testid={`effect-${event.objectId}`}>
                <g className="anim-smoke-rise">
                  <rect x={originX - 8} y={originY - 4} width="1" height="1" fill={meta.primaryColor} />
                  <rect x={originX} y={originY - 5} width="1" height="1" fill={meta.secondaryColor} />
                  <rect x={originX + 8} y={originY - 4} width="1" height="1" fill={meta.primaryColor} />
                </g>
              </g>
            );
          }

          return (
            <g key={event.instanceId} data-testid={`effect-${event.objectId}`}>
              <g className="anim-potion-fizz">
                <rect x={originX - 2} y={originY - 2} width="1" height="1" fill={meta.primaryColor} />
                <rect x={originX} y={originY - 3} width="1" height="1" fill={meta.secondaryColor} />
                <rect x={originX + 2} y={originY - 2} width="1" height="1" fill="#FFFFFF" />
                <rect x={originX - 1} y={originY - 4} width="3" height="1" fill={meta.smokeColor} opacity="0.85" />
              </g>
            </g>
          );
        })}
      </g>

      {/* Dynamic Atmospheric Weather Particles Overlay (192x128) */}
      {weather.kind !== 'none' && (
        <g
          id="layer-weather"
          data-testid="layer-weather"
          data-weather-kind={weather.kind}
          opacity={weather.opacity}
          className="pointer-events-none"
        >
          {(weather.kind === 'rain' ? RAIN_PARTICLES_192 : SNOW_PARTICLES_192).map((p, idx) => (
            <rect
              key={`w192-${weather.kind}-${idx}`}
              className={weather.kind === 'rain' ? 'anim-rain' : 'anim-snow'}
              style={
                {
                  animationDelay: p.delay,
                  '--weather-dur': p.duration,
                } as React.CSSProperties
              }
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              fill={p.color}
              opacity={p.opacity}
            />
          ))}
        </g>
      )}

      {interactionMode && (
        <g id="layer-interaction-hitboxes" data-testid="layer-interaction-hitboxes">
          {INTERACTIVE_OBJECT_IDS.map((id) => {
            const meta = INTERACTIVE_OBJECTS[id];
            const box = meta.box192;
            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-label={meta.ariaLabel}
                data-testid={`interactive-${id}`}
                className="interactive-target"
                onClick={() => onTriggerInteraction(id)}
                onKeyDown={(e) => handleObjectKeyDown(e, id)}
              >
                <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="transparent" />
              </g>
            );
          })}
        </g>
      )}

      {cursor && (
        <g
          id="layer-cursor-glow"
          data-testid="layer-cursor-glow"
          className="pointer-events-none"
        >
          <circle
            cx={cursor.x}
            cy={cursor.y}
            r={14}
            fill="url(#cursor-glow-grad-192)"
          />
          <rect
            x={Math.round(cursor.x)}
            y={Math.round(cursor.y)}
            width={1}
            height={1}
            fill={glowPalette.core}
            opacity="0.88"
          />
        </g>
      )}

      {showGrid && (
        <rect
          data-testid="pixel-grid-overlay"
          x="0"
          y="0"
          width={SCENE_WIDTH}
          height={SCENE_HEIGHT}
          fill="url(#pixel-grid-pattern)"
          className="pointer-events-none"
        />
      )}
    </svg>
  );
};
