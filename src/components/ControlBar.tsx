import React, { useEffect, useState } from 'react';
import {
  Clock,
  Cloud,
  CloudRain,
  Grid,
  Moon,
  Pause,
  Play,
  RefreshCw,
  Snowflake,
  Sun,
  Sunset,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ANIMATION_LAYERS, AnimationLayerId } from '../pixel/sprites';
import { GridPreset } from '../pixel/svgExport';
import {
  clampCycleDuration,
  CYCLE_DURATION_PRESETS,
  MAX_CYCLE_DURATION_SECONDS,
  MIN_CYCLE_DURATION_SECONDS,
  TimeOfDay,
  TimeOfDayMode,
} from '../pixel/timeOfDay';
import { ResolvedWeatherState, WeatherMode } from '../pixel/weather';

interface ControlBarProps {
  readonly gridPreset: GridPreset;
  readonly onChangeGridPreset: (preset: GridPreset) => void;
  readonly timeMode: TimeOfDayMode;
  readonly resolvedTimeOfDay: TimeOfDay;
  readonly cycleSecond: number;
  readonly cycleDurationSeconds: number;
  readonly onChangeTimeMode: (mode: TimeOfDayMode) => void;
  readonly onChangeCycleDuration: (seconds: number) => void;
  readonly weatherMode: WeatherMode;
  readonly resolvedWeather: ResolvedWeatherState;
  readonly onChangeWeatherMode: (mode: WeatherMode) => void;
  readonly interactionMode: boolean;
  readonly onToggleInteractionMode: () => void;
  readonly paused: boolean;
  readonly onTogglePause: () => void;
  readonly speed: number;
  readonly onChangeSpeed: (speed: number) => void;
  readonly enabledLayers: ReadonlySet<AnimationLayerId>;
  readonly onToggleLayer: (id: AnimationLayerId) => void;
  readonly showGrid: boolean;
  readonly onToggleGrid: () => void;
  readonly zoomed: boolean;
  readonly onToggleZoom: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 2] as const;

const GRID_OPTIONS: readonly { id: GridPreset; label: string }[] = [
  { id: '192x128', label: '192×128' },
  { id: '768x512', label: '768×512 (4×)' },
];

const TIME_OPTIONS: readonly { id: TimeOfDayMode; label: string; Icon: typeof Sun }[] = [
  { id: 'auto', label: 'Auto', Icon: Clock },
  { id: 'cycle24', label: '24s Cycle', Icon: RefreshCw },
  { id: 'day', label: 'Daylight', Icon: Sun },
  { id: 'twilight', label: 'Twilight', Icon: Sunset },
  { id: 'moonlit', label: 'Moonlit', Icon: Moon },
];

const WEATHER_OPTIONS: readonly { id: WeatherMode; label: string; Icon: typeof Cloud }[] = [
  { id: 'auto', label: 'Auto', Icon: Cloud },
  { id: 'clear', label: 'Clear', Icon: Sun },
  { id: 'rain', label: 'Rain', Icon: CloudRain },
  { id: 'snow', label: 'Snow', Icon: Snowflake },
];

