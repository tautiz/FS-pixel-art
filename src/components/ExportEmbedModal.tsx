import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Code2, Copy, Download, Monitor, Smartphone, Tablet, X } from 'lucide-react';
import {
  buildInteractiveHtmlWidget,
  buildResponsiveIframeSnippet,
  buildResponsiveImgSnippet,
} from '../pixel/embedExport';
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
} from '../pixel/catEasterEgg';
import {
  ActiveInteraction,
  createInteractionEvent,
  INTERACTIVE_OBJECTS,
  InteractiveObjectId,
  pruneExpiredInteractions,
  upsertActiveInteraction,
} from '../pixel/interactions';
import { AnimationLayerId } from '../pixel/sprites';
import { GridPreset } from '../pixel/svgExport';
import { AtmosphereWeights, TimeOfDay, TimeOfDayMode } from '../pixel/timeOfDay';
import { WeatherMode } from '../pixel/weather';
import { PixelSceneSvg } from './PixelSceneSvg';

type ExportTab = 'html' | 'iframe' | 'svg';
type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

interface ExportEmbedModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly gridPreset: GridPreset;
  readonly timeMode: TimeOfDayMode;
  readonly timeOfDay: TimeOfDay;
  readonly atmosphere: AtmosphereWeights;
  readonly cycleSecond: number;
  readonly cycleDurationSeconds?: number;
  readonly weatherMode?: WeatherMode;
  readonly enabledLayers: ReadonlySet<AnimationLayerId>;
  readonly speed: number;
  readonly paused: boolean;
  readonly onDownloadSvg: (opts?: {
    enableInteractionMode?: boolean;
    enableGlowingCursor?: boolean;
  }) => void;
  readonly onDownloadInteractiveHtml: (opts: {
    enableInteractionMode: boolean;
    enableGlowingCursor: boolean;
    showMiniControls: boolean;
  }) => void;
}

