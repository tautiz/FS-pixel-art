import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControlBar } from './components/ControlBar';
import { ExportEmbedModal } from './components/ExportEmbedModal';
import { Header } from './components/Header';
import { PaletteAndLayersSection } from './components/PaletteAndLayersSection';
import { PixelSceneSvg } from './components/PixelSceneSvg';
import { buildInteractiveHtmlWidget } from './pixel/embedExport';
import {
  advanceCatSequence,
  AMBIENT_CAT_CHECK_INTERVAL_MS,
  AMBIENT_CAT_PROBABILITY,
  CAT_APPEARANCE_DURATION_MS,
  CatAppearance,
  CatAppearanceReason,
  CLICK_CAT_BONUS_PROBABILITY,
  createCatAppearance,
  getCatStatusMessage,
  isCatActive,
  shouldTriggerRandomCat,
} from './pixel/catEasterEgg';
import {
  ActiveInteraction,
  createInteractionEvent,
  INTERACTIVE_OBJECTS,
  InteractiveObjectId,
  pruneExpiredInteractions,
  upsertActiveInteraction,
} from './pixel/interactions';
import { ROOM_COLOR_LAYERS } from './pixel/sceneData';
import { ROOM_COLOR_LAYERS_768 } from './pixel/sceneData768';
import { ANIMATION_LAYERS, AnimationLayerId } from './pixel/sprites';
import { buildStandaloneSvg, GridPreset } from './pixel/svgExport';
import {
  clampCycleDuration,
  CYCLE_24_DURATION_SECONDS,
  formatCycleClock,
  formatLocalClockShort,
  resolveAtmosphereWeights,
  resolveThemeForWeights,
  resolveTimeOfDayState,
  TimeOfDay,
  TimeOfDayMode,
} from './pixel/timeOfDay';
import { resolveWeatherState, WeatherMode } from './pixel/weather';

const ALL_LAYER_IDS: readonly AnimationLayerId[] = ANIMATION_LAYERS.map((l) => l.id);

interface InitialUrlOptions {
  readonly isEmbed: boolean;
  readonly gridPreset: GridPreset;
  readonly timeMode: TimeOfDayMode;
  readonly cycleDurationSeconds: number;
  readonly weatherMode: WeatherMode;
  readonly interactionMode: boolean;
  readonly glowingCursorEnabled: boolean;
  readonly showEmbedControls: boolean;
  readonly speed: number;
  readonly enabledLayers: Set<AnimationLayerId>;
}

function parseInitialUrlOptions(): InitialUrlOptions {
  if (typeof window === 'undefined') {
    return {
      isEmbed: false,
      gridPreset: '768x512',
      timeMode: 'auto',
      cycleDurationSeconds: CYCLE_24_DURATION_SECONDS,
      weatherMode: 'auto',
      interactionMode: false,
      glowingCursorEnabled: true,
      showEmbedControls: true,
      speed: 1,
      enabledLayers: new Set(ALL_LAYER_IDS),
    };
  }
  const params = new URLSearchParams(window.location.search);
  const isEmbed = params.get('embed') === '1';
  const gridParam = params.get('grid');
  const gridPreset: GridPreset = gridParam === '192x128' ? '192x128' : '768x512';
  const timeParam = params.get('time');
  const validModes: readonly TimeOfDayMode[] = ['auto', 'cycle24', 'day', 'twilight', 'moonlit'];
  const timeMode: TimeOfDayMode = validModes.includes(timeParam as TimeOfDayMode)
    ? (timeParam as TimeOfDayMode)
    : 'auto';
  const cycleParam = params.get('cycle');
  const cycleDurationSeconds = cycleParam
    ? clampCycleDuration(Number(cycleParam))
    : CYCLE_24_DURATION_SECONDS;
  const weatherParam = params.get('weather');
  const validWeathers: readonly WeatherMode[] = ['auto', 'clear', 'rain', 'snow'];
  const weatherMode: WeatherMode = validWeathers.includes(weatherParam as WeatherMode)
    ? (weatherParam as WeatherMode)
    : 'auto';
  const interactionParam = params.get('interactive');
  const interactionMode = isEmbed ? interactionParam !== '0' : interactionParam === '1';
  const glowingCursorEnabled = params.get('glow') !== '0';
  const showEmbedControls = params.get('controls') !== '0';
  const speedNum = Number(params.get('speed'));
  const speed = speedNum === 0.5 || speedNum === 2 ? speedNum : 1;
  const layersParam = params.get('layers');
  let enabledLayers = new Set(ALL_LAYER_IDS);
  if (layersParam) {
    const requested = layersParam
      .split(',')
      .filter((id): id is AnimationLayerId => ALL_LAYER_IDS.includes(id as AnimationLayerId));
    if (requested.length > 0) {
      enabledLayers = new Set(requested);
    }
  }
  return {
    isEmbed,
    gridPreset,
    timeMode,
    cycleDurationSeconds,
    weatherMode,
    interactionMode,
    glowingCursorEnabled,
    showEmbedControls,
    speed,
    enabledLayers,
  };
}