export const ControlBar: React.FC<ControlBarProps> = ({
  gridPreset,
  onChangeGridPreset,
  timeMode,
  resolvedTimeOfDay,
  cycleSecond,
  cycleDurationSeconds,
  onChangeTimeMode,
  onChangeCycleDuration,
  weatherMode,
  resolvedWeather,
  onChangeWeatherMode,
  interactionMode,
  onToggleInteractionMode,
  paused,
  onTogglePause,
  speed,
  onChangeSpeed,
  enabledLayers,
  onToggleLayer,
  showGrid,
  onToggleGrid,
  zoomed,
  onToggleZoom,
}) => {
  const [draftDuration, setDraftDuration] = useState<string>(String(cycleDurationSeconds));

  useEffect(() => {
    setDraftDuration(String(cycleDurationSeconds));
  }, [cycleDurationSeconds]);

  const commitDraftDuration = () => {
    const parsed = Number(draftDuration);
    const clamped = clampCycleDuration(
      draftDuration.trim() === '' || Number.isNaN(parsed) ? cycleDurationSeconds : parsed,
    );
    onChangeCycleDuration(clamped);
    setDraftDuration(String(clamped));
  };
  return (
    <div
      aria-label="Animation and inspection controls"
      className="mt-3 flex flex-col gap-2.5 rounded-lg border border-[#2B251F] bg-[#191613] p-3"
    >
      {/* Top row: Playback + Speed + Grid Resolution + Time of Day + Inspection tools */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 max-w-full">
          <button
            type="button"
            onClick={onTogglePause}
            aria-pressed={paused}
            className="inline-flex min-h-[40px] sm:min-h-[38px] items-center gap-1.5 rounded-md border border-[#383028] bg-[#241F1A] px-2.5 py-1.5 text-xs font-semibold text-[#F5EFE6] hover:border-[#D99B26]/60 hover:bg-[#2C2620] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26]"
          >
            {paused ? (
              <>
                <Play className="h-3.5 w-3.5 text-[#D99B26]" aria-hidden="true" />
                <span>Play Motion</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 text-[#D99B26]" aria-hidden="true" />
                <span>Pause Motion</span>
              </>
            )}
          </button>

          <div
            role="group"
            aria-label="Animation speed"
            className="inline-flex flex-wrap max-w-full items-center rounded-md border border-[#2E2822] bg-[#12100E] p-1"
          >
            {SPEED_OPTIONS.map((opt) => {
              const active = speed === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChangeSpeed(opt)}
                  aria-pressed={active}
                  className={`font-mono-tabular min-h-[32px] sm:min-h-[30px] rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D99B26] ${
                    active
                      ? 'bg-[#D99B26] text-[#14110E]'
                      : 'text-[#A99F94] hover:text-[#F5EFE6]'
                  }`}
                >
                  {opt}×
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Pixel grid resolution"
            className="inline-flex flex-wrap max-w-full items-center rounded-md border border-[#2E2822] bg-[#12100E] p-1"
          >
            {GRID_OPTIONS.map((opt) => {
              const active = gridPreset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeGridPreset(opt.id)}
                  aria-pressed={active}
                  className={`font-mono-tabular min-h-[32px] sm:min-h-[30px] rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D99B26] ${
                    active
                      ? 'bg-[#D99B26] text-[#14110E]'
                      : 'text-[#A99F94] hover:text-[#F5EFE6]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Time of day"
            className="inline-flex flex-wrap max-w-full items-center rounded-md border border-[#2E2822] bg-[#12100E] p-1"
          >
            {TIME_OPTIONS.map(({ id, label, Icon }) => {
              const active = timeMode === id;
              const effectiveTone =
                id === 'auto' || id === 'cycle24' ? resolvedTimeOfDay : id;
              const activeClass =
                effectiveTone === 'moonlit'
                  ? 'bg-[#7BA4DE] text-[#090F1E]'
                  : effectiveTone === 'twilight'
                    ? 'bg-[#9E78B8] text-[#120D1B]'
                    : 'bg-[#D99B26] text-[#14110E]';
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChangeTimeMode(id)}
                  aria-pressed={active}
                  title={
                    id === 'auto'
                      ? `Auto-sync to local system time (currently ${resolvedTimeOfDay})`
                      : id === 'cycle24'
                        ? `Gradual ${cycleDurationSeconds}-second day/night cycle (${cycleSecond + 1}/${cycleDurationSeconds}s · ${resolvedTimeOfDay})`
                        : undefined
                  }
                  className={`inline-flex min-h-[32px] sm:min-h-[30px] items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D99B26] ${
                    active ? activeClass : 'text-[#A99F94] hover:text-[#F5EFE6]'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${id === 'cycle24' && active ? 'animate-spin' : ''}`}
                    style={id === 'cycle24' && active ? { animationDuration: '6s' } : undefined}
                    aria-hidden="true"
                  />
                  <span>{id === 'cycle24' ? `${cycleDurationSeconds}s Cycle` : label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleInteractionMode}
            aria-pressed={interactionMode}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#52D1A2] ${
              interactionMode
                ? 'border-[#52D1A2]/70 bg-[#172B24] text-[#A8F5D8]'
                : 'border-[#2E2822] bg-[#14120F] text-[#A99F94] hover:border-[#52D1A2]/45 hover:text-[#F5EFE6]'
            }`}
          >
            <Wand2
              className={`h-3.5 w-3.5 ${interactionMode ? 'text-[#52D1A2]' : ''}`}
              aria-hidden="true"
            />
            <span>Interaction Mode</span>
          </button>

          <button
            type="button"
            onClick={onToggleGrid}
            aria-pressed={showGrid}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26] ${
              showGrid
                ? 'border-[#D99B26]/60 bg-[#2A2319] text-[#F7DFB0]'
                : 'border-[#2E2822] bg-[#14120F] text-[#A99F94] hover:text-[#F5EFE6]'
            }`}
          >
            <Grid className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Pixel Grid</span>
          </button>

          <button
            type="button"
            onClick={onToggleZoom}
            aria-pressed={zoomed}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26] ${
              zoomed
                ? 'border-[#D99B26]/60 bg-[#2A2319] text-[#F7DFB0]'
                : 'border-[#2E2822] bg-[#14120F] text-[#A99F94] hover:text-[#F5EFE6]'
            }`}
          >
            {zoomed ? (
              <>
                <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Fit Frame</span>
              </>
            ) : (
              <>
                <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>2× Detail</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Custom Day/Night Cycle Duration Strip (visible when Cycle mode is active) */}
      {timeMode === 'cycle24' && (
        <div
          data-testid="custom-cycle-controls"
          className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#26211B] pt-2.5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#BFB4A7]">Day/Night Cycle Length</span>
            <div
              role="group"
              aria-label="Cycle duration presets"
              className="inline-flex flex-wrap items-center rounded-md border border-[#2E2822] bg-[#12100E] p-1"
            >
              {CYCLE_DURATION_PRESETS.map((preset) => {
                const active = cycleDurationSeconds === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    data-testid={`cycle-preset-${preset}`}
                    onClick={() => onChangeCycleDuration(preset)}
                    aria-pressed={active}
                    className={`font-mono-tabular min-h-[28px] rounded px-2 py-0.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D99B26] ${
                      active
                        ? 'bg-[#D99B26] text-[#14110E]'
                        : 'text-[#A99F94] hover:text-[#F5EFE6]'
                    }`}
                  >
                    {preset}s
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label
              htmlFor="cycle-duration-range"
              className="text-xs text-[#9E9387]"
            >
              Custom
            </label>
            <input
              id="cycle-duration-range"
              type="range"
              min={MIN_CYCLE_DURATION_SECONDS}
              max={MAX_CYCLE_DURATION_SECONDS}
              step={1}
              value={cycleDurationSeconds}
              onChange={(e) => onChangeCycleDuration(Number(e.target.value))}
              aria-label="Cycle duration slider in seconds"
              className="h-1.5 w-28 sm:w-36 cursor-pointer accent-[#D99B26]"
            />
            <div className="inline-flex items-center rounded-md border border-[#352E26] bg-[#12100E] px-2 py-1 focus-within:border-[#D99B26]/80">
              <input
                type="number"
                data-testid="cycle-duration-input"
                min={MIN_CYCLE_DURATION_SECONDS}
                max={MAX_CYCLE_DURATION_SECONDS}
                step={1}
                value={draftDuration}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraftDuration(val);
                  const num = Number(val);
                  if (
                    val.trim() !== '' &&
                    Number.isFinite(num) &&
                    num >= MIN_CYCLE_DURATION_SECONDS &&
                    num <= MAX_CYCLE_DURATION_SECONDS
                  ) {
                    onChangeCycleDuration(Math.round(num));
                  }
                }}
                onBlur={commitDraftDuration}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitDraftDuration();
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                }}
                aria-label="Custom cycle duration in seconds"
                className="font-mono-tabular w-12 bg-transparent text-right text-xs font-medium text-[#F5EFE6] focus:outline-none"
              />
              <span className="ml-1 font-mono-tabular text-xs text-[#9E9387]">s</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom row: Layer Visibility Toggles + Weather Overlay */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#26211B] pt-3">
        <div
          role="group"
          aria-label="Toggle animated pixel layers"
          className="flex flex-wrap items-center gap-2"
        >
          {ANIMATION_LAYERS.map((layer) => {
            const active = enabledLayers.has(layer.id);
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => onToggleLayer(layer.id)}
                aria-pressed={active}
                className={`min-h-[36px] rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26] ${
                  active
                    ? 'border-[#D99B26]/55 bg-[#2A2319] text-[#F7DFB0]'
                    : 'border-[#2E2822] bg-[#14120F] text-[#847A6F] hover:text-[#D5CCC1]'
                }`}
              >
                {layer.shortLabel}
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label="Atmospheric weather overlay"
          className="inline-flex flex-wrap max-w-full items-center rounded-md border border-[#2E2822] bg-[#12100E] p-1"
        >
          {WEATHER_OPTIONS.map(({ id, label, Icon }) => {
            const active = weatherMode === id;
            const effectiveKind = id === 'auto' ? resolvedWeather.kind : id === 'clear' ? 'none' : id;
            const activeClass =
              effectiveKind === 'rain'
                ? 'bg-[#6398D8] text-[#091424]'
                : effectiveKind === 'snow'
                  ? 'bg-[#C8E0FA] text-[#0B1628]'
                  : 'bg-[#D99B26] text-[#14110E]';
            return (
              <button
                key={id}
                type="button"
                data-testid={`weather-btn-${id}`}
                onClick={() => onChangeWeatherMode(id)}
                aria-pressed={active}
                title={
                  id === 'auto'
                    ? `Auto weather: ${resolvedWeather.label} (rain at twilight, snow at moonlit)`
                    : `${label} weather overlay`
                }
                className={`inline-flex min-h-[32px] sm:min-h-[30px] items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D99B26] ${
                  active ? activeClass : 'text-[#A99F94] hover:text-[#F5EFE6]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
