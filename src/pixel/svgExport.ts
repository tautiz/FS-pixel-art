import { resolveCursorGlowPalette } from './cursorGlow';
import { INTERACTIVE_OBJECT_IDS, INTERACTIVE_OBJECTS } from './interactions';
import { SCENE_HEIGHT, SCENE_WIDTH } from './palette';
import { rectsB64ToSvgPath, spansToSvgPath } from './rle';
import { ROOM_COLOR_LAYERS } from './sceneData';
import { ROOM_COLOR_LAYERS_768 } from './sceneData768';
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
} from './sprites';
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
} from './sprites768';
import {
  AtmosphereWeights,
  remapRoomColorWithWeights,
  ResolvedSceneTheme,
  resolveThemeForWeights,
  STARS_192,
  STARS_768,
  TimeOfDay,
  weightsForTimeOfDay,
} from './timeOfDay';
import {
  RAIN_PARTICLES_192,
  RAIN_PARTICLES_768,
  ResolvedWeatherState,
  resolveWeatherState,
  SNOW_PARTICLES_192,
  SNOW_PARTICLES_768,
  WeatherMode,
} from './weather';

export type GridPreset = '192x128' | '768x512';

export interface SvgExportOptions {
  readonly gridPreset?: GridPreset;
  readonly timeOfDay?: TimeOfDay;
  readonly atmosphere?: AtmosphereWeights;
  readonly weatherMode?: WeatherMode;
  readonly enabledLayers: ReadonlySet<AnimationLayerId>;
  readonly speed: number;
  readonly paused: boolean;
  readonly responsive?: boolean;
  readonly enableInteractionMode?: boolean;
  readonly enableGlowingCursor?: boolean;
}

function mapCloudColor(fill: string, theme: ResolvedSceneTheme): string {
  if (fill === '#FFFFFF' || fill === '#F6FAFF') return theme.cloudFills.top;
  if (fill === '#F0F6FC') return theme.cloudFills.mid;
  if (fill === '#DCEBF9') return theme.cloudFills.body;
  return theme.cloudFills.shadow;
}

