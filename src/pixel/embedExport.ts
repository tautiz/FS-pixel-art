import {
  AMBIENT_CAT_CHECK_INTERVAL_MS,
  AMBIENT_CAT_PROBABILITY,
  CAT_APPEARANCE_DURATION_MS,
  CAT_BODY_192,
  CAT_BODY_768,
  CAT_EYES_192,
  CAT_EYES_768,
  CAT_SECRET_SEQUENCE,
  CAT_TAIL_192,
  CAT_TAIL_768,
  CLICK_CAT_BONUS_PROBABILITY,
} from './catEasterEgg';
import { CURSOR_GLOW_PALETTES } from './cursorGlow';
import { INTERACTIVE_OBJECT_IDS, INTERACTIVE_OBJECTS } from './interactions';
import { SCENE_HEIGHT, SCENE_WIDTH } from './palette';
import { ROOM_COLOR_LAYERS } from './sceneData';
import { ROOM_COLOR_LAYERS_768 } from './sceneData768';
import { AnimationLayerId } from './sprites';
import { SCENE_768_HEIGHT, SCENE_768_WIDTH } from './sprites768';
import { buildStandaloneSvg, GridPreset } from './svgExport';
import {
  AtmosphereWeights,
  clampCycleDuration,
  CYCLE_24_DURATION_SECONDS,
  remapRoomColor,
  STARS_192,
  STARS_768,
  TIME_OF_DAY_THEMES,
  TimeOfDay,
  TimeOfDayMode,
} from './timeOfDay';
import {
  RAIN_PARTICLES_192,
  RAIN_PARTICLES_768,
  RAIN_TWILIGHT_THRESHOLD,
  SNOW_MOONLIT_THRESHOLD,
  SNOW_PARTICLES_192,
  SNOW_PARTICLES_768,
  WeatherMode,
} from './weather';

export interface InteractiveEmbedOptions {
  readonly gridPreset: GridPreset;
  readonly timeMode: TimeOfDayMode;
  readonly timeOfDay: TimeOfDay;
  readonly atmosphere?: AtmosphereWeights;
  readonly cycleSecond?: number;
  readonly cycleDurationSeconds?: number;
  readonly weatherMode?: WeatherMode;
  readonly enabledLayers: ReadonlySet<AnimationLayerId>;
  readonly speed: number;
  readonly paused: boolean;
  readonly enableInteractionMode: boolean;
  readonly enableGlowingCursor: boolean;
  readonly showMiniControls: boolean;
}

export interface IframeEmbedOptions {
  readonly gridPreset: GridPreset;
  readonly timeMode: TimeOfDayMode;
  readonly cycleDurationSeconds?: number;
  readonly weatherMode?: WeatherMode;
  readonly interactionMode: boolean;
  readonly glowingCursor?: boolean;
  readonly showControls: boolean;
  readonly speed: number;
  readonly enabledLayers: ReadonlySet<AnimationLayerId>;
}

export function buildEmbedUrl(baseUrl: string, options: IframeEmbedOptions): string {
  const cleanBase = baseUrl.split('#')[0].split('?')[0];
  const params = new URLSearchParams();
  params.set('embed', '1');
  params.set('grid', options.gridPreset);
  params.set('time', options.timeMode);
  if (
    options.cycleDurationSeconds &&
    clampCycleDuration(options.cycleDurationSeconds) !== CYCLE_24_DURATION_SECONDS
  ) {
    params.set('cycle', String(clampCycleDuration(options.cycleDurationSeconds)));
  }
  if (options.weatherMode && options.weatherMode !== 'auto') {
    params.set('weather', options.weatherMode);
  }
  params.set('interactive', options.interactionMode ? '1' : '0');
  if (options.glowingCursor === false) {
    params.set('glow', '0');
  }
  params.set('controls', options.showControls ? '1' : '0');
  if (options.speed !== 1) {
    params.set('speed', String(options.speed));
  }
  if (options.enabledLayers.size < 7) {
    params.set('layers', Array.from(options.enabledLayers).join(','));
  }
  return `${cleanBase}?${params.toString()}`;
}

export function buildResponsiveIframeSnippet(
  baseUrl: string,
  options: IframeEmbedOptions,
): string {
  const url = buildEmbedUrl(baseUrl, options);
  return `<div style="position:relative;width:100%;max-width:960px;margin:0 auto;aspect-ratio:3/2;overflow:hidden;border-radius:12px;background:#0B0A08;">
  <iframe
    src="${url}"
    title="Alchemist's Study — Interactive Animated Pixel Art"
    style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block;"
    loading="lazy"
    allow="fullscreen"
  ></iframe>
</div>`;
}