export const ExportEmbedModal: React.FC<ExportEmbedModalProps> = ({
  open,
  onClose,
  gridPreset,
  timeMode,
  timeOfDay,
  atmosphere,
  cycleSecond,
  cycleDurationSeconds = 24,
  weatherMode = 'auto',
  enabledLayers,
  speed,
  paused,
  onDownloadSvg,
  onDownloadInteractiveHtml,
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('html');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [includeControls, setIncludeControls] = useState(true);
  const [includeInteractions, setIncludeInteractions] = useState(true);
  const [includeGlowingCursor, setIncludeGlowingCursor] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewInteractions, setPreviewInteractions] = useState<readonly ActiveInteraction[]>([]);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [previewCat, setPreviewCat] = useState<CatAppearance | null>(null);
  const seqRef = useRef(0);
  const noticeTimerRef = useRef<number | null>(null);
  const expiryTimersRef = useRef<number[]>([]);
  const catSeqProgressRef = useRef(0);
  const catCounterRef = useRef(0);
  const catExpiryTimerRef = useRef<number | null>(null);
  const previewCatRef = useRef<CatAppearance | null>(null);
  previewCatRef.current = previewCat;

  useEffect(() => {
    if (!open) {
      setPreviewInteractions([]);
      setPreviewNotice(null);
      setPreviewCat(null);
      previewCatRef.current = null;
      catSeqProgressRef.current = 0;
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
      if (catExpiryTimerRef.current !== null) {
        window.clearTimeout(catExpiryTimerRef.current);
        catExpiryTimerRef.current = null;
      }
      expiryTimersRef.current.forEach((id) => window.clearTimeout(id));
      expiryTimersRef.current = [];
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const summonPreviewCat = useCallback((reason: CatAppearanceReason) => {
    const now = Date.now();
    catCounterRef.current += 1;
    const appearance = createCatAppearance(reason, now, catCounterRef.current);
    setPreviewCat(appearance);
    previewCatRef.current = appearance;
    setPreviewNotice(getCatStatusMessage(reason));
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setPreviewNotice(null);
      noticeTimerRef.current = null;
    }, CAT_APPEARANCE_DURATION_MS + 400);
    if (catExpiryTimerRef.current !== null) {
      window.clearTimeout(catExpiryTimerRef.current);
    }
    catExpiryTimerRef.current = window.setTimeout(() => {
      setPreviewCat(null);
      previewCatRef.current = null;
      catExpiryTimerRef.current = null;
    }, CAT_APPEARANCE_DURATION_MS + 60);
  }, []);

  useEffect(() => {
    if (!open || paused) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (
        shouldTriggerRandomCat(
          Math.random(),
          AMBIENT_CAT_PROBABILITY,
          isCatActive(previewCatRef.current, now),
        )
      ) {
        summonPreviewCat('random');
      }
    }, AMBIENT_CAT_CHECK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [open, paused, summonPreviewCat]);

  const triggerPreviewInteraction = useCallback(
    (objectId: InteractiveObjectId) => {
      if (!includeInteractions) return;
      const now = Date.now();
      seqRef.current += 1;
      const event = createInteractionEvent(objectId, now, seqRef.current);
      const meta = INTERACTIVE_OBJECTS[objectId];
      setPreviewInteractions((prev) => upsertActiveInteraction(prev, event, now));
      setPreviewNotice(meta.statusMessage);
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
      noticeTimerRef.current = window.setTimeout(() => {
        setPreviewNotice(null);
        noticeTimerRef.current = null;
      }, meta.durationMs + 700);
      const timerId = window.setTimeout(() => {
        setPreviewInteractions((prev) => pruneExpiredInteractions(prev, Date.now()));
      }, meta.durationMs + 40);
      expiryTimersRef.current.push(timerId);

      const seqResult = advanceCatSequence(catSeqProgressRef.current, objectId);
      catSeqProgressRef.current = seqResult.nextProgress;
      if (seqResult.triggered) {
        summonPreviewCat('sequence');
      } else if (
        shouldTriggerRandomCat(
          Math.random(),
          CLICK_CAT_BONUS_PROBABILITY,
          isCatActive(previewCatRef.current, now),
        )
      ) {
        summonPreviewCat('random');
      }
    },
    [includeInteractions, summonPreviewCat],
  );

  const toggleIncludeInteractions = useCallback(() => {
    setIncludeInteractions((prev) => {
      const next = !prev;
      catSeqProgressRef.current = 0;
      if (!next) {
        setPreviewInteractions([]);
        setPreviewNotice(null);
      }
      return next;
    });
  }, []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://example.com/';
  const svgFilename = `alchemists-study-${gridPreset}-${timeOfDay}.svg`;

  const iframeSnippet = useMemo(
    () =>
      buildResponsiveIframeSnippet(baseUrl, {
        gridPreset,
        timeMode,
        cycleDurationSeconds,
        weatherMode,
        interactionMode: includeInteractions,
        glowingCursor: includeGlowingCursor,
        showControls: includeControls,
        speed,
        enabledLayers,
      }),
    [
      baseUrl,
      cycleDurationSeconds,
      enabledLayers,
      gridPreset,
      includeControls,
      includeGlowingCursor,
      includeInteractions,
      speed,
      timeMode,
      weatherMode,
    ],
  );

  const svgEmbedSnippet = useMemo(() => buildResponsiveImgSnippet(svgFilename), [svgFilename]);

  const htmlWidgetSizeKb = useMemo(() => {
    if (!open || activeTab !== 'html') return null;
    const html = buildInteractiveHtmlWidget({
      gridPreset,
      timeMode,
      timeOfDay,
      atmosphere,
      cycleSecond,
      cycleDurationSeconds,
      weatherMode,
      enabledLayers,
      speed,
      paused,
      enableInteractionMode: includeInteractions,
      enableGlowingCursor: includeGlowingCursor,
      showMiniControls: includeControls,
    });
    return Math.round(new Blob([html]).size / 1024);
  }, [
    activeTab,
    atmosphere,
    cycleDurationSeconds,
    cycleSecond,
    enabledLayers,
    gridPreset,
    includeControls,
    includeGlowingCursor,
    includeInteractions,
    open,
    paused,
    speed,
    timeMode,
    timeOfDay,
    weatherMode,
  ]);

  if (!open) return null;

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      setCopiedKey(null);
    }
  };

  const previewWidthClass =
    previewDevice === 'mobile'
      ? 'max-w-[230px]'
      : previewDevice === 'tablet'
        ? 'max-w-[400px]'
        : 'max-w-[560px]';

  const previewLabel =
    previewDevice === 'mobile'
      ? 'Mobile (375px viewport auto-scale)'
      : previewDevice === 'tablet'
        ? 'Tablet (768px viewport auto-scale)'
        : 'Desktop (Full-width responsive container)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        data-testid="export-embed-modal"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#352E26] bg-[#161310] p-5 text-[#F2EDE6] shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#2A241E] pb-4">
          <div>
            <h2
              id="export-modal-title"
              className="font-display text-xl font-medium tracking-tight text-[#F5EFE6] sm:text-2xl"
            >
              Export &amp; Embed Interactive Artwork
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#A99F94] sm:text-sm">
              Portable, auto-scalable formats sized via 3:2 responsive aspect geometry for mobile,
              tablet, and desktop sites.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#332C24] bg-[#1D1915] text-[#D5CCC1] hover:border-[#D99B26]/60 hover:text-[#FFF7E6] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Format Tabs */}
        <div
          role="tablist"
          aria-label="Export format"
          className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-[#2B251F] bg-[#110F0D] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'html'}
            onClick={() => setActiveTab('html')}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'html'
                ? 'bg-[#D99B26] text-[#14110E]'
                : 'text-[#A99F94] hover:text-[#F5EFE6]'
            }`}
          >
            Interactive HTML Widget
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'iframe'}
            onClick={() => setActiveTab('iframe')}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'iframe'
                ? 'bg-[#D99B26] text-[#14110E]'
                : 'text-[#A99F94] hover:text-[#F5EFE6]'
            }`}
          >
            Responsive Iframe Embed
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'svg'}
            onClick={() => setActiveTab('svg')}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'svg'
                ? 'bg-[#D99B26] text-[#14110E]'
                : 'text-[#A99F94] hover:text-[#F5EFE6]'
            }`}
          >
            Responsive Animated SVG
          </button>
        </div>

        {/* Shared Interactive Options */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {activeTab !== 'svg' && (
            <button
              type="button"
              onClick={() => setIncludeControls((v) => !v)}
              aria-pressed={includeControls}
              className={`min-h-[34px] rounded-md border px-3 py-1 font-medium transition-colors cursor-pointer ${
                includeControls
                  ? 'border-[#D99B26]/60 bg-[#2A2319] text-[#F7DFB0]'
                  : 'border-[#2E2822] bg-[#14120F] text-[#9A8F83]'
              }`}
            >
              Mini Viewer Controls: {includeControls ? 'On' : 'Off'}
            </button>
          )}
          <button
            type="button"
            data-testid="modal-toggle-interactions"
            onClick={toggleIncludeInteractions}
            aria-pressed={includeInteractions}
            className={`min-h-[34px] rounded-md border px-3 py-1 font-medium transition-colors cursor-pointer ${
              includeInteractions
                ? 'border-[#52D1A2]/60 bg-[#172B24] text-[#A8F5D8]'
                : 'border-[#2E2822] bg-[#14120F] text-[#9A8F83]'
            }`}
          >
            Click / Tap Objects: {includeInteractions ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            data-testid="modal-toggle-glow"
            onClick={() => setIncludeGlowingCursor((v) => !v)}
            aria-pressed={includeGlowingCursor}
            className={`min-h-[34px] rounded-md border px-3 py-1 font-medium transition-colors cursor-pointer ${
              includeGlowingCursor
                ? 'border-[#D99B26]/60 bg-[#2A2319] text-[#F7DFB0]'
                : 'border-[#2E2822] bg-[#14120F] text-[#9A8F83]'
            }`}
          >
            Glowing Cursor: {includeGlowingCursor ? 'On' : 'Off'}
          </button>
        </div>

        {/* Responsive Auto-Scale Device Preview */}
        <div className="mt-4 rounded-lg border border-[#2A241E] bg-[#110F0D] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <span className="text-xs font-medium text-[#A99F94]">{previewLabel}</span>
            <div
              role="group"
              aria-label="Responsive preview device"
              className="inline-flex items-center rounded-md border border-[#2B251F] bg-[#181512] p-0.5"
            >
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                aria-pressed={previewDevice === 'desktop'}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  previewDevice === 'desktop'
                    ? 'bg-[#D99B26] text-[#14110E]'
                    : 'text-[#A99F94] hover:text-[#F5EFE6]'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                aria-pressed={previewDevice === 'tablet'}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  previewDevice === 'tablet'
                    ? 'bg-[#D99B26] text-[#14110E]'
                    : 'text-[#A99F94] hover:text-[#F5EFE6]'
                }`}
              >
                <Tablet className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                aria-pressed={previewDevice === 'mobile'}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-[#D99B26] text-[#14110E]'
                    : 'text-[#A99F94] hover:text-[#F5EFE6]'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          <div
            data-testid="responsive-embed-preview"
            data-device={previewDevice}
            className={`mx-auto aspect-[3/2] w-full overflow-hidden rounded-lg border border-[#2E2822] bg-[#0B0A08] transition-all duration-200 ${previewWidthClass}`}
          >
            <PixelSceneSvg
              gridPreset={gridPreset}
              timeOfDay={timeOfDay}
              timeMode={timeMode}
              atmosphere={atmosphere}
              cycleSecond={cycleSecond}
              cycleDurationSeconds={cycleDurationSeconds}
              weatherMode={weatherMode}
              interactionMode={includeInteractions}
              glowingCursorEnabled={includeGlowingCursor}
              activeInteractions={previewInteractions}
              catAppearance={previewCat}
              onTriggerInteraction={triggerPreviewInteraction}
              enabledLayers={enabledLayers}
              highlightedLayer={null}
              paused={paused}
              speed={speed}
              showGrid={false}
            />
          </div>

          <div className="mt-2.5 flex min-h-[20px] items-center justify-between gap-2 text-[11px]">
            {previewNotice ? (
              <span
                role="status"
                data-testid="modal-interaction-status"
                className="font-medium text-[#7FE8C4]"
              >
                {previewNotice}
              </span>
            ) : includeInteractions ? (
              <span className="text-[#9E9387]">
                Click or tap cauldrons, sconces, runes, or vials in the preview above to test interactivity
              </span>
            ) : (
              <span className="text-[#786F66]">Click / Tap Objects disabled for this preview</span>
            )}
          </div>
        </div>

        {/* Format-Specific Export / Code */}
        {activeTab === 'html' && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs leading-relaxed text-[#A99F94]">
              Exports a single offline-ready <code className="font-mono-tabular text-[#EFE8DF]">.html</code>{' '}
              widget with touch &amp; mouse glowing cursor, clickable objects, and live{' '}
              {timeMode === 'cycle24' ? `${cycleDurationSeconds}-second gradual cycle` : 'Time of Day'} support
              {htmlWidgetSizeKb ? ` (~${htmlWidgetSizeKb} KB)` : ''}.
            </div>
            <button
              type="button"
              onClick={() =>
                onDownloadInteractiveHtml({
                  enableInteractionMode: includeInteractions,
                  enableGlowingCursor: includeGlowingCursor,
                  showMiniControls: includeControls,
                })
              }
              data-testid="download-interactive-html-btn"
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-md bg-[#D99B26] px-4 py-2 text-xs font-semibold text-[#14110E] hover:bg-[#E7AC3B] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download Interactive HTML</span>
            </button>
          </div>
        )}

        {activeTab === 'iframe' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E8DFD3]">
                <Code2 className="h-3.5 w-3.5 text-[#D99B26]" aria-hidden="true" />
                <span>Responsive Embed Code (auto-scales on any screen)</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(iframeSnippet, 'iframe')}
                data-testid="copy-iframe-btn"
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-[#383028] bg-[#241F1A] px-3 py-1 text-xs font-medium text-[#F5EFE6] hover:border-[#D99B26]/60 transition-colors cursor-pointer"
              >
                {copiedKey === 'iframe' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#52D1A2]" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy Iframe Code</span>
                  </>
                )}
              </button>
            </div>
            <pre
              data-testid="iframe-snippet-code"
              className="font-mono-tabular whitespace-pre-wrap break-words rounded-lg border border-[#2B251F] bg-[#0D0B09] p-3 text-[11px] leading-relaxed text-[#D8CEC0]"
            >
              <code>{iframeSnippet}</code>
            </pre>
          </div>
        )}

        {activeTab === 'svg' && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-[#A99F94]">
                Exports a responsive <code className="font-mono-tabular text-[#EFE8DF]">.svg</code>{' '}
                using <code className="font-mono-tabular text-[#EFE8DF]">viewBox</code> +{' '}
                <code className="font-mono-tabular text-[#EFE8DF]">preserveAspectRatio</code> so it
                auto-scales cleanly inside mobile, tablet, and desktop layouts.
              </p>
              <button
                type="button"
                onClick={() =>
                  onDownloadSvg({
                    enableInteractionMode: includeInteractions,
                    enableGlowingCursor: includeGlowingCursor,
                  })
                }
                data-testid="download-responsive-svg-btn"
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-md bg-[#D99B26] px-4 py-2 text-xs font-semibold text-[#14110E] hover:bg-[#E7AC3B] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Download Responsive SVG</span>
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-medium text-[#E8DFD3]">Responsive HTML Wrapper</span>
              <button
                type="button"
                onClick={() => handleCopy(svgEmbedSnippet, 'svg')}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-[#383028] bg-[#241F1A] px-3 py-1 text-xs font-medium text-[#F5EFE6] hover:border-[#D99B26]/60 transition-colors cursor-pointer"
              >
                {copiedKey === 'svg' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#52D1A2]" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy SVG Wrapper</span>
                  </>
                )}
              </button>
            </div>
            <pre className="font-mono-tabular whitespace-pre-wrap break-words rounded-lg border border-[#2B251F] bg-[#0D0B09] p-3 text-[11px] leading-relaxed text-[#D8CEC0]">
              <code>{svgEmbedSnippet}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