function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const initialOpts = useMemo(() => parseInitialUrlOptions(), []);
  const [gridPreset, setGridPreset] = useState<GridPreset>(initialOpts.gridPreset);
  const [timeMode, setTimeMode] = useState<TimeOfDayMode>(initialOpts.timeMode);
  const [cycleDurationSeconds, setCycleDurationSeconds] = useState<number>(
    initialOpts.cycleDurationSeconds,
  );
  const [weatherMode, setWeatherMode] = useState<WeatherMode>(initialOpts.weatherMode);
  const [localNow, setLocalNow] = useState<Date>(() => new Date());
  const [cycleSecond, setCycleSecond] = useState<number>(0);
  const [interactionMode, setInteractionMode] = useState(initialOpts.interactionMode);
  const [activeInteractions, setActiveInteractions] = useState<readonly ActiveInteraction[]>([]);
  const [interactionNotice, setInteractionNotice] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(initialOpts.speed);
  const [showGrid, setShowGrid] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [highlightedLayer, setHighlightedLayer] = useState<AnimationLayerId | null>(null);
  const [enabledLayers, setEnabledLayers] = useState<Set<AnimationLayerId>>(
    () => initialOpts.enabledLayers,
  );
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [catAppearance, setCatAppearance] = useState<CatAppearance | null>(null);
  const interactionSeqRef = useRef(0);
  const interactionNoticeTimerRef = useRef<number | null>(null);
  const catSequenceProgressRef = useRef(0);
  const catCounterRef = useRef(0);
  const catExpiryTimerRef = useRef<number | null>(null);
  const catAppearanceRef = useRef<CatAppearance | null>(null);
  catAppearanceRef.current = catAppearance;

  const toggleLayer = useCallback((id: AnimationLayerId) => {
    setEnabledLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const enableAllLayers = useCallback(() => {
    setEnabledLayers(new Set(ALL_LAYER_IDS));
  }, []);

  const timeOfDay: TimeOfDay = resolveTimeOfDayState(
    timeMode,
    localNow,
    cycleSecond,
    cycleDurationSeconds,
  );
  const atmosphereWeights = useMemo(
    () => resolveAtmosphereWeights(timeMode, localNow, cycleSecond, cycleDurationSeconds),
    [timeMode, localNow, cycleSecond, cycleDurationSeconds],
  );
  const theme = useMemo(
    () => resolveThemeForWeights(atmosphereWeights, timeOfDay),
    [atmosphereWeights, timeOfDay],
  );
  const resolvedWeather = useMemo(
    () => resolveWeatherState(weatherMode, atmosphereWeights),
    [weatherMode, atmosphereWeights],
  );

  const handleDownloadSvg = useCallback(
    (opts?: { enableInteractionMode?: boolean; enableGlowingCursor?: boolean }) => {
      const svgString = buildStandaloneSvg({
        gridPreset,
        timeOfDay,
        atmosphere: atmosphereWeights,
        weatherMode,
        enabledLayers,
        speed,
        paused,
        responsive: true,
        enableInteractionMode: opts?.enableInteractionMode ?? true,
        enableGlowingCursor: opts?.enableGlowingCursor ?? true,
      });
      const filename = `alchemists-study-${gridPreset}-${timeOfDay}.svg`;
      triggerFileDownload(svgString, filename, 'image/svg+xml;charset=utf-8');
      setExportNotice(`Downloaded ${filename}`);
      window.setTimeout(() => setExportNotice(null), 3500);
    },
    [atmosphereWeights, enabledLayers, gridPreset, paused, speed, timeOfDay, weatherMode],
  );

  const handleDownloadInteractiveHtml = useCallback(
    (opts: {
      enableInteractionMode: boolean;
      enableGlowingCursor: boolean;
      showMiniControls: boolean;
    }) => {
      const htmlString = buildInteractiveHtmlWidget({
        gridPreset,
        timeMode,
        timeOfDay,
        atmosphere: atmosphereWeights,
        cycleSecond,
        cycleDurationSeconds,
        weatherMode,
        enabledLayers,
        speed,
        paused,
        enableInteractionMode: opts.enableInteractionMode,
        enableGlowingCursor: opts.enableGlowingCursor,
        showMiniControls: opts.showMiniControls,
      });
      const filename = `alchemists-study-${gridPreset}-interactive.html`;
      triggerFileDownload(htmlString, filename, 'text/html;charset=utf-8');
      setExportNotice(`Downloaded ${filename}`);
      window.setTimeout(() => setExportNotice(null), 3500);
    },
    [
      atmosphereWeights,
      cycleDurationSeconds,
      cycleSecond,
      enabledLayers,
      gridPreset,
      paused,
      speed,
      timeMode,
      timeOfDay,
      weatherMode,
    ],
  );

  const summonCat = useCallback((reason: CatAppearanceReason) => {
    const now = Date.now();
    catCounterRef.current += 1;
    const appearance = createCatAppearance(reason, now, catCounterRef.current);
    setCatAppearance(appearance);
    catAppearanceRef.current = appearance;
    const catMessage = getCatStatusMessage(reason);
    setInteractionNotice(catMessage);
    if (interactionNoticeTimerRef.current !== null) {
      window.clearTimeout(interactionNoticeTimerRef.current);
    }
    interactionNoticeTimerRef.current = window.setTimeout(() => {
      setInteractionNotice(null);
    }, CAT_APPEARANCE_DURATION_MS + 400);
    if (catExpiryTimerRef.current !== null) {
      window.clearTimeout(catExpiryTimerRef.current);
    }
    catExpiryTimerRef.current = window.setTimeout(() => {
      setCatAppearance(null);
      catAppearanceRef.current = null;
      catExpiryTimerRef.current = null;
    }, CAT_APPEARANCE_DURATION_MS + 60);
  }, []);

  const triggerInteraction = useCallback(
    (objectId: InteractiveObjectId) => {
      if (!interactionMode) return;
      const now = Date.now();
      interactionSeqRef.current += 1;
      const event = createInteractionEvent(objectId, now, interactionSeqRef.current);
      const meta = INTERACTIVE_OBJECTS[objectId];
      setActiveInteractions((prev) => upsertActiveInteraction(prev, event, now));
      setInteractionNotice(meta.statusMessage);
      if (interactionNoticeTimerRef.current !== null) {
        window.clearTimeout(interactionNoticeTimerRef.current);
      }
      interactionNoticeTimerRef.current = window.setTimeout(() => {
        setInteractionNotice(null);
      }, meta.durationMs + 700);
      window.setTimeout(() => {
        setActiveInteractions((prev) => pruneExpiredInteractions(prev, Date.now()));
      }, meta.durationMs + 40);

      const seqResult = advanceCatSequence(catSequenceProgressRef.current, objectId);
      catSequenceProgressRef.current = seqResult.nextProgress;
      if (seqResult.triggered) {
        summonCat('sequence');
      } else if (
        shouldTriggerRandomCat(
          Math.random(),
          CLICK_CAT_BONUS_PROBABILITY,
          isCatActive(catAppearanceRef.current, now),
        )
      ) {
        summonCat('random');
      }
    },
    [interactionMode, summonCat],
  );

  const toggleInteractionMode = useCallback(() => {
    setInteractionMode((prev) => {
      const next = !prev;
      catSequenceProgressRef.current = 0;
      if (!next) {
        setActiveInteractions([]);
        setInteractionNotice(null);
      }
      return next;
    });
  }, []);

  // Periodic random appearance for the hidden Alchemist's Cat while scene is playing
  useEffect(() => {
    if (paused || exportModalOpen) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (
        shouldTriggerRandomCat(
          Math.random(),
          AMBIENT_CAT_PROBABILITY,
          isCatActive(catAppearanceRef.current, now),
        )
      ) {
        summonCat('random');
      }
    }, AMBIENT_CAT_CHECK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [exportModalOpen, paused, summonCat]);

  useEffect(() => {
    return () => {
      if (catExpiryTimerRef.current !== null) {
        window.clearTimeout(catExpiryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (timeMode !== 'auto') return;
    setLocalNow(new Date());
    const timer = window.setInterval(() => {
      setLocalNow(new Date());
    }, 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setLocalNow(new Date());
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [timeMode]);

  useEffect(() => {
    if (timeMode !== 'cycle24') return;
    const timer = window.setInterval(() => {
      setCycleSecond((prev) => (prev + 1) % cycleDurationSeconds);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timeMode, cycleDurationSeconds]);

  const handleChangeTimeMode = useCallback((nextMode: TimeOfDayMode) => {
    setTimeMode(nextMode);
    if (nextMode === 'auto') {
      setLocalNow(new Date());
    } else if (nextMode === 'cycle24') {
      setCycleSecond(0);
    }
  }, []);

  const handleChangeCycleDuration = useCallback(
    (nextSeconds: number) => {
      const clamped = clampCycleDuration(nextSeconds);
      setCycleDurationSeconds((prevDuration) => {
        if (prevDuration === clamped) return prevDuration;
        setCycleSecond((prevSec) => Math.floor((prevSec / prevDuration) * clamped) % clamped);
        return clamped;
      });
    },
    [],
  );

  useEffect(() => {
    if (initialOpts.isEmbed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (exportModalOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        tag === 'BUTTON' ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'A' ||
        (e.target as HTMLElement | null)?.getAttribute('role') === 'button'
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === 'g' || e.key === 'G') {
        setShowGrid((g) => !g);
      } else if (e.key === 'i' || e.key === 'I') {
        toggleInteractionMode();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exportModalOpen, initialOpts.isEmbed, toggleInteractionMode]);

  if (initialOpts.isEmbed) {
    const cycleModes: readonly TimeOfDayMode[] = ['cycle24', 'auto', 'day', 'twilight', 'moonlit'];
    const handleCycleEmbedMode = () => {
      const next = cycleModes[(cycleModes.indexOf(timeMode) + 1) % cycleModes.length];
      handleChangeTimeMode(next);
    };

    return (
      <div
        data-testid="embed-mode-shell"
        className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0B0A08] text-[#F2EDE6]"
      >
        <div
          className="relative aspect-[3/2] w-full max-h-screen overflow-hidden"
          style={{ backgroundColor: theme.skyBands768[0] }}
        >
          <PixelSceneSvg
            gridPreset={gridPreset}
            timeOfDay={timeOfDay}
            timeMode={timeMode}
            atmosphere={atmosphereWeights}
            cycleSecond={cycleSecond}
            cycleDurationSeconds={cycleDurationSeconds}
            weatherMode={weatherMode}
            interactionMode={interactionMode}
            glowingCursorEnabled={initialOpts.glowingCursorEnabled}
            activeInteractions={activeInteractions}
            catAppearance={catAppearance}
            onTriggerInteraction={triggerInteraction}
            enabledLayers={enabledLayers}
            highlightedLayer={null}
            paused={paused}
            speed={speed}
            showGrid={false}
          />

          {initialOpts.showEmbedControls && (
            <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="pointer-events-auto inline-flex flex-wrap items-center gap-1 rounded-lg border border-[#F5EFE6]/15 bg-[#12100E]/85 p-1 backdrop-blur-xs">
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-pressed={paused}
                  className="min-h-[30px] rounded px-2.5 py-1 text-xs font-semibold text-[#E8DFD3] hover:bg-white/10 cursor-pointer"
                >
                  {paused ? 'Play' : 'Pause'}
                </button>
                <button
                  type="button"
                  onClick={toggleInteractionMode}
                  aria-pressed={interactionMode}
                  className={`min-h-[30px] rounded px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                    interactionMode ? 'bg-[#52D1A2] text-[#091C15]' : 'text-[#E8DFD3] hover:bg-white/10'
                  }`}
                >
                  Interact
                </button>
                <button
                  type="button"
                  onClick={handleCycleEmbedMode}
                  className="min-h-[30px] rounded px-2.5 py-1 text-xs font-semibold text-[#E8DFD3] hover:bg-white/10 cursor-pointer"
                >
                  {timeMode === 'cycle24'
                    ? `${cycleDurationSeconds}s · ${formatCycleClock(cycleSecond, cycleDurationSeconds)}`
                    : timeMode === 'auto'
                      ? `Auto · ${theme.label}`
                      : theme.label}
                </button>
              </div>

              {interactionNotice && (
                <div
                  role="status"
                  className="pointer-events-auto rounded-lg border border-[#52D1A2]/40 bg-[#12100E]/90 px-2.5 py-1 text-xs font-medium text-[#7FE8C4]"
                >
                  {interactionNotice}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const activeCount = enabledLayers.size;
  const gridLabel = gridPreset === '768x512' ? '768 × 512 Grid (4×)' : '192 × 128 Grid';
  const colorCount =
    gridPreset === '768x512' ? ROOM_COLOR_LAYERS_768.length : ROOM_COLOR_LAYERS.length;
  const kickerTimeLabel =
    timeMode === 'cycle24'
      ? `${cycleDurationSeconds}s Cycle · ${formatCycleClock(cycleSecond, cycleDurationSeconds)} ${theme.label} (${cycleSecond + 1}/${cycleDurationSeconds}s)`
      : timeMode === 'auto'
        ? `Auto · ${theme.label} (${formatLocalClockShort(localNow)})`
        : theme.subtitle;

  const titleByTime: Record<TimeOfDay, string> = {
    day: "The Sunlit Alchemist's Classroom",
    twilight: "The Twilight Alchemist's Classroom",
    moonlit: "The Moonlit Alchemist's Classroom",
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#12100E] text-[#F2EDE6]">
      <Header onOpenExportModal={() => setExportModalOpen(true)} />

      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-4 md:py-5">
        <section id="artwork" aria-labelledby="artwork-title" className="mx-auto max-w-[900px]">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="font-mono-tabular flex flex-wrap items-center gap-2 text-xs text-[#9E9387]">
                <span data-testid="time-kicker">{kickerTimeLabel}</span>
                {resolvedWeather.kind !== 'none' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span
                      data-testid="weather-kicker"
                      className={resolvedWeather.kind === 'rain' ? 'text-[#8EC0FA]' : 'text-[#DCEBFF]'}
                    >
                      {resolvedWeather.label}
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{gridLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{colorCount} Room Colors</span>
                <span aria-hidden="true">·</span>
                <span>
                  {activeCount} of {ALL_LAYER_IDS.length} Motion Layers Active
                </span>
              </div>
              <h1
                id="artwork-title"
                className="font-display mt-1.5 text-2xl font-medium tracking-tight text-[#F5EFE6] sm:text-3xl"
                style={{ textWrap: 'balance' }}
              >
                {titleByTime[timeOfDay]}
              </h1>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#A99F94]">
              {exportNotice ? (
                <span role="status" className="font-medium text-[#E6B84C]">
                  {exportNotice}
                </span>
              ) : interactionNotice ? (
                <span role="status" data-testid="interaction-status" className="font-medium text-[#7FE8C4]">
                  {interactionNotice}
                </span>
              ) : interactionMode ? (
                <span className="font-medium text-[#7FE8C4]">
                  Interaction Mode active — click cauldrons, sconces, runes, or vials
                </span>
              ) : (
                <span>Enable Interaction Mode to click cauldrons, sconces, runes &amp; vials</span>
              )}
            </div>
          </div>

          {/* Primary Artwork Viewport */}
          <div
            className={`mt-4 rounded-xl border bg-[#0B0A08] p-2 shadow-2xl transition-colors ${
              interactionMode ? 'border-[#52D1A2]/50' : 'border-[#2C251E]'
            } ${zoomed ? 'overflow-auto' : 'overflow-hidden'}`}
          >
            <div
              className={`mx-auto aspect-[3/2] overflow-hidden rounded-lg transition-all duration-200 ${
                zoomed ? 'w-[180%] max-w-none' : 'w-full'
              }`}
              style={{ backgroundColor: theme.skyBands768[0] }}
            >
              <PixelSceneSvg
                gridPreset={gridPreset}
                timeOfDay={timeOfDay}
                timeMode={timeMode}
                atmosphere={atmosphereWeights}
                cycleSecond={cycleSecond}
                cycleDurationSeconds={cycleDurationSeconds}
                weatherMode={weatherMode}
                interactionMode={interactionMode}
                activeInteractions={activeInteractions}
                catAppearance={catAppearance}
                onTriggerInteraction={triggerInteraction}
                enabledLayers={enabledLayers}
                highlightedLayer={highlightedLayer}
                paused={paused}
                speed={speed}
                showGrid={showGrid}
              />
            </div>
          </div>

          <ControlBar
            gridPreset={gridPreset}
            onChangeGridPreset={setGridPreset}
            timeMode={timeMode}
            resolvedTimeOfDay={timeOfDay}
            cycleSecond={cycleSecond}
            cycleDurationSeconds={cycleDurationSeconds}
            onChangeTimeMode={handleChangeTimeMode}
            onChangeCycleDuration={handleChangeCycleDuration}
            weatherMode={weatherMode}
            resolvedWeather={resolvedWeather}
            onChangeWeatherMode={setWeatherMode}
            interactionMode={interactionMode}
            onToggleInteractionMode={toggleInteractionMode}
            paused={paused}
            onTogglePause={() => setPaused((p) => !p)}
            speed={speed}
            onChangeSpeed={setSpeed}
            enabledLayers={enabledLayers}
            onToggleLayer={toggleLayer}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((g) => !g)}
            zoomed={zoomed}
            onToggleZoom={() => setZoomed((z) => !z)}
          />
        </section>

        <div className="mt-20">
          <PaletteAndLayersSection
            gridPreset={gridPreset}
            timeOfDay={timeOfDay}
            atmosphere={atmosphereWeights}
            enabledLayers={enabledLayers}
            onToggleLayer={toggleLayer}
            onHighlightLayer={setHighlightedLayer}
            onEnableAllLayers={enableAllLayers}
          />
        </div>
      </main>

      <footer className="mt-20 border-t border-[#26201B] bg-[#100E0C]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 sm:px-6 py-8 text-xs text-[#8A7F74] sm:flex-row sm:items-center sm:justify-between">
          <div>
            Alchemist&apos;s Study — {gridLabel} · {theme.label} Animated SVG Pixel Art
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#artwork" className="hover:text-[#F5EFE6] transition-colors">
              Back to Artwork
            </a>
            <button
              type="button"
              onClick={() => handleDownloadSvg()}
              className="hover:text-[#F5EFE6] transition-colors cursor-pointer"
            >
              Download SVG
            </button>
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="hover:text-[#F5EFE6] transition-colors cursor-pointer"
            >
              Embed Interactive Widget
            </button>
          </div>
        </div>
      </footer>

      <ExportEmbedModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        gridPreset={gridPreset}
        timeMode={timeMode}
        timeOfDay={timeOfDay}
        atmosphere={atmosphereWeights}
        cycleSecond={cycleSecond}
        cycleDurationSeconds={cycleDurationSeconds}
        weatherMode={weatherMode}
        enabledLayers={enabledLayers}
        speed={speed}
        paused={paused}
        onDownloadSvg={handleDownloadSvg}
        onDownloadInteractiveHtml={handleDownloadInteractiveHtml}
      />
    </div>
  );
}