function buildInteractiveSvgTail(
  is768: boolean,
  theme: ResolvedSceneTheme,
  enableInteractionMode: boolean,
  enableGlowingCursor: boolean,
): { defsExtra: string; cssExtra: string; bodyExtra: string } {
  if (!enableInteractionMode && !enableGlowingCursor) {
    return { defsExtra: '', cssExtra: '', bodyExtra: '' };
  }

  const viewW = is768 ? SCENE_768_WIDTH : SCENE_WIDTH;
  const viewH = is768 ? SCENE_768_HEIGHT : SCENE_HEIGHT;
  const glow = resolveCursorGlowPalette(theme.weights);

  const cssExtra = `
    .interactive-target { cursor: pointer; }
    .interactive-target:focus, .interactive-target:focus-visible { outline: none; }
    @keyframes svgSmokeUp { 0% { opacity: 0; transform: translateY(0px); } 25% { opacity: 0.95; } 100% { opacity: 0; transform: translateY(${is768 ? -44 : -11}px); } }
    @keyframes svgFlarePop { 0% { opacity: 0.25; transform: scale(0.8); } 30% { opacity: 1; transform: scale(1.18); } 100% { opacity: 0; transform: scale(0.95); } }
    .svg-fx-rise { animation: svgSmokeUp 1.35s ease-out forwards; }
    .svg-fx-flare { transform-box: fill-box; transform-origin: center; animation: svgFlarePop 1.25s ease-out forwards; }
  `;

  const defsExtra = enableGlowingCursor
    ? `<radialGradient id="svg-cursor-grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${glow.core}" stop-opacity="0.34" />
        <stop offset="45%" stop-color="${glow.mid}" stop-opacity="0.16" />
        <stop offset="100%" stop-color="${glow.halo}" stop-opacity="0" />
      </radialGradient>`
    : '';

  const hitboxesMarkup = enableInteractionMode
    ? `<g id="layer-interactions" style="pointer-events:none"></g>
       <g id="layer-interaction-hitboxes">
         ${INTERACTIVE_OBJECT_IDS.map((id) => {
           const meta = INTERACTIVE_OBJECTS[id];
           const box = is768 ? meta.box768 : meta.box192;
           return `<g class="interactive-target" role="button" tabindex="0" aria-label="${meta.ariaLabel}" data-interactive-id="${id}"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="transparent" /></g>`;
         }).join('')}
       </g>`
    : '';

  const cursorMarkup = enableGlowingCursor
    ? `<g id="layer-cursor-glow" style="pointer-events:none;display:none">
         <circle id="svg-cursor-orb" cx="0" cy="0" r="${is768 ? 54 : 14}" fill="url(#svg-cursor-grad)" />
         <rect id="svg-cursor-spark" x="0" y="0" width="${is768 ? 2 : 1}" height="${is768 ? 2 : 1}" fill="${glow.core}" opacity="0.9" />
       </g>`
    : '';

  const itemsPayload = enableInteractionMode
    ? INTERACTIVE_OBJECT_IDS.map((id) => {
        const meta = INTERACTIVE_OBJECTS[id];
        const box = is768 ? meta.box768 : meta.box192;
        return {
          id,
          kind: meta.kind,
          primaryColor: meta.primaryColor,
          secondaryColor: meta.secondaryColor,
          smokeColor: meta.smokeColor,
          durationMs: meta.durationMs,
          ox: box.originX,
          oy: box.originY,
        };
      })
    : [];

  const cfgJson = JSON.stringify({
    is768,
    viewW,
    viewH,
    enableInteractionMode,
    enableGlowingCursor,
    glowBoost: glow.boostTarget,
    items: itemsPayload,
  }).replace(/</g, '\\u003c');

  const scriptMarkup = `<script type="application/ecmascript"><![CDATA[
    (function () {
      var CFG = ${cfgJson};
      var SVG_NS = "http://www.w3.org/2000/svg";
      var root = document.documentElement;
      if (!root) return;

      function parseHex(h) {
        return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
      }
      function blend2(a, b, t) {
        var k = Math.max(0, Math.min(1, t));
        var pa = parseHex(a), pb = parseHex(b);
        var c = function (n) { return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0"); };
        return ("#" + c(pa[0] + (pb[0]-pa[0])*k) + c(pa[1] + (pb[1]-pa[1])*k) + c(pa[2] + (pb[2]-pa[2])*k)).toUpperCase();
      }

      if (CFG.enableInteractionMode) {
        var fxLayer = root.querySelector("#layer-interactions");
        var byId = {};
        CFG.items.forEach(function (item) { byId[item.id] = item; });
        var trigger = function (id) {
          var item = byId[id];
          if (!item || !fxLayer) return;
          var g = document.createElementNS(SVG_NS, "g");
          var unit = CFG.is768 ? 4 : 1;
          if (item.kind === "smoke-puff") {
            [[-3,-2,7,2,item.smokeColor],[-4,-4,8,2,item.smokeColor],[-2,-6,4,2,item.secondaryColor]].forEach(function (p) {
              var r = document.createElementNS(SVG_NS, "rect");
              r.setAttribute("class", "svg-fx-rise");
              r.setAttribute("x", String(item.ox + p[0]*unit));
              r.setAttribute("y", String(item.oy + p[1]*unit));
              r.setAttribute("width", String(p[2]*unit));
              r.setAttribute("height", String(p[3]*unit));
              r.setAttribute("fill", String(p[4]));
              g.appendChild(r);
            });
          } else {
            var r = document.createElementNS(SVG_NS, "rect");
            r.setAttribute("class", "svg-fx-flare");
            r.setAttribute("x", String(item.ox - 3*unit));
            r.setAttribute("y", String(item.oy - 3*unit));
            r.setAttribute("width", String(6*unit));
            r.setAttribute("height", String(6*unit));
            r.setAttribute("fill", item.primaryColor);
            r.setAttribute("opacity", "0.6");
            g.appendChild(r);
          }
          fxLayer.appendChild(g);
          setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, item.durationMs);
        };
        root.querySelectorAll("[data-interactive-id]").forEach(function (el) {
          var id = el.getAttribute("data-interactive-id");
          el.addEventListener("click", function () { trigger(id); });
          el.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              trigger(id);
            }
          });
        });
      }

      if (CFG.enableGlowingCursor) {
        var glowLayer = root.querySelector("#layer-cursor-glow");
        var orb = root.querySelector("#svg-cursor-orb");
        var spark = root.querySelector("#svg-cursor-spark");
        var runeCenters = Array.prototype.map.call(root.querySelectorAll("#layer-runes > g"), function (rg) {
          var rs = Array.prototype.slice.call(rg.querySelectorAll("rect"));
          var sx = 0, sy = 0;
          rs.forEach(function (r) {
            sx += Number(r.getAttribute("x") || 0) + Number(r.getAttribute("width") || 1) / 2;
            sy += Number(r.getAttribute("y") || 0) + Number(r.getAttribute("height") || 1) / 2;
          });
          return { rects: rs, x: sx / (rs.length || 1), y: sy / (rs.length || 1) };
        });
        var motes = Array.prototype.slice.call(root.querySelectorAll("#layer-motes rect"));
        var updateGlow = function (cx, cy) {
          var rect = root.getBoundingClientRect();
          if (!rect || rect.width <= 0 || rect.height <= 0 || !glowLayer || !orb || !spark) return;
          var x = Math.max(0, Math.min(CFG.viewW, ((cx - rect.left) / rect.width) * CFG.viewW));
          var y = Math.max(0, Math.min(CFG.viewH, ((cy - rect.top) / rect.height) * CFG.viewH));
          orb.setAttribute("cx", String(x));
          orb.setAttribute("cy", String(y));
          spark.setAttribute("x", String(Math.round(x) - (CFG.is768 ? 1 : 0)));
          spark.setAttribute("y", String(Math.round(y) - (CFG.is768 ? 1 : 0)));
          glowLayer.style.display = "block";
          var rRad = CFG.is768 ? 72 : 18;
          var mRad = CFG.is768 ? 78 : 20;
          runeCenters.forEach(function (rc) {
            var d = Math.hypot(rc.x - x, rc.y - y);
            var p = d >= rRad ? 0 : Math.pow(1 - d / rRad, 2);
            var col = blend2("#FFD878", CFG.glowBoost, p * 0.9);
            rc.rects.forEach(function (r) { r.setAttribute("fill", col); });
          });
          motes.forEach(function (m) {
            var mx = Number(m.getAttribute("x") || 0);
            var my = Number(m.getAttribute("y") || 0);
            var base = m.getAttribute("data-mote-base") || "#FFF6D6";
            var d = Math.hypot(mx - x, my - y);
            var p = d >= mRad ? 0 : Math.pow(1 - d / mRad, 2);
            m.setAttribute("fill", p > 0 ? blend2(base, CFG.glowBoost, p * 0.92) : base);
          });
        };
        root.addEventListener("pointermove", function (e) { updateGlow(e.clientX, e.clientY); });
        root.addEventListener("pointerdown", function (e) { updateGlow(e.clientX, e.clientY); });
        root.addEventListener("pointerleave", function () {
          if (glowLayer) glowLayer.style.display = "none";
          runeCenters.forEach(function (rc) { rc.rects.forEach(function (r) { r.setAttribute("fill", "#FFD878"); }); });
          motes.forEach(function (m) {
            var base = m.getAttribute("data-mote-base");
            if (base) m.setAttribute("fill", base);
          });
        });
      }
    })();
  ]]></script>`;

  return {
    defsExtra,
    cssExtra,
    bodyExtra: `${hitboxesMarkup}${cursorMarkup}${scriptMarkup}`,
  };
}

