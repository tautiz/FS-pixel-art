import React from 'react';
import { ANIMATION_ACCENT_SWATCHES, ROOM_PALETTE_NAMES } from '../pixel/palette';
import { ROOM_COLOR_LAYERS } from '../pixel/sceneData';
import { ANIMATION_LAYERS, AnimationLayerId } from '../pixel/sprites';
import { GridPreset } from '../pixel/svgExport';
import {
  AtmosphereWeights,
  remapRoomColorWithWeights,
  resolveThemeForWeights,
  TimeOfDay,
  weightsForTimeOfDay,
} from '../pixel/timeOfDay';

interface PaletteAndLayersSectionProps {
  readonly gridPreset: GridPreset;
  readonly timeOfDay: TimeOfDay;
  readonly atmosphere?: AtmosphereWeights;
  readonly enabledLayers: ReadonlySet<AnimationLayerId>;
  readonly onToggleLayer: (id: AnimationLayerId) => void;
  readonly onHighlightLayer: (id: AnimationLayerId | null) => void;
  readonly onEnableAllLayers: () => void;
}

export const PaletteAndLayersSection: React.FC<PaletteAndLayersSectionProps> = ({
  gridPreset,
  timeOfDay,
  atmosphere,
  enabledLayers,
  onToggleLayer,
  onHighlightLayer,
  onEnableAllLayers,
}) => {
  const totalRoomPixels = ROOM_COLOR_LAYERS.reduce((sum, l) => sum + l.pixelCount, 0);
  const gridLabel = gridPreset === '768x512' ? '768 × 512' : '192 × 128';
  const weights = atmosphere ?? weightsForTimeOfDay(timeOfDay);
  const theme = resolveThemeForWeights(weights, timeOfDay);

  return (
    <div className="space-y-20">
      {/* Section 1: 7-Layer Motion Breakdown */}
      <section id="layers" aria-labelledby="layers-heading">
        <div className="flex flex-col gap-4 border-b border-[#2A241E] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="layers-heading"
              className="font-display text-2xl font-medium tracking-tight text-[#F5EFE6] sm:text-3xl"
            >
              Seven Animated Pixel Layers
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A99F94]">
              Each animated feature sits in an independent SVG vector group aligned to the{' '}
              {gridLabel} grid. Hover any layer to spotlight it in the scene, or click to toggle it.
            </p>
          </div>
          <button
            type="button"
            onClick={onEnableAllLayers}
            className="self-start rounded-md border border-[#383028] bg-[#1B1814] px-4 py-2 text-xs font-medium text-[#E8DFD3] hover:border-[#D99B26]/60 hover:text-[#FFF7E6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Enable All Layers
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ANIMATION_LAYERS.map((layer, index) => {
            const active = enabledLayers.has(layer.id);
            const num = String(index + 1).padStart(2, '0');
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => onToggleLayer(layer.id)}
                onMouseEnter={() => onHighlightLayer(layer.id)}
                onMouseLeave={() => onHighlightLayer(null)}
                onFocus={() => onHighlightLayer(layer.id)}
                onBlur={() => onHighlightLayer(null)}
                aria-pressed={active}
                className={`group flex flex-col justify-between rounded-lg border p-5 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26] ${
                  active
                    ? 'border-[#332C24] bg-[#191613] hover:border-[#D99B26]/60'
                    : 'border-[#24201B] bg-[#14120F] opacity-70 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#9E9387]">
                    <span className="font-mono-tabular">
                      {num}. {layer.elementCount}
                    </span>
                    <span className={active ? 'font-medium text-[#D99B26]' : 'text-[#786F65]'}>
                      {active ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-[#F5EFE6]">
                    {layer.label}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#A99F94]">
                    {layer.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2: Extracted Room & Accent Palette */}
      <section id="palette" aria-labelledby="palette-heading">
        <div className="border-b border-[#2A241E] pb-6">
          <h2
            id="palette-heading"
            className="font-display text-2xl font-medium tracking-tight text-[#F5EFE6] sm:text-3xl"
          >
            Curated Alchemist Palette · {theme.label}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A99F94]">
            Indexed room tones remapped dynamically for {theme.label.toLowerCase()} lighting—shifting
            sunlit stone and timber into deeper slate, twilight violet, or moonlit indigo while
            preserving warm hearth accents.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {ROOM_COLOR_LAYERS.slice(0, 18).map((swatch) => {
            const meta = ROOM_PALETTE_NAMES[swatch.hex];
            const activeHex = remapRoomColorWithWeights(swatch.hex, weights);
            const pct = ((swatch.pixelCount / totalRoomPixels) * 100).toFixed(1);
            return (
              <div
                key={swatch.hex}
                className="flex flex-col gap-2.5 rounded-lg border border-[#28221D] bg-[#181512] p-3"
              >
                <div
                  className="h-9 w-full rounded border border-black/25 transition-colors duration-200"
                  style={{ backgroundColor: activeHex }}
                  aria-hidden="true"
                />
                <div>
                  <div className="truncate text-xs font-medium text-[#EFE8DF]">
                    {meta?.name ?? swatch.hex}
                  </div>
                  <div className="font-mono-tabular mt-0.5 flex items-center justify-between text-[11px] text-[#9A8F83]">
                    <span>{activeHex}</span>
                    <span>{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 border-t border-[#26201B] pt-6">
          <h3 className="text-sm font-semibold text-[#E8DFD3]">
            Sky &amp; Animated Sprite Accents
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ANIMATION_ACCENT_SWATCHES.map((acc) => {
              const displayHex =
                acc.hex === '#F6FAFF' ? theme.cloudFills.top : acc.hex;
              return (
                <div
                  key={acc.hex}
                  className="flex items-center gap-3 rounded-lg border border-[#28221D] bg-[#181512] p-3"
                >
                  <div
                    className="h-7 w-7 shrink-0 rounded border border-black/25 transition-colors duration-200"
                    style={{ backgroundColor: displayHex }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-[#EFE8DF]">
                      {acc.name}
                    </div>
                    <div className="font-mono-tabular text-[11px] text-[#9A8F83]">
                      {displayHex}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3: Technical Craft Notes */}
      <section
        id="architecture"
        aria-labelledby="architecture-heading"
        className="border-t border-[#2A241E] pt-12"
      >
        <h2
          id="architecture-heading"
          className="font-display text-2xl font-medium tracking-tight text-[#F5EFE6]"
        >
          Vector Pixel Architecture
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-[#F5EFE6]">
              01. Crisp Edge Geometry
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#A99F94]">
              Every pixel in the {gridLabel} grid is encoded via run-length vector paths with SVG{' '}
              <code className="font-mono-tabular text-xs text-[#E8DFD3]">
                shape-rendering=&quot;crispEdges&quot;
              </code>
              , scaling cleanly to any display without raster blur.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F5EFE6]">
              02. Palette-Indexed Time Shifting
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#A99F94]">
              Because every architectural region is indexed by palette color, switching between
              Daylight, Twilight, and Moonlit remaps the sky, clouds, stars, and room tones
              deterministically in real time.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F5EFE6]">
              03. Self-Contained SVG Export
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#A99F94]">
              Exporting packages the active resolution, time-of-day palette, and CSS keyframe
              animations into a standalone{' '}
              <code className="font-mono-tabular text-xs text-[#E8DFD3]">.svg</code> file that plays
              natively in modern browsers.
            </p>
          </div>
        </div>
        <p className="mt-8 border-t border-[#221D18] pt-4 text-xs italic text-[#8A7F74]">
          Apprentice&apos;s Marginalia: Keep watch on the counter — an obsidian familiar sometimes
          wanders out on its own, or answers a quiet sequence of front-left brew, cabinet runes,
          and left bookcase flame.
        </p>
      </section>
    </div>
  );
};