export function buildResponsiveImgSnippet(filename: string): string {
  return `<div style="width:100%;max-width:960px;margin:0 auto;aspect-ratio:3/2;overflow:hidden;border-radius:12px;">
  <object
    type="image/svg+xml"
    data="./${filename}"
    aria-label="Alchemist's Study — Animated SVG Pixel Art"
    style="width:100%;height:100%;display:block;"
  >
    <img src="./${filename}" alt="Alchemist's Study — Animated SVG Pixel Art" style="width:100%;height:auto;display:block;" />
  </object>
</div>`;
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildInteractiveHtmlWidget(options: InteractiveEmbedOptions): string {
  const {
    gridPreset,
    timeMode,
    timeOfDay,
    atmosphere,
    cycleSecond = 0,
    cycleDurationSeconds = CYCLE_24_DURATION_SECONDS,
    weatherMode = 'auto',
    enabledLayers,
    speed,
    paused,
    enableInteractionMode,
    enableGlowingCursor,
    showMiniControls,
  } = options;

  const is768 = gridPreset === '768x512';
  const viewW = is768 ? SCENE_768_WIDTH : SCENE_WIDTH;
  const viewH = is768 ? SCENE_768_HEIGHT : SCENE_HEIGHT;

  // Build static+animated base SVG markup (HTML widget provides its own unified runtime, including dynamic weather)
  const rawSvg = buildStandaloneSvg({
    gridPreset,
    timeOfDay,
    atmosphere,
    weatherMode: 'clear',
    enabledLayers,
    speed,
    paused,
    responsive: true,
    enableInteractionMode: false,
    enableGlowingCursor: false,
  });
  const svgMarkup = rawSvg
    .replace(/^<\?xml[^>]*>\s*/i, '')
    .replace('<svg ', '<svg id="study-svg" ');

  // Precompute palette mapping table for all room hexes present in the active SVG
  const baseHexSet = new Set<string>(['#110F0A', '#966338', '#72492C']);
  const roomLayers = is768 ? ROOM_COLOR_LAYERS_768 : ROOM_COLOR_LAYERS;
  for (const l of roomLayers) {
    baseHexSet.add(l.hex.toUpperCase());
  }
  const herbMatches = svgMarkup.matchAll(/data-base-hex="(#[0-9A-Fa-f]{6})"/g);
  for (const m of herbMatches) {
    baseHexSet.add(m[1].toUpperCase());
  }

  const roomColorMap: Record<string, { day: string; twilight: string; moonlit: string }> = {};
  for (const hex of baseHexSet) {
    roomColorMap[hex] = {
      day: hex,
      twilight: remapRoomColor(hex, 'twilight'),
      moonlit: remapRoomColor(hex, 'moonlit'),
    };
  }

  const interactiveItems = INTERACTIVE_OBJECT_IDS.map((id) => {
    const meta = INTERACTIVE_OBJECTS[id];
    const box = is768 ? meta.box768 : meta.box192;
    return {
      id,
      kind: meta.kind,
      label: meta.ariaLabel,
      primaryColor: meta.primaryColor,
      secondaryColor: meta.secondaryColor,
      smokeColor: meta.smokeColor,
      durationMs: meta.durationMs,
      box,
    };
  });

  const runtimeConfig = {
    is768,
    viewW,
    viewH,
    initialMode: timeMode,
    initialCycleSecond: cycleSecond,
    cycleDurationSeconds: clampCycleDuration(cycleDurationSeconds),
    initialWeatherMode: weatherMode,
    initialPaused: paused,
    speed,
    enableInteractionMode,
    enableGlowingCursor,
    showMiniControls,
    themes: TIME_OF_DAY_THEMES,
    glowPalettes: CURSOR_GLOW_PALETTES,
    roomColorMap,
    stars: is768 ? STARS_768 : STARS_192,
    weatherConfig: {
      rainThreshold: RAIN_TWILIGHT_THRESHOLD,
      snowThreshold: SNOW_MOONLIT_THRESHOLD,
      rainParticles: is768 ? RAIN_PARTICLES_768 : RAIN_PARTICLES_192,
      snowParticles: is768 ? SNOW_PARTICLES_768 : SNOW_PARTICLES_192,
    },
    interactiveItems,
    catConfig: {
      sequence: CAT_SECRET_SEQUENCE,
      durationMs: CAT_APPEARANCE_DURATION_MS,
      ambientMs: AMBIENT_CAT_CHECK_INTERVAL_MS,
      ambientProb: AMBIENT_CAT_PROBABILITY,
      clickProb: CLICK_CAT_BONUS_PROBABILITY,
      body: is768 ? CAT_BODY_768 : CAT_BODY_192,
      eyes: is768 ? CAT_EYES_768 : CAT_EYES_192,
      tail: is768 ? CAT_TAIL_768 : CAT_TAIL_192,
    },
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alchemist's Study — Interactive Embedded Artwork</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      background: #0B0A08;
      color: #F2EDE6;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .widget-shell {
      position: relative;
      width: 100%;
      max-width: 100%;
      aspect-ratio: 3 / 2;
      overflow: hidden;
      background: #0B0A08;
      touch-action: manipulation;
      user-select: none;
    }
    .widget-shell svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .widget-hud {
      position: absolute;
      left: 10px;
      right: 10px;
      bottom: 10px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      pointer-events: none;
    }
    .widget-hud-group {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      padding: 4px;
      border-radius: 8px;
      background: rgba(18, 16, 14, 0.82);
      border: 1px solid rgba(255, 245, 224, 0.14);
      backdrop-filter: blur(6px);
      pointer-events: auto;
    }
    .widget-btn {
      appearance: none;
      border: 0;
      border-radius: 6px;
      padding: 6px 10px;
      min-height: 30px;
      background: transparent;
      color: #D5CCC1;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
      white-space: nowrap;
    }
    .widget-btn:hover { color: #FFF7E6; background: rgba(255, 255, 255, 0.08); }
    .widget-btn[aria-pressed="true"] {
      background: #D99B26;
      color: #14110E;
    }
    .widget-status {
      padding: 5px 9px;
      border-radius: 8px;
      background: rgba(18, 16, 14, 0.82);
      border: 1px solid rgba(255, 245, 224, 0.14);
      font-size: 11px;
      color: #D5CCC1;
      font-variant-numeric: tabular-nums;
      pointer-events: auto;
    }
    .hit-target:focus, .hit-target:focus-visible { outline: none; }
    @keyframes smokeUp { 0% { opacity: 0; transform: translateY(0); } 25% { opacity: 0.95; } 100% { opacity: 0; transform: translateY(${is768 ? -44 : -11}px); } }
    @keyframes flarePop { 0% { opacity: 0.25; transform: scale(0.8); } 30% { opacity: 1; transform: scale(1.18); } 100% { opacity: 0; transform: scale(0.95); } }
    .fx-rise { animation: smokeUp 1.35s ease-out forwards; }
    .fx-flare { transform-box: fill-box; transform-origin: center; animation: flarePop 1.25s ease-out forwards; }
    @keyframes catAppear { 0% { opacity: 0; transform: translate(${is768 ? 44 : 11}px, 0); } 12% { opacity: 1; transform: translate(${is768 ? 12 : 3}px, ${is768 ? -4 : -1}px); } 20%, 80% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(${is768 ? -8 : -2}px, ${is768 ? -12 : -3}px); } }
    @keyframes catTail { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(9deg); } }
    @keyframes catBlink { 0%, 38%, 44%, 76%, 82%, 100% { transform: scaleY(1); } 41%, 79% { transform: scaleY(0.15); } }
    .fx-cat-appear { animation: catAppear 5.8s steps(${is768 ? 24 : 16}, end) forwards; }
    .fx-cat-tail { transform-box: fill-box; transform-origin: bottom left; animation: catTail 1.6s ease-in-out infinite; }
    .fx-cat-blink { transform-box: fill-box; transform-origin: center; animation: catBlink 3.8s steps(2, end) infinite; }
    @keyframes rainFallWidget { 0% { transform: translate(0px, ${is768 ? -64 : -16}px); opacity: 0; } 10%, 88% { opacity: 1; } 100% { transform: translate(${is768 ? -32 : -8}px, ${is768 ? 592 : 148}px); opacity: 0; } }
    @keyframes snowFallWidget { 0% { transform: translate(0px, ${is768 ? -48 : -12}px); opacity: 0; } 12% { opacity: 1; } 35% { transform: translate(${is768 ? 12 : 3}px, ${is768 ? 176 : 44}px); } 65% { transform: translate(${is768 ? -12 : -3}px, ${is768 ? 368 : 92}px); } 90% { opacity: 0.9; } 100% { transform: translate(${is768 ? 8 : 2}px, ${is768 ? 584 : 146}px); opacity: 0; } }
    .fx-rain { animation: rainFallWidget ${(1.3 / speed).toFixed(2)}s linear infinite; }
    .fx-snow { animation: snowFallWidget ${(6.8 / speed).toFixed(2)}s linear infinite; }
    [data-widget-paused="true"] * { animation-play-state: paused !important; }
    @media (max-width: 540px) {
      .widget-hud { left: 6px; right: 6px; bottom: 6px; }
      .widget-btn { padding: 6px 8px; font-size: 11px; min-height: 32px; }
      .widget-status { font-size: 10px; }
    }
  </style>
</head>
<body>
  <div id="widget-shell" class="widget-shell" data-widget-paused="${paused ? 'true' : 'false'}">
    ${svgMarkup}
    ${
      showMiniControls
        ? `<div class="widget-hud" role="toolbar" aria-label="Interactive artwork controls">
      <div class="widget-hud-group">
        <button id="btn-pause" type="button" class="widget-btn" aria-pressed="${paused ? 'true' : 'false'}">${paused ? 'Play' : 'Pause'}</button>
        <button id="btn-interact" type="button" class="widget-btn" aria-pressed="${enableInteractionMode ? 'true' : 'false'}">Interact</button>
        <button id="btn-mode" type="button" class="widget-btn" aria-pressed="${timeMode === 'cycle24' ? 'true' : 'false'}">Mode</button>
      </div>
      <div id="widget-status" class="widget-status"></div>
    </div>`
        : ''
    }
  </div>
  <script>
    (function () {
      const CFG = ${safeJson(runtimeConfig)};
      const SVG_NS = "http://www.w3.org/2000/svg";
      const shell = document.getElementById("widget-shell");
      const svg = document.getElementById("study-svg");
      if (!svg) return;

      let timeMode = CFG.initialMode;
      let cycleSecond = CFG.initialCycleSecond || 0;
      let paused = !!CFG.initialPaused;
      let interactEnabled = !!CFG.enableInteractionMode;

      const SOLAR = [
        [0,0,0,1],[1,0,0.02,0.98],[2,0,0.06,0.94],[3,0,0.14,0.86],[4,0,0.34,0.66],
        [5,0.08,0.68,0.24],[6,0.32,0.68,0],[7,0.68,0.32,0],[8,0.85,0.15,0],[9,0.93,0.07,0],
        [10,0.97,0.03,0],[11,0.99,0.01,0],[12,1,0,0],[13,0.98,0.02,0],[14,0.94,0.06,0],
        [15,0.86,0.14,0],[16,0.7,0.3,0],[17,0.36,0.64,0],[18,0,1,0],[19,0,0.64,0.36],
        [20,0,0.28,0.72],[21,0,0.14,0.86],[22,0,0.06,0.94],[23,0,0.02,0.98]
      ];

      function parseHex(h) {
        return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
      }
      function toHex(r, g, b) {
        const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
        return ("#" + c(r) + c(g) + c(b)).toUpperCase();
      }
      function blend3(a, b, c, w) {
        const [ar,ag,ab] = parseHex(a), [br,bg,bb] = parseHex(b), [cr,cg,cb] = parseHex(c);
        return toHex(ar*w.day + br*w.twilight + cr*w.moonlit, ag*w.day + bg*w.twilight + cg*w.moonlit, ab*w.day + bb*w.twilight + cb*w.moonlit);
      }
      function blend2(a, b, t) {
        const k = Math.max(0, Math.min(1, t));
        const [ar,ag,ab] = parseHex(a), [br,bg,bb] = parseHex(b);
        return toHex(ar + (br-ar)*k, ag + (bg-ag)*k, ab + (bb-ab)*k);
      }
      function getWeights() {
        if (timeMode === "day") return { day: 1, twilight: 0, moonlit: 0 };
        if (timeMode === "twilight") return { day: 0, twilight: 1, moonlit: 0 };
        if (timeMode === "moonlit") return { day: 0, twilight: 0, moonlit: 1 };
        if (timeMode === "auto") {
          const h = new Date().getHours();
          if (h >= 7 && h < 17) return { day: 1, twilight: 0, moonlit: 0 };
          if ((h >= 5 && h < 7) || (h >= 17 && h < 20)) return { day: 0, twilight: 1, moonlit: 0 };
          return { day: 0, twilight: 0, moonlit: 1 };
        }
        const dur = Math.max(1, CFG.cycleDurationSeconds || 24);
        const norm = ((Math.floor(cycleSecond) % dur) + dur) % dur;
        const hFloat = (norm / dur) * 24;
        const idx = Math.floor(hFloat) % 24;
        const nextIdx = (idx + 1) % 25;
        const t = hFloat - Math.floor(hFloat);
        const a = SOLAR[idx], b = SOLAR[nextIdx];
        const day = a[1] + (b[1] - a[1]) * t;
        const twilight = a[2] + (b[2] - a[2]) * t;
        const moonlit = a[3] + (b[3] - a[3]) * t;
        const sum = day + twilight + moonlit || 1;
        return { day: day / sum, twilight: twilight / sum, moonlit: moonlit / sum };
      }

      function ensureStarsAndMoon() {
        const sky = svg.querySelector("#layer-sky");
        if (!sky) return { stars: null, moon: null };
        let stars = svg.querySelector("#layer-stars");
        if (!stars) {
          stars = document.createElementNS(SVG_NS, "g");
          stars.setAttribute("id", "layer-stars");
          CFG.stars.forEach((s) => {
            const r = document.createElementNS(SVG_NS, "rect");
            r.setAttribute("class", "anim-star");
            r.setAttribute("style", "animation-delay:" + s.delay);
            r.setAttribute("x", String(s.x));
            r.setAttribute("y", String(s.y));
            r.setAttribute("width", CFG.is768 ? "2" : "1");
            r.setAttribute("height", CFG.is768 ? "2" : "1");
            r.setAttribute("fill", s.color);
            stars.appendChild(r);
          });
          sky.appendChild(stars);
        }
        let moon = svg.querySelector("#layer-moon");
        if (!moon) {
          moon = document.createElementNS(SVG_NS, "g");
          moon.setAttribute("id", "layer-moon");
          const parts = CFG.is768
            ? [[498,10,12,2,"#EAF3FF"],[494,12,10,3,"#EAF3FF"],[491,15,8,4,"#DCEBFF"],[490,19,7,7,"#DCEBFF"],[491,26,8,4,"#C4DCFA"],[494,30,10,3,"#B8D4F8"],[498,33,12,2,"#A9C8F2"]]
            : [[124,3,3,1,"#EAF3FF"],[123,4,2,2,"#DCEBFF"],[124,6,3,1,"#BFD8FA"]];
          parts.forEach((p) => {
            const r = document.createElementNS(SVG_NS, "rect");
            r.setAttribute("x", String(p[0]));
            r.setAttribute("y", String(p[1]));
            r.setAttribute("width", String(p[2]));
            r.setAttribute("height", String(p[3]));
            r.setAttribute("fill", String(p[4]));
            moon.appendChild(r);
          });
          sky.appendChild(moon);
        }
        return { stars, moon };
      }

      const weatherLayer = document.createElementNS(SVG_NS, "g");
      weatherLayer.setAttribute("id", "layer-weather");
      weatherLayer.setAttribute("style", "pointer-events:none");
      svg.appendChild(weatherLayer);

      let weatherMode = CFG.initialWeatherMode || "auto";
      let renderedWeatherKind = "none";

      function resolveWidgetWeather(w) {
        if (weatherMode === "clear") return { kind: "none", label: "", opacity: 0 };
        if (weatherMode === "rain") return { kind: "rain", label: "Rain", opacity: 0.92 };
        if (weatherMode === "snow") return { kind: "snow", label: "Snow", opacity: 0.94 };
        const wc = CFG.weatherConfig;
        if (w.moonlit >= wc.snowThreshold || (w.moonlit >= w.twilight && w.moonlit >= w.day)) {
          const s = Math.max(0, Math.min(1, (w.moonlit - 0.36) / 0.46));
          if (s > 0.05) return { kind: "snow", label: "Snow", opacity: Number((0.28 + s * 0.66).toFixed(2)) };
        }
        if (w.twilight >= wc.rainThreshold || (w.twilight >= w.day && w.twilight >= w.moonlit)) {
          const s = Math.max(0, Math.min(1, (w.twilight - 0.30) / 0.48));
          if (s > 0.05) return { kind: "rain", label: "Rain", opacity: Number((0.26 + s * 0.64).toFixed(2)) };
        }
        return { kind: "none", label: "", opacity: 0 };
      }

      function syncWeatherLayer(w) {
        const ws = resolveWidgetWeather(w);
        if (ws.kind !== renderedWeatherKind) {
          renderedWeatherKind = ws.kind;
          weatherLayer.innerHTML = "";
          weatherLayer.setAttribute("data-weather-kind", ws.kind);
          if (ws.kind !== "none") {
            const list = ws.kind === "rain" ? CFG.weatherConfig.rainParticles : CFG.weatherConfig.snowParticles;
            const cls = ws.kind === "rain" ? "fx-rain" : "fx-snow";
            list.forEach((p) => {
              const r = document.createElementNS(SVG_NS, "rect");
              r.setAttribute("class", cls);
              r.setAttribute("style", "animation-duration:" + (parseFloat(p.duration) / CFG.speed).toFixed(2) + "s;animation-delay:" + p.delay);
              r.setAttribute("x", String(p.x));
              r.setAttribute("y", String(p.y));
              r.setAttribute("width", String(p.w));
              r.setAttribute("height", String(p.h));
              r.setAttribute("fill", p.color);
              r.setAttribute("opacity", String(p.opacity));
              weatherLayer.appendChild(r);
            });
          }
        }
        weatherLayer.setAttribute("opacity", String(ws.opacity));
        return ws;
      }

      let currentWeights = getWeights();
      function applyAtmosphere() {
        currentWeights = getWeights();
        const w = currentWeights;
        const t = CFG.themes;
        const sky = svg.querySelector("#layer-sky");
        if (sky) {
          const bands = CFG.is768 ? t.day.skyBands768 : t.day.skyBands192;
          const twBands = CFG.is768 ? t.twilight.skyBands768 : t.twilight.skyBands192;
          const mnBands = CFG.is768 ? t.moonlit.skyBands768 : t.moonlit.skyBands192;
          const skyRects = sky.querySelectorAll(":scope > rect");
          bands.forEach((c, idx) => {
            if (skyRects[idx]) skyRects[idx].setAttribute("fill", blend3(c, twBands[idx], mnBands[idx], w));
          });
          const sm = ensureStarsAndMoon();
          const starOp = Math.max(0, Math.min(1, w.twilight * 0.78 + w.moonlit));
          const moonOp = Math.max(0, Math.min(1, (w.moonlit - 0.32) / 0.58));
          if (sm.stars) sm.stars.setAttribute("opacity", starOp.toFixed(2));
          if (sm.moon) sm.moon.setAttribute("opacity", moonOp.toFixed(2));
        }

        svg.querySelectorAll("[data-base-hex]").forEach((el) => {
          const base = el.getAttribute("data-base-hex");
          const entry = base && CFG.roomColorMap[base];
          if (entry) el.setAttribute("fill", blend3(entry.day, entry.twilight, entry.moonlit, w));
        });

        const moteRects = svg.querySelectorAll("#layer-motes rect");
        moteRects.forEach((el, idx) => {
          const base = blend3(t.day.motePalette[idx % 3], t.twilight.motePalette[idx % 3], t.moonlit.motePalette[idx % 3], w);
          el.setAttribute("data-mote-base", base);
          el.setAttribute("fill", base);
        });

        const ws = syncWeatherLayer(w);

        const statusEl = document.getElementById("widget-status");
        if (statusEl) {
          const stateLabel = w.day >= w.twilight && w.day >= w.moonlit ? "Daylight" : (w.twilight >= w.moonlit ? "Twilight" : "Moonlit");
          const dur = Math.max(1, CFG.cycleDurationSeconds || 24);
          const norm = ((Math.floor(cycleSecond) % dur) + dur) % dur;
          const totalMins = Math.round((norm / dur) * 24 * 60) % (24 * 60);
          const hh = String(Math.floor(totalMins / 60)).padStart(2, "0");
          const mm = String(totalMins % 60).padStart(2, "0");
          const baseStatus = timeMode === "cycle24"
            ? dur + "s Cycle · " + hh + ":" + mm + " " + stateLabel
            : (timeMode === "auto" ? "Auto · " + stateLabel : stateLabel);
          statusEl.textContent = ws.label ? baseStatus + " · " + ws.label : baseStatus;
        }
      }

      // Dynamic Interaction Layer + Hitboxes
      const fxLayer = document.createElementNS(SVG_NS, "g");
      fxLayer.setAttribute("id", "layer-interactions");
      fxLayer.setAttribute("style", "pointer-events:none");
      svg.appendChild(fxLayer);

      const hitLayer = document.createElementNS(SVG_NS, "g");
      hitLayer.setAttribute("id", "layer-interaction-hitboxes");
      svg.appendChild(hitLayer);

      const catLayer = document.createElementNS(SVG_NS, "g");
      catLayer.setAttribute("id", "layer-alchemist-cat");
      catLayer.setAttribute("style", "pointer-events:none");
      svg.insertBefore(catLayer, fxLayer);

      let catSeqIdx = 0;
      let catActive = false;
      function summonCat() {
        if (catActive) return;
        catActive = true;
        catLayer.innerHTML = "";
        const wrap = document.createElementNS(SVG_NS, "g");
        wrap.setAttribute("class", "fx-cat-appear");
        const tailG = document.createElementNS(SVG_NS, "g");
        tailG.setAttribute("class", "fx-cat-tail");
        const blinkG = document.createElementNS(SVG_NS, "g");
        blinkG.setAttribute("class", "fx-cat-blink");
        function mkRect(r) {
          const el = document.createElementNS(SVG_NS, "rect");
          el.setAttribute("x", String(r.x)); el.setAttribute("y", String(r.y));
          el.setAttribute("width", String(r.w)); el.setAttribute("height", String(r.h));
          el.setAttribute("fill", r.fill);
          return el;
        }
        CFG.catConfig.tail.forEach((r) => tailG.appendChild(mkRect(r)));
        wrap.appendChild(tailG);
        CFG.catConfig.body.forEach((r) => wrap.appendChild(mkRect(r)));
        CFG.catConfig.eyes.forEach((r) => blinkG.appendChild(mkRect(r)));
        wrap.appendChild(blinkG);
        catLayer.appendChild(wrap);
        window.setTimeout(() => { catLayer.innerHTML = ""; catActive = false; }, CFG.catConfig.durationMs);
      }

      window.setInterval(() => {
        if (!paused && !catActive && Math.random() < CFG.catConfig.ambientProb) {
          summonCat();
        }
      }, CFG.catConfig.ambientMs);

      function triggerObject(item) {
        const g = document.createElementNS(SVG_NS, "g");
        const ox = item.box.originX, oy = item.box.originY;
        const unit = CFG.is768 ? 4 : 1;
        if (item.kind === "smoke-puff") {
          [[-3,-2,7,2,item.smokeColor],[-4,-4,8,2,item.smokeColor],[-2,-6,4,2,item.secondaryColor]].forEach((p) => {
            const r = document.createElementNS(SVG_NS, "rect");
            r.setAttribute("class", "fx-rise");
            r.setAttribute("x", String(ox + p[0]*unit));
            r.setAttribute("y", String(oy + p[1]*unit));
            r.setAttribute("width", String(p[2]*unit));
            r.setAttribute("height", String(p[3]*unit));
            r.setAttribute("fill", String(p[4]));
            g.appendChild(r);
          });
        } else {
          const r = document.createElementNS(SVG_NS, "rect");
          r.setAttribute("class", "fx-flare");
          r.setAttribute("x", String(ox - 3*unit));
          r.setAttribute("y", String(oy - 3*unit));
          r.setAttribute("width", String(6*unit));
          r.setAttribute("height", String(6*unit));
          r.setAttribute("fill", item.primaryColor);
          r.setAttribute("opacity", "0.55");
          g.appendChild(r);
        }
        fxLayer.appendChild(g);
        window.setTimeout(() => g.remove(), item.durationMs);

        const seq = CFG.catConfig.sequence;
        if (item.id === seq[catSeqIdx]) {
          catSeqIdx++;
          if (catSeqIdx >= seq.length) { catSeqIdx = 0; summonCat(); }
        } else {
          catSeqIdx = item.id === seq[0] ? 1 : 0;
          if (!catActive && Math.random() < CFG.catConfig.clickProb) summonCat();
        }
      }

      function syncHitboxes() {
        hitLayer.innerHTML = "";
        if (!interactEnabled) return;
        CFG.interactiveItems.forEach((item) => {
          const g = document.createElementNS(SVG_NS, "g");
          g.setAttribute("class", "hit-target");
          g.setAttribute("role", "button");
          g.setAttribute("tabindex", "0");
          g.setAttribute("aria-label", item.label);
          g.setAttribute("style", "cursor:pointer");
          const area = document.createElementNS(SVG_NS, "rect");
          area.setAttribute("x", String(item.box.x));
          area.setAttribute("y", String(item.box.y));
          area.setAttribute("width", String(item.box.w));
          area.setAttribute("height", String(item.box.h));
          area.setAttribute("fill", "transparent");
          g.appendChild(area);
          g.addEventListener("click", () => triggerObject(item));
          g.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerObject(item);
            }
          });
          hitLayer.appendChild(g);
        });
      }

      // Glowing Cursor + Luminosity Shift on Motes & Runes
      if (CFG.enableGlowingCursor) {
        const defs = svg.querySelector("defs") || svg.insertBefore(document.createElementNS(SVG_NS, "defs"), svg.firstChild);
        const grad = document.createElementNS(SVG_NS, "radialGradient");
        grad.setAttribute("id", "embed-cursor-grad");
        grad.setAttribute("cx", "50%");
        grad.setAttribute("cy", "50%");
        grad.setAttribute("r", "50%");
        const s0 = document.createElementNS(SVG_NS, "stop"); s0.setAttribute("offset", "0%"); s0.setAttribute("stop-opacity", "0.34");
        const s1 = document.createElementNS(SVG_NS, "stop"); s1.setAttribute("offset", "45%"); s1.setAttribute("stop-opacity", "0.16");
        const s2 = document.createElementNS(SVG_NS, "stop"); s2.setAttribute("offset", "100%"); s2.setAttribute("stop-opacity", "0");
        grad.append(s0, s1, s2);
        defs.appendChild(grad);

        const glowLayer = document.createElementNS(SVG_NS, "g");
        glowLayer.setAttribute("id", "layer-cursor-glow");
        glowLayer.setAttribute("style", "pointer-events:none;display:none");
        const circle = document.createElementNS(SVG_NS, "circle");
        circle.setAttribute("r", String(CFG.is768 ? 54 : 14));
        circle.setAttribute("fill", "url(#embed-cursor-grad)");
        const spark = document.createElementNS(SVG_NS, "rect");
        spark.setAttribute("width", CFG.is768 ? "2" : "1");
        spark.setAttribute("height", CFG.is768 ? "2" : "1");
        glowLayer.append(circle, spark);
        svg.appendChild(glowLayer);

        const runes = Array.from(svg.querySelectorAll("#layer-runes > g"));
        const runeCenters = runes.map((rg) => {
          const rs = Array.from(rg.querySelectorAll("rect"));
          let sx = 0, sy = 0;
          rs.forEach((r) => {
            sx += Number(r.getAttribute("x") || 0) + Number(r.getAttribute("width") || 1) / 2;
            sy += Number(r.getAttribute("y") || 0) + Number(r.getAttribute("height") || 1) / 2;
          });
          return { g: rg, rects: rs, x: sx / (rs.length || 1), y: sy / (rs.length || 1) };
        });

        const motes = Array.from(svg.querySelectorAll("#layer-motes rect"));

        function updateGlowAt(clientX, clientY) {
          const rect = svg.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          const x = Math.max(0, Math.min(CFG.viewW, ((clientX - rect.left) / rect.width) * CFG.viewW));
          const y = Math.max(0, Math.min(CFG.viewH, ((clientY - rect.top) / rect.height) * CFG.viewH));
          const gp = CFG.glowPalettes;
          const core = blend3(gp.day.core, gp.twilight.core, gp.moonlit.core, currentWeights);
          const mid = blend3(gp.day.mid, gp.twilight.mid, gp.moonlit.mid, currentWeights);
          const halo = blend3(gp.day.halo, gp.twilight.halo, gp.moonlit.halo, currentWeights);
          const boost = blend3(gp.day.boostTarget, gp.twilight.boostTarget, gp.moonlit.boostTarget, currentWeights);
          s0.setAttribute("stop-color", core);
          s1.setAttribute("stop-color", mid);
          s2.setAttribute("stop-color", halo);
          spark.setAttribute("fill", core);
          circle.setAttribute("cx", String(x));
          circle.setAttribute("cy", String(y));
          spark.setAttribute("x", String(Math.round(x) - (CFG.is768 ? 1 : 0)));
          spark.setAttribute("y", String(Math.round(y) - (CFG.is768 ? 1 : 0)));
          glowLayer.style.display = "block";

          const rRad = CFG.is768 ? 72 : 18;
          const mRad = CFG.is768 ? 78 : 20;
          runeCenters.forEach((rc) => {
            const d = Math.hypot(rc.x - x, rc.y - y);
            const p = d >= rRad ? 0 : Math.pow(1 - d / rRad, 2);
            const col = blend2("#FFD878", boost, p * 0.9);
            rc.rects.forEach((r) => r.setAttribute("fill", col));
          });
          motes.forEach((m) => {
            const mx = Number(m.getAttribute("x") || 0);
            const my = Number(m.getAttribute("y") || 0);
            const base = m.getAttribute("data-mote-base") || "#FFF6D6";
            const d = Math.hypot(mx - x, my - y);
            const p = d >= mRad ? 0 : Math.pow(1 - d / mRad, 2);
            m.setAttribute("fill", p > 0 ? blend2(base, boost, p * 0.92) : base);
          });
        }

        svg.addEventListener("pointermove", (e) => updateGlowAt(e.clientX, e.clientY));
        svg.addEventListener("pointerdown", (e) => updateGlowAt(e.clientX, e.clientY));
        svg.addEventListener("pointerleave", () => {
          glowLayer.style.display = "none";
          runeCenters.forEach((rc) => rc.rects.forEach((r) => r.setAttribute("fill", "#FFD878")));
          motes.forEach((m) => {
            const base = m.getAttribute("data-mote-base");
            if (base) m.setAttribute("fill", base);
          });
        });
      }

      if (CFG.showMiniControls) {
        const btnPause = document.getElementById("btn-pause");
        const btnInteract = document.getElementById("btn-interact");
        const btnMode = document.getElementById("btn-mode");
        const MODES = ["cycle24", "auto", "day", "twilight", "moonlit"];
        if (btnPause) {
          btnPause.addEventListener("click", () => {
            paused = !paused;
            shell.setAttribute("data-widget-paused", paused ? "true" : "false");
            btnPause.setAttribute("aria-pressed", paused ? "true" : "false");
            btnPause.textContent = paused ? "Play" : "Pause";
          });
        }
        if (btnInteract) {
          btnInteract.addEventListener("click", () => {
            interactEnabled = !interactEnabled;
            btnInteract.setAttribute("aria-pressed", interactEnabled ? "true" : "false");
            syncHitboxes();
          });
        }
        if (btnMode) {
          btnMode.addEventListener("click", () => {
            const idx = (MODES.indexOf(timeMode) + 1) % MODES.length;
            timeMode = MODES[idx];
            btnMode.setAttribute("aria-pressed", timeMode === "cycle24" ? "true" : "false");
            applyAtmosphere();
          });
        }
      }

      applyAtmosphere();
      syncHitboxes();

      window.setInterval(() => {
        if (timeMode === "cycle24") {
          const dur = Math.max(1, CFG.cycleDurationSeconds || 24);
          cycleSecond = (cycleSecond + 1) % dur;
          applyAtmosphere();
        } else if (timeMode === "auto") {
          applyAtmosphere();
        }
      }, 1000);
    })();
  </script>
</body>
</html>`;
}