export function buildStandaloneSvg(options: SvgExportOptions): string {
  const {
    gridPreset = '768x512',
    timeOfDay = 'day',
    atmosphere,
    weatherMode = 'auto',
    enabledLayers,
    speed,
    paused,
    responsive = true,
    enableInteractionMode = true,
    enableGlowingCursor = true,
  } = options;
  const playState = paused ? 'paused' : 'running';
  const weights = atmosphere ?? weightsForTimeOfDay(timeOfDay);
  const theme = resolveThemeForWeights(weights, atmosphere ? undefined : timeOfDay);
  const weather = resolveWeatherState(weatherMode, weights);

  if (gridPreset === '768x512') {
    return build768Svg(
      theme,
      weather,
      enabledLayers,
      speed,
      playState,
      responsive,
      enableInteractionMode,
      enableGlowingCursor,
    );
  }
  return build192Svg(
    theme,
    weather,
    enabledLayers,
    speed,
    playState,
    responsive,
    enableInteractionMode,
    enableGlowingCursor,
  );
}

function build192Svg(
  theme: ResolvedSceneTheme,
  weather: ResolvedWeatherState,
  enabledLayers: ReadonlySet<AnimationLayerId>,
  speed: number,
  playState: string,
  responsive: boolean,
  enableInteractionMode: boolean,
  enableGlowingCursor: boolean,
): string {
  const weights = theme.weights;
  const extra = buildInteractiveSvgTail(
    false,
    theme,
    enableInteractionMode,
    enableGlowingCursor,
  );
  const sizeAttrs = responsive
    ? `width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;display:block;"`
    : `width="${SCENE_WIDTH * 6}" height="${SCENE_HEIGHT * 6}"`;

  const css = `
    .pixel-svg { shape-rendering: crispEdges; }
    @keyframes cloudDriftSlow { 0% { transform: translateX(0px); } 100% { transform: translateX(192px); } }
    @keyframes cloudDriftMed { 0% { transform: translateX(0px); } 100% { transform: translateX(-192px); } }
    @keyframes birdGlide { 0% { transform: translate(0px,0px); opacity:0; } 12%,88% { opacity:0.9; } 50% { transform: translate(32px,-2px); opacity:0.9; } 100% { transform: translate(64px,1px); opacity:0; } }
    @keyframes steamRise { 0% { transform: translate(0px,0px); opacity:0; } 20% { opacity:0.78; } 65% { transform: translate(1px,-6px); opacity:0.55; } 100% { transform: translate(-1px,-11px); opacity:0; } }
    @keyframes potionSimmer { 0%,100% { opacity:0.45; transform:translateY(0px); } 50% { opacity:0.95; transform:translateY(-0.5px); } }
    @keyframes flameFlicker { 0%,100% { transform: translateY(0px) scaleY(1); opacity:0.95; } 25% { transform: translateY(-0.4px) scaleY(1.08); opacity:1; } 50% { transform: translateY(0.2px) scaleY(0.9); opacity:0.82; } 75% { transform: translateY(-0.3px) scaleY(1.05); opacity:0.98; } }
    @keyframes sconceHalo { 0%,100% { opacity:${(0.24 * theme.haloOpacityBoost).toFixed(2)}; } 35% { opacity:${Math.min(0.85, 0.46 * theme.haloOpacityBoost).toFixed(2)}; } 70% { opacity:${Math.min(0.7, 0.32 * theme.haloOpacityBoost).toFixed(2)}; } }
    @keyframes runePulse { 0%,100% { opacity:0.35; } 50% { opacity:0.92; } }
    @keyframes keySway { 0%,100% { transform: rotate(-2.5deg); } 50% { transform: rotate(2.5deg); } }
    @keyframes herbSway { 0%,100% { transform: translateX(0px); } 50% { transform: translateX(1px); } }
    @keyframes bubbleRise { 0% { transform: translateY(0px); opacity:0; } 25% { opacity:0.95; } 80% { transform: translateY(-3px); opacity:0.75; } 100% { transform: translateY(-4px); opacity:0; } }
    @keyframes moteFloat { 0% { transform: translate(0px,0px); opacity:0; } 20% { opacity:0.8; } 50% { transform: translate(3px,-4px); opacity:0.95; } 80% { opacity:0.65; } 100% { transform: translate(-1px,-8px); opacity:0; } }
    @keyframes starTwinkle { 0%,100% { opacity:0.28; } 50% { opacity:1; } }
    @keyframes rainFall192 { 0% { transform: translate(0px,-16px); opacity:0; } 10%,88% { opacity:1; } 100% { transform: translate(-8px,148px); opacity:0; } }
    @keyframes snowFall192 { 0% { transform: translate(0px,-12px); opacity:0; } 12% { opacity:1; } 35% { transform: translate(3px,44px); } 65% { transform: translate(-3px,92px); } 90% { opacity:0.9; } 100% { transform: translate(2px,146px); opacity:0; } }
    .anim-cloud-slow { animation: cloudDriftSlow ${(32 / speed).toFixed(2)}s linear infinite ${playState}; }
    .anim-cloud-med { animation: cloudDriftMed ${(22 / speed).toFixed(2)}s linear infinite ${playState}; }
    .anim-bird { animation: birdGlide ${(16 / speed).toFixed(2)}s linear infinite ${playState}; }
    .anim-steam { animation: steamRise ${(3.2 / speed).toFixed(2)}s steps(8, end) infinite ${playState}; }
    .anim-simmer { animation: potionSimmer ${(1.6 / speed).toFixed(2)}s steps(3, end) infinite ${playState}; }
    .anim-flame { transform-box: fill-box; transform-origin: bottom center; animation: flameFlicker ${(0.85 / speed).toFixed(2)}s steps(4, end) infinite ${playState}; }
    .anim-halo { animation: sconceHalo ${(2.1 / speed).toFixed(2)}s ease-in-out infinite ${playState}; }
    .anim-rune { animation: runePulse ${(3.4 / speed).toFixed(2)}s ease-in-out infinite ${playState}; }
    .anim-key { transform-box: fill-box; transform-origin: top center; animation: keySway ${(4.2 / speed).toFixed(2)}s ease-in-out infinite ${playState}; }
    .anim-herb { animation: herbSway ${(4.4 / speed).toFixed(2)}s steps(2, end) infinite ${playState}; }
    .anim-bubble { animation: bubbleRise ${(1.8 / speed).toFixed(2)}s steps(4, end) infinite ${playState}; }
    .anim-mote { animation: moteFloat ${(5.5 / speed).toFixed(2)}s ease-in-out infinite ${playState}; }
    .anim-star { animation: starTwinkle ${(3.2 / speed).toFixed(2)}s steps(3, end) infinite ${playState}; }
    .anim-rain { animation: rainFall192 ${(1.3 / speed).toFixed(2)}s linear infinite ${playState}; }
    .anim-snow { animation: snowFall192 ${(6.8 / speed).toFixed(2)}s linear infinite ${playState}; }
    ${extra.cssExtra}
  `;

  const skyBands = theme.skyBands192.map(
    (color, i) => `<rect x="0" y="${i * 8}" width="${SCENE_WIDTH}" height="8" fill="${color}" />`,
  ).join('');

  const starsMarkup = theme.showStars
    ? `<g id="layer-stars" opacity="${theme.starOpacity}">${STARS_192.map((s) => `<rect class="anim-star" style="animation-delay:${s.delay}" x="${s.x}" y="${s.y}" width="1" height="1" fill="${s.color}" />`).join('')}</g>`
    : '';

  const moonMarkup = theme.showMoon
    ? `<g id="layer-moon" opacity="${theme.moonOpacity}"><rect x="124" y="3" width="3" height="1" fill="#EAF3FF" /><rect x="123" y="4" width="2" height="2" fill="#DCEBFF" /><rect x="124" y="6" width="3" height="1" fill="#BFD8FA" /></g>`
    : '';

  const cloudsMarkup = enabledLayers.has('clouds')
    ? `<g id="layer-clouds" clip-path="url(#sky-bounds)">
        ${PIXEL_CLOUDS.map((cloud) => {
          const cls = cloud.speed === 'slow' ? 'anim-cloud-slow' : 'anim-cloud-med';
          const offset = cloud.speed === 'slow' ? -SCENE_WIDTH : SCENE_WIDTH;
          const rects = cloud.rects
            .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${mapCloudColor(r.fill, theme)}" />`)
            .join('');
          const dupRects = cloud.rects
            .map((r) => `<rect x="${r.x + offset}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${mapCloudColor(r.fill, theme)}" />`)
            .join('');
          return `<g class="${cls}" style="animation-delay:${cloud.delay}">${rects}${dupRects}</g>`;
        }).join('')}
        <g class="anim-bird"><rect x="86" y="8" width="1" height="1" fill="${theme.birdColor}" /><rect x="87" y="9" width="1" height="1" fill="${theme.birdColor}" /><rect x="88" y="8" width="1" height="1" fill="${theme.birdColor}" /></g>
        <g class="anim-bird" style="animation-delay:-8s"><rect x="108" y="6" width="1" height="1" fill="${theme.birdColor}" /><rect x="109" y="7" width="1" height="1" fill="${theme.birdColor}" /><rect x="110" y="6" width="1" height="1" fill="${theme.birdColor}" /></g>
      </g>`
    : '';

  const roomMarkup = ROOM_COLOR_LAYERS.map(
    (layer) => `<path d="${spansToSvgPath(layer.spans)}" data-base-hex="${layer.hex}" fill="${remapRoomColorWithWeights(layer.hex, weights)}" />`,
  ).join('');

  const herbsAndKeysMarkup = enabledLayers.has('herbsAndKeys')
    ? `<g id="layer-herbs-keys">
        <rect x="91" y="84" width="16" height="8" data-base-hex="#110F0A" fill="${remapRoomColorWithWeights('#110F0A', weights)}" opacity="0.88" />
        ${HERB_TUFTS.map((h) => `<rect class="anim-herb" style="animation-delay:${h.delay}" x="${h.x}" y="${h.y}" width="${h.w}" height="1" data-base-hex="${h.color}" fill="${remapRoomColorWithWeights(h.color, weights)}" />`).join('')}
        ${HANGING_KEYS.map((k) => `<g class="anim-key" style="animation-delay:${k.delay}"><rect x="${k.x}" y="${k.y}" width="1" height="1" fill="${k.glint}" /><rect x="${k.x}" y="${k.y + 1}" width="1" height="4" fill="${k.color}" /><rect x="${k.x + 1}" y="${k.y + 4}" width="1" height="1" fill="${k.glint}" /></g>`).join('')}
      </g>`
    : '';

  const lanternsMarkup = enabledLayers.has('lanterns')
    ? `<g id="layer-lanterns">
        ${SCONCE_SPRITES.map((s) => `<g class="anim-halo" style="animation-delay:${s.delay}">${s.halo.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}" />`).join('')}</g><g class="anim-flame" style="animation-delay:${s.delay}">${s.flame.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}" />`).join('')}</g>`).join('')}
        ${CANDLE_FLAMES.map((c) => `<g class="anim-flame" style="animation-delay:${c.delay}"><rect x="${c.x}" y="${c.y}" width="1" height="1" fill="#FFF4B8" /><rect x="${c.x}" y="${c.y + 1}" width="1" height="1" fill="#FFAA33" /></g>`).join('')}
      </g>`
    : '';

  const runesMarkup = enabledLayers.has('runes')
    ? `<g id="layer-runes">${CARVED_RUNES.map((rune) => `<g class="anim-rune" style="animation-delay:${rune.delay}">${rune.pixels.map((p) => `<rect x="${p.x}" y="${p.y}" width="${p.w ?? 1}" height="${p.h ?? 1}" fill="#FFD878" />`).join('')}</g>`).join('')}</g>`
    : '';

  const potionsMarkup = enabledLayers.has('potions')
    ? `<g id="layer-potions"><rect x="71" y="67" width="9" height="1" data-base-hex="#966338" fill="${remapRoomColorWithWeights('#966338', weights)}" /><rect x="71" y="70" width="9" height="1" data-base-hex="#72492C" fill="${remapRoomColorWithWeights('#72492C', weights)}" /><rect x="87" y="66" width="9" height="1" data-base-hex="#966338" fill="${remapRoomColorWithWeights('#966338', weights)}" /><rect x="87" y="70" width="9" height="1" data-base-hex="#72492C" fill="${remapRoomColorWithWeights('#72492C', weights)}" />${POTION_VIALS.map((v) => `<rect x="${v.x}" y="${v.y}" width="1" height="2" fill="${v.color}" /><rect class="anim-bubble" style="animation-delay:${v.delay}" x="${v.x}" y="${v.y}" width="1" height="1" fill="${v.highlight}" />`).join('')}</g>`
    : '';

  const cauldronsMarkup = `<g id="layer-cauldrons">${CAULDRON_SPRITES.map((c) => `<g>${c.body.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" data-base-hex="${r.fill}" fill="${remapRoomColorWithWeights(r.fill, weights)}" />`).join('')}${enabledLayers.has('cauldrons') ? `<g class="anim-simmer"><rect x="${c.x + 2}" y="${c.y + 1}" width="3" height="1" fill="${c.brewColor}" /><rect x="${c.x + 3}" y="${c.y + 1}" width="1" height="1" fill="${c.brewHighlight}" /></g>${c.steam.map((s) => `<rect class="anim-steam" style="animation-delay:${s.delay}" x="${s.x}" y="${s.y}" width="${s.w}" height="1" fill="${theme.steamColor}" />`).join('')}` : ''}</g>`).join('')}</g>`;

  const motesMarkup = enabledLayers.has('motes')
    ? `<g id="layer-motes">${DUST_MOTES.map((m, idx) => {
        const col = theme.motePalette[idx % theme.motePalette.length];
        return `<rect class="anim-mote" style="animation-delay:${m.delay}" x="${m.x}" y="${m.y}" width="1" height="1" data-mote-base="${col}" fill="${col}" />`;
      }).join('')}</g>`
    : '';

  const weatherMarkup =
    weather.kind !== 'none'
      ? `<g id="layer-weather" data-weather-kind="${weather.kind}" opacity="${weather.opacity}" style="pointer-events:none">${(weather.kind === 'rain' ? RAIN_PARTICLES_192 : SNOW_PARTICLES_192)
          .map(
            (p) =>
              `<rect class="${weather.kind === 'rain' ? 'anim-rain' : 'anim-snow'}" style="animation-duration:${(parseFloat(p.duration) / speed).toFixed(2)}s;animation-delay:${p.delay}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.color}" opacity="${p.opacity}" />`,
          )
          .join('')}</g>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}" ${sizeAttrs} class="pixel-svg" shape-rendering="crispEdges">
  <title>Alchemist's Study — Animated SVG Pixel Art (192x128 · ${theme.label})</title>
  <defs><clipPath id="sky-bounds"><rect x="0" y="0" width="${SCENE_WIDTH}" height="32" /></clipPath>${extra.defsExtra}<style>${css}</style></defs>
  <g id="layer-sky">${skyBands}${starsMarkup}${moonMarkup}</g>
  ${cloudsMarkup}
  <g id="layer-architecture">${roomMarkup}</g>
  ${herbsAndKeysMarkup}
  ${lanternsMarkup}
  ${runesMarkup}
  ${potionsMarkup}
  ${cauldronsMarkup}
  ${motesMarkup}
  ${weatherMarkup}
  ${extra.bodyExtra}
</svg>`;
}

function build768Svg(
  theme: ResolvedSceneTheme,
  weather: ResolvedWeatherState,
  enabledLayers: ReadonlySet<AnimationLayerId>,
  speed: number,
  playState: string,
  responsive: boolean,
  enableInteractionMode: boolean,
  enableGlowingCursor: boolean,
): string {
  const weights = theme.weights;
  const extra = buildInteractiveSvgTail(
    true,
    theme,
    enableInteractionMode,
    enableGlowingCursor,
  );
  const sizeAttrs = responsive
    ? `width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;display:block;"`
    : `width="${SCENE_768_WIDTH * 2}" height="${SCENE_768_HEIGHT * 2}"`;

  const css = `
    .pixel-svg { shape-rendering: crispEdges; }
    @keyframes cloudDriftSlow768 { 0% { transform: translateX(0px); } 100% { transform: translateX(768px); } }
    @keyframes cloudDriftMed768 { 0% { transform: translateX(0px); } 100% { transform: translateX(-768px); } }
    @keyframes birdGlide768 { 0% { transform: translate(0px,0px); opacity:0; } 12%,88% { opacity:0.9; } 50% { transform: translate(128px,-8px); opacity:0.9; } 100% { transform: translate(256px,4px); opacity:0; } }
    @keyframes steamRise768 { 0% { transform: translate(0px,0px); opacity:0; } 20% { opacity:0.78; } 65% { transform: translate(4px,-22px); opacity:0.55; } 100% { transform: translate(-4px,-40px); opacity:0; } }
    @keyframes potionSimmer768 { 0%,100% { opacity:0.45; transform:translateY(0px); } 50% { opacity:0.95; transform:translateY(-2px); } }
    @keyframes flameFlicker { 0%,100% { transform: translateY(0px) scaleY(1); opacity:0.95; } 25% { transform: translateY(-0.4px) scaleY(1.08); opacity:1; } 50% { transform: translateY(0.2px) scaleY(0.9); opacity:0.82; } 75% { transform: translateY(-0.3px) scaleY(1.05); opacity:0.98; } }
    @keyframes sconceHalo { 0%,100% { opacity:${(0.24 * theme.haloOpacityBoost).toFixed(2)}; } 35% { opacity:${Math.min(0.85, 0.46 * theme.haloOpacityBoost).toFixed(2)}; } 70% { opacity:${Math.min(0.7, 0.32 * theme.haloOpacityBoost).toFixed(2)}; } }
    @keyframes runePulse { 0%,100% { opacity:0.35; } 50% { opacity:0.92; } }
    @keyframes keySway { 0%,100% { transform: rotate(-2.5deg); } 50% { transform: rotate(2.5deg); } }
    @keyframes herbSway768 { 0%,100% { transform: translateX(0px); } 50% { transform: translateX(3px); } }
    @keyframes bubbleRise768 { 0% { transform: translateY(0px); opacity:0; } 25% { opacity:0.95; } 80% { transform: translateY(-8px); opacity:0.75; } 100% { transform: translateY(-12px); opacity:0; } }
    @keyframes moteFloat768 { 0% { transform: translate(0px,0px); opacity:0; } 20% { opacity:0.85; } 50% { transform: translate(12px,-16px); opacity:0.95; } 80% { opacity:0.65; } 100% { transform: translate(-4px,-32px); opacity:0; } }
    @keyframes starTwinkle { 0%,100% { opacity:0.28; } 50% { opacity:1; } }
    @keyframes rainFall768 { 0% { transform: translate(0px,-64px); opacity:0; } 10%,88% { opacity:1; } 100% { transform: translate(-32px,592px); opacity:0; } }
    @keyframes snowFall768 { 0% { transform: translate(0px,-48px); opacity:0; } 12% { opacity:1; } 35% { transform: translate(12px,176px); } 65% { transform: translate(-12px,368px); } 90% { opacity:0.9; } 100% { transform: translate(8px,584px); opacity:0; } }
    .anim-cloud-slow-768 { animation: cloudDriftSlow768 ${(32 / speed).toFixed(2)}s linear infinite ${playState}; }
    .anim-cloud-med-768 { animation: cloudDriftMed768 ${(22 / speed).toFixed(2)}s linear infinite ${playState}; }
    .anim-bird-768 { animation: birdGlide768 ${(16 / speed).toFixed(2)}s linear infinite ${playState}; }
    .anim-steam-768 { animation: steamRise768 ${(3.2 / speed).toFixed(2)}s steps(14, end) infinite ${playState}; }
    .anim-simmer-768 { animation: potionSimmer768 ${(1.6 / speed).toFixed(2)}s steps(4, end) infinite ${playState}; }
    .anim-flame { transform-box: fill-box; transform-origin: bottom center; animation: flameFlicker ${(0.85 / speed).toFixed(2)}s steps(4, end) infinite ${playState}; }
    .anim-halo { animation: sconceHalo ${(2.1 / speed).toFixed(2)}s ease-in-out infinite ${playState}; }
    .anim-rune { animation: runePulse ${(3.4 / speed).toFixed(2)}s ease-in-out infinite ${playState}; }
    .anim-key { transform-box: fill-box; transform-origin: top center; animation: keySway ${(4.2 / speed).toFixed(2)}s ease-in-out infinite ${playState}; }
    .anim-herb-768 { animation: herbSway768 ${(4.4 / speed).toFixed(2)}s steps(3, end) infinite ${playState}; }
    .anim-bubble-768 { animation: bubbleRise768 ${(1.8 / speed).toFixed(2)}s steps(6, end) infinite ${playState}; }
    .anim-mote-768 { animation: moteFloat768 ${(5.5 / speed).toFixed(2)}s ease-in-out infinite ${playState}; }
    .anim-star { animation: starTwinkle ${(3.2 / speed).toFixed(2)}s steps(3, end) infinite ${playState}; }
    .anim-rain-768 { animation: rainFall768 ${(1.3 / speed).toFixed(2)}s linear infinite ${playState}; }
    .anim-snow-768 { animation: snowFall768 ${(6.8 / speed).toFixed(2)}s linear infinite ${playState}; }
    ${extra.cssExtra}
  `;

  const skyBands = theme.skyBands768.map(
    (color, i) => `<rect x="0" y="${i * 16}" width="${SCENE_768_WIDTH}" height="16" fill="${color}" />`,
  ).join('');

  const starsMarkup = theme.showStars
    ? `<g id="layer-stars" opacity="${theme.starOpacity}">${STARS_768.map((s) => `<rect class="anim-star" style="animation-delay:${s.delay}" x="${s.x}" y="${s.y}" width="2" height="2" fill="${s.color}" />`).join('')}</g>`
    : '';

  const moonMarkup = theme.showMoon
    ? `<g id="layer-moon" opacity="${theme.moonOpacity}">
        <rect x="498" y="10" width="12" height="2" fill="#EAF3FF" />
        <rect x="494" y="12" width="10" height="3" fill="#EAF3FF" />
        <rect x="491" y="15" width="8" height="4" fill="#DCEBFF" />
        <rect x="490" y="19" width="7" height="7" fill="#DCEBFF" />
        <rect x="491" y="26" width="8" height="4" fill="#C4DCFA" />
        <rect x="494" y="30" width="10" height="3" fill="#B8D4F8" />
        <rect x="498" y="33" width="12" height="2" fill="#A9C8F2" />
      </g>`
    : '';

  const cloudsMarkup = enabledLayers.has('clouds')
    ? `<g id="layer-clouds" clip-path="url(#sky-bounds-768)">
        ${PIXEL_CLOUDS_768.map((cloud) => {
          const cls = cloud.speed === 'slow' ? 'anim-cloud-slow-768' : 'anim-cloud-med-768';
          const offset = cloud.speed === 'slow' ? -SCENE_768_WIDTH : SCENE_768_WIDTH;
          const rects = cloud.rects
            .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${mapCloudColor(r.fill, theme)}" />`)
            .join('');
          const dupRects = cloud.rects
            .map((r) => `<rect x="${r.x + offset}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${mapCloudColor(r.fill, theme)}" />`)
            .join('');
          return `<g class="${cls}" style="animation-delay:${cloud.delay}">${rects}${dupRects}</g>`;
        }).join('')}
        <g class="anim-bird-768"><rect x="344" y="32" width="2" height="2" fill="${theme.birdColor}" /><rect x="346" y="34" width="2" height="2" fill="${theme.birdColor}" /><rect x="348" y="32" width="2" height="2" fill="${theme.birdColor}" /></g>
        <g class="anim-bird-768" style="animation-delay:-7s"><rect x="430" y="24" width="2" height="2" fill="${theme.birdColor}" /><rect x="432" y="26" width="2" height="2" fill="${theme.birdColor}" /><rect x="434" y="24" width="2" height="2" fill="${theme.birdColor}" /></g>
      </g>`
    : '';

  const roomMarkup = ROOM_COLOR_LAYERS_768.map(
    (layer) => `<path d="${rectsB64ToSvgPath(layer.rectsB64)}" data-base-hex="${layer.hex}" fill="${remapRoomColorWithWeights(layer.hex, weights)}" />`,
  ).join('');

  const herbsAndKeysMarkup = enabledLayers.has('herbsAndKeys')
    ? `<g id="layer-herbs-keys">
        ${HERB_TUFTS_768.map((h) => `<rect class="anim-herb-768" style="animation-delay:${h.delay}" x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" data-base-hex="${h.color}" fill="${remapRoomColorWithWeights(h.color, weights)}" />`).join('')}
        ${HANGING_KEYS_768.map((k) => `<g class="anim-key" style="animation-delay:${k.delay}"><rect x="${k.x}" y="${k.y}" width="2" height="3" fill="${k.glint}" /><rect x="${k.x}" y="${k.y + 3}" width="2" height="14" fill="${k.color}" /><rect x="${k.x + 2}" y="${k.y + 15}" width="2" height="2" fill="${k.glint}" /></g>`).join('')}
      </g>`
    : '';

  const lanternsMarkup = enabledLayers.has('lanterns')
    ? `<g id="layer-lanterns">
        ${SCONCES_768.map((s) => `<g class="anim-halo" style="animation-delay:${s.delay}">${s.halo.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}" />`).join('')}</g><g class="anim-flame" style="animation-delay:${s.delay}">${s.flame.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}" />`).join('')}</g>`).join('')}
        ${CANDLE_FLAMES_768.map((c) => `<g class="anim-flame" style="animation-delay:${c.delay}"><rect x="${c.x}" y="${c.y}" width="2" height="2" fill="#FFF4B8" /><rect x="${c.x}" y="${c.y + 2}" width="2" height="3" fill="#FFAA33" /></g>`).join('')}
      </g>`
    : '';

  const runesMarkup = enabledLayers.has('runes')
    ? `<g id="layer-runes">${CARVED_RUNES_768.map((rune) => `<g class="anim-rune" style="animation-delay:${rune.delay}">${rune.pixels.map((p) => `<rect x="${p.x}" y="${p.y}" width="${p.w ?? 2}" height="${p.h ?? 2}" fill="#FFD878" />`).join('')}</g>`).join('')}</g>`
    : '';

  const potionsMarkup = enabledLayers.has('potions')
    ? `<g id="layer-potions">${POTION_VIALS_768.map((v) => `<rect x="${v.x}" y="${v.y}" width="2" height="6" fill="${v.color}" /><rect class="anim-bubble-768" style="animation-delay:${v.delay}" x="${v.x}" y="${v.y}" width="2" height="2" fill="${v.highlight}" />`).join('')}</g>`
    : '';

  const cauldronsMarkup = enabledLayers.has('cauldrons')
    ? `<g id="layer-cauldrons">${CAULDRONS_768.map((c) => `<g><g class="anim-simmer-768">${c.simmerRects.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}" />`).join('')}</g>${c.steamWisps.map((s) => `<rect class="anim-steam-768" style="animation-delay:${s.delay}" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${theme.steamColor}" />`).join('')}</g>`).join('')}</g>`
    : '';

  const motesMarkup = enabledLayers.has('motes')
    ? `<g id="layer-motes">${DUST_MOTES_768.map((m, idx) => {
        const col = theme.motePalette[idx % theme.motePalette.length];
        return `<rect class="anim-mote-768" style="animation-delay:${m.delay}" x="${m.x}" y="${m.y}" width="${m.size}" height="${m.size}" data-mote-base="${col}" fill="${col}" />`;
      }).join('')}</g>`
    : '';

  const weatherMarkup =
    weather.kind !== 'none'
      ? `<g id="layer-weather" data-weather-kind="${weather.kind}" opacity="${weather.opacity}" style="pointer-events:none">${(weather.kind === 'rain' ? RAIN_PARTICLES_768 : SNOW_PARTICLES_768)
          .map(
            (p) =>
              `<rect class="${weather.kind === 'rain' ? 'anim-rain-768' : 'anim-snow-768'}" style="animation-duration:${(parseFloat(p.duration) / speed).toFixed(2)}s;animation-delay:${p.delay}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.color}" opacity="${p.opacity}" />`,
          )
          .join('')}</g>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_768_WIDTH} ${SCENE_768_HEIGHT}" ${sizeAttrs} class="pixel-svg" shape-rendering="crispEdges">
  <title>Alchemist's Study — Animated SVG Pixel Art (768x512 · ${theme.label})</title>
  <defs><clipPath id="sky-bounds-768"><rect x="0" y="0" width="${SCENE_768_WIDTH}" height="128" /></clipPath>${extra.defsExtra}<style>${css}</style></defs>
  <g id="layer-sky">${skyBands}${starsMarkup}${moonMarkup}</g>
  ${cloudsMarkup}
  <g id="layer-architecture">${roomMarkup}</g>
  ${herbsAndKeysMarkup}
  ${lanternsMarkup}
  ${runesMarkup}
  ${potionsMarkup}
  ${cauldronsMarkup}
  ${motesMarkup}
  ${weatherMarkup}
  ${extra.bodyExtra}
</svg>`;
}
