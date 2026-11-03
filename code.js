"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __objRest = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };

  // src/shared/gridMapping.ts
  var DEFAULT_COLOR = "FF0000";
  var DEFAULT_OPACITY = 10;
  var DEFAULT_GRID_SIZE = 10;
  var DEFAULT_COUNT = 5;
  var DEFAULT_GUTTER = 20;
  var DEFAULT_SECTION_SIZE = 64;
  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }
  function round(n, decimals) {
    const f = 10 ** decimals;
    return Math.round(n * f) / f;
  }
  function normalizeHex(input) {
    const s = input.trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(s)) {
      return s.split("").map((c) => c + c).join("").toUpperCase();
    }
    if (/^[0-9a-f]{6}$/i.test(s)) return s.toUpperCase();
    return null;
  }
  function hexToRgb(hex) {
    var _a;
    const n = parseInt((_a = normalizeHex(hex)) != null ? _a : DEFAULT_COLOR, 16);
    return { r: (n >> 16 & 255) / 255, g: (n >> 8 & 255) / 255, b: (n & 255) / 255 };
  }
  function hexToRgba(hex, opacityPct) {
    return __spreadProps(__spreadValues({}, hexToRgb(hex)), { a: round(clamp(opacityPct, 0, 100) / 100, 4) });
  }
  function rgbaToHexOpacity(color) {
    var _a;
    const channel = (v) => clamp(Math.round(v * 255), 0, 255).toString(16).padStart(2, "0");
    return {
      hex: (channel(color.r) + channel(color.g) + channel(color.b)).toUpperCase(),
      opacity: round(clamp((_a = color.a) != null ? _a : 1, 0, 1) * 100, 2)
    };
  }
  function layerToLayoutGrid(def) {
    var _a, _b, _c, _d, _e;
    const color = hexToRgba(def.color, def.opacity);
    const pattern = def.pattern;
    if (pattern === "GRID") {
      const grid2 = {
        pattern: "GRID",
        sectionSize: (_a = def.size) != null ? _a : DEFAULT_GRID_SIZE,
        visible: def.visible,
        color
      };
      return grid2;
    }
    const alignment = (_b = def.alignment) != null ? _b : "STRETCH";
    const grid = __spreadValues(__spreadValues({
      pattern,
      alignment,
      gutterSize: (_c = def.gutter) != null ? _c : DEFAULT_GUTTER,
      count: def.count === "auto" ? Infinity : (_d = def.count) != null ? _d : DEFAULT_COUNT,
      visible: def.visible,
      color
    }, alignment !== "STRETCH" ? { sectionSize: typeof def.sectionSize === "number" ? def.sectionSize : DEFAULT_SECTION_SIZE } : {}), alignment !== "CENTER" ? { offset: (_e = def.margin) != null ? _e : 0 } : {});
    return grid;
  }
  function layoutGridToLayer(grid, id) {
    var _a, _b, _c;
    const { hex, opacity } = rgbaToHexOpacity((_a = grid.color) != null ? _a : hexToRgba(DEFAULT_COLOR, DEFAULT_OPACITY));
    const visible = grid.visible !== false;
    if (grid.pattern === "GRID") {
      return { id, pattern: "GRID", visible, color: hex, opacity, size: grid.sectionSize };
    }
    return {
      id,
      pattern: grid.pattern,
      visible,
      color: hex,
      opacity,
      count: Number.isFinite(grid.count) ? grid.count : "auto",
      alignment: grid.alignment,
      sectionSize: grid.alignment === "STRETCH" ? "auto" : (_b = grid.sectionSize) != null ? _b : DEFAULT_SECTION_SIZE,
      margin: (_c = grid.offset) != null ? _c : 0,
      gutter: grid.gutterSize
    };
  }
  function layersToLayoutGrids(defs) {
    return defs.map(layerToLayoutGrid);
  }
  function layoutGridsToLayers(grids, makeId) {
    return grids.map((g) => layoutGridToLayer(g, makeId()));
  }

  // src/shared/layout.ts
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function nextFrameIndex(existingNames, base) {
    const re = new RegExp(`^${escapeRegExp(base)} - (\\d+)$`);
    let max = 0;
    for (const name of existingNames) {
      const m = re.exec(name);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return max + 1;
  }
  function computeRowPlacement(existing, sizes, viewportCenter, gap = 100) {
    if (!sizes.length) return [];
    let x;
    let y;
    if (existing.length) {
      let rightmost = existing[0];
      for (const b of existing) if (b.x + b.width > rightmost.x + rightmost.width) rightmost = b;
      x = rightmost.x + rightmost.width + gap;
      y = rightmost.y;
    } else {
      const totalWidth = sizes.reduce((sum, s) => sum + s.width, 0) + gap * (sizes.length - 1);
      const maxHeight = Math.max(...sizes.map((s) => s.height));
      x = viewportCenter.x - totalWidth / 2;
      y = viewportCenter.y - maxHeight / 2;
    }
    const out = [];
    let cursor = Math.round(x);
    const top = Math.round(y);
    for (const s of sizes) {
      out.push({ x: cursor, y: top });
      cursor += Math.round(s.width) + gap;
    }
    return out;
  }

  // src/shared/presets.ts
  var PRESETS = [
    // Phone
    { id: "iphone-duo-closed", category: "Phone", name: "iPhone Duo Closed", width: 466, height: 678 },
    { id: "iphone-duo-open", category: "Phone", name: "iPhone Duo Open", width: 890, height: 626 },
    { id: "iphone-18-pro", category: "Phone", name: "iPhone 18 Pro", width: 402, height: 874 },
    { id: "iphone-18-pro-max", category: "Phone", name: "iPhone 18 Pro Max", width: 440, height: 956 },
    { id: "iphone-17", category: "Phone", name: "iPhone 17", width: 402, height: 874 },
    { id: "iphone-16-17-pro", category: "Phone", name: "iPhone 16 & 17 Pro", width: 402, height: 874 },
    { id: "iphone-16", category: "Phone", name: "iPhone 16", width: 393, height: 852 },
    { id: "iphone-16-17-pro-max", category: "Phone", name: "iPhone 16 & 17 Pro Max", width: 440, height: 956 },
    { id: "iphone-16-plus", category: "Phone", name: "iPhone 16 Plus", width: 430, height: 932 },
    { id: "iphone-air", category: "Phone", name: "iPhone Air", width: 420, height: 912 },
    { id: "iphone-14-15-pro-max", category: "Phone", name: "iPhone 14 & 15 Pro Max", width: 430, height: 932 },
    { id: "iphone-14-15-pro", category: "Phone", name: "iPhone 14 & 15 Pro", width: 393, height: 852 },
    { id: "iphone-13-14", category: "Phone", name: "iPhone 13 & 14", width: 390, height: 844 },
    { id: "iphone-14-plus", category: "Phone", name: "iPhone 14 Plus", width: 428, height: 926 },
    { id: "android-compact", category: "Phone", name: "Android Compact", width: 412, height: 917 },
    { id: "android-medium", category: "Phone", name: "Android Medium", width: 700, height: 840 },
    // Tablet
    { id: "ipad-mini-8-3", category: "Tablet", name: "iPad mini 8.3", width: 744, height: 1133 },
    { id: "surface-pro-8", category: "Tablet", name: "Surface Pro 8", width: 1440, height: 960 },
    { id: "ipad-pro-11", category: "Tablet", name: 'iPad Pro 11"', width: 834, height: 1194 },
    { id: "ipad-pro-12-9", category: "Tablet", name: 'iPad Pro 12.9"', width: 1024, height: 1366 },
    { id: "android-expanded", category: "Tablet", name: "Android Expanded", width: 1280, height: 800 },
    // Desktop
    { id: "macbook-air", category: "Desktop", name: "MacBook Air", width: 1280, height: 832 },
    { id: "macbook-pro-14", category: "Desktop", name: 'MacBook Pro 14"', width: 1512, height: 982 },
    { id: "macbook-pro-16", category: "Desktop", name: 'MacBook Pro 16"', width: 1728, height: 1117 },
    { id: "desktop", category: "Desktop", name: "Desktop", width: 1440, height: 1024 },
    { id: "wireframes", category: "Desktop", name: "Wireframes", width: 1440, height: 1024 },
    { id: "tv", category: "Desktop", name: "TV", width: 1280, height: 720 },
    // Watch
    { id: "watch-series-10-42mm", category: "Watch", name: "Series 10 42mm", width: 187, height: 223 },
    { id: "watch-series-10-46mm", category: "Watch", name: "Series 10 46mm", width: 208, height: 248 },
    { id: "watch-41mm", category: "Watch", name: "41mm", width: 176, height: 215 },
    { id: "watch-45mm", category: "Watch", name: "45mm", width: 198, height: 242 },
    { id: "watch-44mm", category: "Watch", name: "44mm", width: 184, height: 224 },
    { id: "watch-40mm", category: "Watch", name: "40mm", width: 162, height: 197 },
    // Presentation
    { id: "slide-16-9", category: "Presentation", name: "Slide 16:9", width: 1920, height: 1080 },
    { id: "slide-4-3", category: "Presentation", name: "Slide 4:3", width: 1024, height: 768 },
    // Social media
    { id: "twitter-post", category: "Social media", name: "Twitter post", width: 1200, height: 675 },
    { id: "twitter-header", category: "Social media", name: "Twitter header", width: 1500, height: 500 },
    { id: "facebook-post", category: "Social media", name: "Facebook post", width: 1200, height: 630 },
    { id: "facebook-cover", category: "Social media", name: "Facebook cover", width: 820, height: 312 },
    { id: "instagram-post", category: "Social media", name: "Instagram post", width: 1080, height: 1350 },
    { id: "instagram-story", category: "Social media", name: "Instagram story", width: 1080, height: 1920 },
    { id: "dribbble-shot", category: "Social media", name: "Dribbble shot", width: 400, height: 300 },
    { id: "dribbble-shot-hd", category: "Social media", name: "Dribbble shot HD", width: 800, height: 600 },
    { id: "linkedin-cover", category: "Social media", name: "LinkedIn cover", width: 1584, height: 396 },
    // Paper
    { id: "paper-a4", category: "Paper", name: "A4", width: 595, height: 842 },
    { id: "paper-a5", category: "Paper", name: "A5", width: 420, height: 595 },
    { id: "paper-a6", category: "Paper", name: "A6", width: 297, height: 420 },
    { id: "paper-letter", category: "Paper", name: "Letter", width: 612, height: 792 },
    { id: "paper-tabloid", category: "Paper", name: "Tabloid", width: 792, height: 1224 },
    // Figma Community
    { id: "community-plugin-icon", category: "Figma Community", name: "Plugin icon", width: 128, height: 128 },
    { id: "community-profile-banner", category: "Figma Community", name: "Profile banner", width: 1680, height: 240 },
    { id: "community-cover", category: "Figma Community", name: "Plugin/file cover", width: 1920, height: 1080 }
  ];
  var byId = new Map(PRESETS.map((p) => [p.id, p]));
  function getPreset(id) {
    return id ? byId.get(id) : void 0;
  }
  function findPresetBySize(width, height) {
    const w = Math.round(width);
    const h = Math.round(height);
    return PRESETS.find((p) => p.width === w && p.height === h);
  }

  // src/shared/util.ts
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function uid(prefix = "id") {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
  function errorMessage(err) {
    return err instanceof Error ? err.message : String(err);
  }
  function plural(n, one, many = `${one}s`) {
    return `${n} ${n === 1 ? one : many}`;
  }

  // src/shared/rulerLogic.ts
  var META_KEY = "foldRuler";
  var LAYER_KEY = "foldRulerLayer";
  var MAX_REPEATS = 200;
  var EPSILON = 0.01;
  function roundPx(n) {
    return Math.round(n * 100) / 100;
  }
  function formatPx(n) {
    return String(roundPx(n));
  }
  function computeFoldOffsets(foldY, frameHeight, repeat) {
    if (!Number.isFinite(foldY) || foldY <= 0) return [];
    const out = [roundPx(foldY)];
    if (repeat) {
      for (let k = 2; k <= MAX_REPEATS && k * foldY < frameHeight - EPSILON; k++) out.push(roundPx(k * foldY));
    }
    return out;
  }
  function stripPluginGuides(existing, pluginOffsets) {
    const remaining = pluginOffsets.slice();
    const out = [];
    for (const g of existing) {
      if (g.axis === "Y") {
        const i = remaining.findIndex((o) => Math.abs(o - g.offset) < EPSILON);
        if (i !== -1) {
          remaining.splice(i, 1);
          continue;
        }
      }
      out.push(g);
    }
    return out;
  }
  function parseFrameMeta(raw) {
    if (!raw) return null;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    if (!isRecord(data) || data.v !== 1) return null;
    if (typeof data.foldY !== "number" || !Number.isFinite(data.foldY) || data.foldY <= 0) return null;
    const meta = {
      v: 1,
      foldY: data.foldY,
      guideOffsets: Array.isArray(data.guideOffsets) ? data.guideOffsets.filter((o) => typeof o === "number" && Number.isFinite(o)) : []
    };
    if (typeof data.presetId === "string" && data.presetId) meta.presetId = data.presetId;
    if (typeof data.templateId === "string" && data.templateId) meta.templateId = data.templateId;
    return meta;
  }
  function serializeFrameMeta(meta) {
    return JSON.stringify(meta);
  }

  // src/shared/settings.ts
  function defaultSettings() {
    return {
      rulerEnabledByDefault: true,
      rulerMode: "guide",
      rulerColor: "FF4D4D",
      showLabel: true,
      repeatPerScreen: false,
      defaultTemplateByPreset: {},
      defaultTemplateByCategory: {}
    };
  }
  function stringRecord(raw) {
    const out = {};
    if (!isRecord(raw)) return out;
    for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && v) out[k] = v;
    return out;
  }
  function sanitizeSettings(raw) {
    const d = defaultSettings();
    if (!isRecord(raw)) return d;
    const bool = (key, fallback) => typeof raw[key] === "boolean" ? raw[key] : fallback;
    const settings2 = {
      rulerEnabledByDefault: bool("rulerEnabledByDefault", d.rulerEnabledByDefault),
      rulerMode: raw.rulerMode === "guide" || raw.rulerMode === "line" || raw.rulerMode === "both" ? raw.rulerMode : d.rulerMode,
      rulerColor: typeof raw.rulerColor === "string" && normalizeHex(raw.rulerColor) || d.rulerColor,
      showLabel: bool("showLabel", d.showLabel),
      repeatPerScreen: bool("repeatPerScreen", d.repeatPerScreen),
      defaultTemplateByPreset: stringRecord(raw.defaultTemplateByPreset),
      defaultTemplateByCategory: stringRecord(raw.defaultTemplateByCategory)
    };
    if (typeof raw.lastTemplateId === "string" && raw.lastTemplateId) settings2.lastTemplateId = raw.lastTemplateId;
    return settings2;
  }
  function resolveDefaultTemplateId(settings2, presetId, category, exists) {
    const byPreset = presetId ? settings2.defaultTemplateByPreset[presetId] : void 0;
    if (byPreset && exists(byPreset)) return byPreset;
    const byCategory = category ? settings2.defaultTemplateByCategory[category] : void 0;
    if (byCategory && exists(byCategory)) return byCategory;
    return void 0;
  }
  function withoutTemplateDefaults(settings2, templateId) {
    const strip = (map) => {
      const out = {};
      for (const [k, v] of Object.entries(map)) if (v !== templateId) out[k] = v;
      return out;
    };
    const byPreset = strip(settings2.defaultTemplateByPreset);
    const byCategory = strip(settings2.defaultTemplateByCategory);
    const changed = Object.keys(byPreset).length !== Object.keys(settings2.defaultTemplateByPreset).length || Object.keys(byCategory).length !== Object.keys(settings2.defaultTemplateByCategory).length || settings2.lastTemplateId === templateId;
    if (!changed) return null;
    const next = __spreadProps(__spreadValues({}, settings2), { defaultTemplateByPreset: byPreset, defaultTemplateByCategory: byCategory });
    if (next.lastTemplateId === templateId) delete next.lastTemplateId;
    return next;
  }

  // src/shared/templates.ts
  var TEMPLATE_SCHEMA = 1;
  var ok = (value) => ({ ok: true, value });
  var fail = (error) => ({ ok: false, error });
  function defaultLayer(pattern, id = uid("l")) {
    if (pattern === "GRID") {
      return { id, pattern, visible: true, color: DEFAULT_COLOR, opacity: DEFAULT_OPACITY, size: DEFAULT_GRID_SIZE };
    }
    return {
      id,
      pattern,
      visible: true,
      color: DEFAULT_COLOR,
      opacity: DEFAULT_OPACITY,
      count: DEFAULT_COUNT,
      alignment: "STRETCH",
      sectionSize: "auto",
      margin: 0,
      gutter: DEFAULT_GUTTER
    };
  }
  var isNum = (v) => typeof v === "number" && Number.isFinite(v);
  function validateLayer(l) {
    var _a;
    const e = {};
    if (!normalizeHex(l.color)) e.color = "Use a 6-digit hex like FF0000";
    if (!isNum(l.opacity) || l.opacity < 0 || l.opacity > 100) e.opacity = "0\u2013100";
    if (l.pattern === "GRID") {
      if (!isNum(l.size) || l.size < 1) e.size = "Size must be \u2265 1";
      return e;
    }
    const alignment = (_a = l.alignment) != null ? _a : "STRETCH";
    if (!["STRETCH", "MIN", "CENTER", "MAX"].includes(alignment)) e.alignment = "Unknown type";
    if (l.count !== "auto" && (!isNum(l.count) || !Number.isInteger(l.count) || l.count < 1)) {
      e.count = "Count must be a whole number \u2265 1";
    } else if (l.count === "auto" && alignment === "STRETCH") {
      e.count = "Auto count needs a fixed type (not Stretch)";
    }
    if (alignment !== "STRETCH" && (!isNum(l.sectionSize) || l.sectionSize < 1)) {
      e.sectionSize = `${l.pattern === "ROWS" ? "Height" : "Width"} must be \u2265 1`;
    }
    if (alignment !== "CENTER" && l.margin !== void 0 && (!isNum(l.margin) || l.margin < 0)) e.margin = "Must be \u2265 0";
    if (l.gutter !== void 0 && (!isNum(l.gutter) || l.gutter < 0)) e.gutter = "Gutter must be \u2265 0";
    return e;
  }
  function readNum(raw, key) {
    if (raw[key] === void 0) return void 0;
    return isNum(raw[key]) ? raw[key] : null;
  }
  function checkLayer(raw) {
    if (!isRecord(raw)) return fail("layer is not an object");
    const pattern = raw.pattern;
    if (pattern !== "GRID" && pattern !== "COLUMNS" && pattern !== "ROWS") {
      return fail(`unknown layer type "${String(pattern)}"`);
    }
    const layer = defaultLayer(pattern, typeof raw.id === "string" && raw.id ? raw.id : uid("l"));
    if (raw.visible !== void 0) {
      if (typeof raw.visible !== "boolean") return fail("visible must be true or false");
      layer.visible = raw.visible;
    }
    if (raw.color !== void 0) {
      const color = typeof raw.color === "string" ? normalizeHex(raw.color) : null;
      if (!color) return fail("color must be a 6-digit hex");
      layer.color = color;
    }
    const numFields = pattern === "GRID" ? ["opacity", "size"] : ["opacity", "margin", "gutter"];
    for (const key of numFields) {
      const v = readNum(raw, key);
      if (v === null) return fail(`${key} must be a number`);
      if (v !== void 0) layer[key] = v;
    }
    if (pattern !== "GRID") {
      if (raw.count === "auto" || raw.count === null) layer.count = "auto";
      else if (raw.count !== void 0) {
        if (!isNum(raw.count)) return fail('count must be a number or "auto"');
        layer.count = raw.count;
      }
      if (raw.alignment !== void 0) {
        if (!["STRETCH", "MIN", "CENTER", "MAX"].includes(raw.alignment)) {
          return fail(`unknown alignment "${String(raw.alignment)}"`);
        }
        layer.alignment = raw.alignment;
      }
      if (raw.sectionSize === "auto" || raw.sectionSize === null) layer.sectionSize = "auto";
      else if (raw.sectionSize !== void 0) {
        if (!isNum(raw.sectionSize)) return fail('sectionSize must be a number or "auto"');
        layer.sectionSize = raw.sectionSize;
      }
      if (layer.alignment !== "STRETCH" && layer.sectionSize === "auto") layer.sectionSize = DEFAULT_SECTION_SIZE;
    }
    const errors = validateLayer(layer);
    const first = Object.values(errors)[0];
    return first ? fail(first) : ok(layer);
  }
  function starterTemplates(now = Date.now()) {
    const columns = (id, count, margin, gutter) => ({
      id,
      pattern: "COLUMNS",
      visible: true,
      color: DEFAULT_COLOR,
      opacity: DEFAULT_OPACITY,
      count,
      alignment: "STRETCH",
      sectionSize: "auto",
      margin,
      gutter
    });
    const base = { builtIn: true, createdAt: now, updatedAt: now, scope: "library" };
    return [
      __spreadProps(__spreadValues({}, base), {
        id: "starter-desktop-12",
        name: "Desktop 12-col",
        description: "12 stretch columns, 80 margin, 24 gutter",
        layers: [columns("starter-desktop-12-cols", 12, 80, 24)],
        suggestedFor: ["Desktop"]
      }),
      __spreadProps(__spreadValues({}, base), {
        id: "starter-tablet-8",
        name: "Tablet 8-col",
        description: "8 stretch columns, 32 margin, 24 gutter",
        layers: [columns("starter-tablet-8-cols", 8, 32, 24)],
        suggestedFor: ["Tablet"]
      }),
      __spreadProps(__spreadValues({}, base), {
        id: "starter-mobile-4",
        name: "Mobile 4-col",
        description: "4 stretch columns, 16 margin, 16 gutter",
        layers: [columns("starter-mobile-4-cols", 4, 16, 16)],
        suggestedFor: ["Phone"]
      }),
      __spreadProps(__spreadValues({}, base), {
        id: "starter-grid-8",
        name: "8px Grid",
        description: "8px square grid",
        layers: [__spreadProps(__spreadValues({}, defaultLayer("GRID", "starter-grid-8-grid")), { size: 8 })]
      })
    ];
  }
  function checkTemplate(raw) {
    if (!isRecord(raw)) return fail("template is not an object");
    if (typeof raw.name !== "string" || !raw.name.trim()) return fail("template has no name");
    const name = raw.name.slice(0, 120);
    if (!Array.isArray(raw.layers)) return fail(`"${name}": layers must be a list`);
    const layers = [];
    const layerIds = /* @__PURE__ */ new Set();
    for (let i = 0; i < raw.layers.length; i++) {
      const res = checkLayer(raw.layers[i]);
      if (!res.ok) return fail(`"${name}", layer ${i + 1}: ${res.error}`);
      const layer = res.value;
      if (layerIds.has(layer.id)) layer.id = uid("l");
      layerIds.add(layer.id);
      layers.push(layer);
    }
    const now = Date.now();
    const template = {
      id: typeof raw.id === "string" && raw.id ? raw.id : uid("t"),
      name,
      layers,
      builtIn: raw.builtIn === true,
      createdAt: isNum(raw.createdAt) ? raw.createdAt : now,
      updatedAt: isNum(raw.updatedAt) ? raw.updatedAt : now,
      scope: raw.scope === "file" ? "file" : "library"
    };
    if (typeof raw.description === "string" && raw.description) template.description = raw.description.slice(0, 500);
    if (Array.isArray(raw.suggestedFor)) {
      const keys = raw.suggestedFor.filter((k) => typeof k === "string" && k.length > 0);
      if (keys.length) template.suggestedFor = Array.from(new Set(keys));
    }
    return ok(template);
  }
  function parseImport(json, existingIds) {
    let data;
    try {
      data = JSON.parse(json);
    } catch (e) {
      return fail("This isn't valid JSON.");
    }
    let list;
    if (Array.isArray(data)) {
      list = data;
    } else if (isRecord(data)) {
      if (data.schema !== TEMPLATE_SCHEMA) {
        return fail(
          data.schema === void 0 ? 'Missing "schema" field \u2014 is this a Fold Ruler template export?' : `Unsupported schema version ${JSON.stringify(data.schema)} (expected ${TEMPLATE_SCHEMA}).`
        );
      }
      if (!Array.isArray(data.templates)) return fail('"templates" must be a list.');
      list = data.templates;
    } else {
      return fail('Expected an object like { "schema": 1, "templates": [...] }.');
    }
    const taken = new Set(existingIds);
    const templates2 = [];
    const errors = [];
    list.forEach((raw, i) => {
      const res = checkTemplate(raw);
      if (!res.ok) {
        errors.push(`#${i + 1}: ${res.error}`);
        return;
      }
      const t = res.value;
      t.name = t.name.trim();
      t.builtIn = false;
      t.scope = "library";
      if (taken.has(t.id)) t.id = uid("t");
      taken.add(t.id);
      templates2.push(t);
    });
    return ok({ templates: templates2, rejected: errors.length, errors });
  }

  // src/code.ts
  var STORAGE_TEMPLATES = "templates";
  var STORAGE_SETTINGS = "settings";
  var FILE_TEMPLATES_KEY = "templates";
  var FRAME_GAP = 100;
  var BATCH_SIZE = 40;
  var LABEL_FONT = { family: "Inter", style: "Regular" };
  var templates = [];
  var settings = defaultSettings();
  var uiOpen = false;
  function post(msg) {
    if (uiOpen) figma.ui.postMessage(msg);
  }
  function notify(result) {
    figma.notify(result.message, result.error ? { error: true } : void 0);
  }
  function stripScope(_a) {
    var _b = _a, { scope: _scope } = _b, t = __objRest(_b, ["scope"]);
    return t;
  }
  async function loadState() {
    const warnings = [];
    let rawSettings;
    try {
      rawSettings = await figma.clientStorage.getAsync(STORAGE_SETTINGS);
    } catch (e) {
      warnings.push("Couldn't read saved settings; using defaults.");
    }
    settings = sanitizeSettings(rawSettings);
    let rawLibrary;
    let readFailed = false;
    try {
      rawLibrary = await figma.clientStorage.getAsync(STORAGE_TEMPLATES);
    } catch (e) {
      readFailed = true;
    }
    let library = [];
    if (rawLibrary === void 0 && !readFailed) {
      library = starterTemplates();
      await figma.clientStorage.setAsync(STORAGE_TEMPLATES, library.map(stripScope));
    } else if (Array.isArray(rawLibrary)) {
      let dropped = 0;
      for (const raw of rawLibrary) {
        const res = checkTemplate(raw);
        if (res.ok) library.push(__spreadProps(__spreadValues({}, res.value), { scope: "library" }));
        else dropped++;
      }
      if (dropped) warnings.push(`${plural(dropped, "saved template")} couldn't be read and ${dropped === 1 ? "was" : "were"} skipped.`);
    } else {
      library = starterTemplates();
      warnings.push("Saved templates were unreadable, so the starter templates were restored.");
    }
    const fileTemplates = [];
    const rawFile = figma.root.getPluginData(FILE_TEMPLATES_KEY);
    if (rawFile) {
      try {
        const parsed = JSON.parse(rawFile);
        if (!Array.isArray(parsed)) throw new Error("not a list");
        for (const raw of parsed) {
          const res = checkTemplate(raw);
          if (res.ok) fileTemplates.push(__spreadProps(__spreadValues({}, res.value), { scope: "file" }));
        }
      } catch (e) {
        warnings.push("Templates shared in this file were unreadable and were skipped.");
      }
    }
    const seen = /* @__PURE__ */ new Set();
    templates = [...library, ...fileTemplates].filter((t) => seen.has(t.id) ? false : (seen.add(t.id), true));
    return warnings;
  }
  async function persistTemplates() {
    await figma.clientStorage.setAsync(
      STORAGE_TEMPLATES,
      templates.filter((t) => t.scope !== "file").map(stripScope)
    );
    const fileList = templates.filter((t) => t.scope === "file").map(stripScope);
    const next = fileList.length ? JSON.stringify(fileList) : "";
    if (figma.root.getPluginData(FILE_TEMPLATES_KEY) !== next) {
      try {
        figma.root.setPluginData(FILE_TEMPLATES_KEY, next);
      } catch (err) {
        notify({ message: `Couldn't save templates to this file: ${errorMessage(err)}`, error: true });
      }
    }
  }
  async function persistSettings() {
    await figma.clientStorage.setAsync(STORAGE_SETTINGS, settings);
  }
  function findTemplate(id) {
    return id ? templates.find((t) => t.id === id) : void 0;
  }
  function defaultTemplateFor(presetId) {
    const preset = getPreset(presetId);
    const id = resolveDefaultTemplateId(settings, presetId, preset == null ? void 0 : preset.category, (tid) => !!findTemplate(tid));
    return findTemplate(id);
  }
  function isRulerTarget(node) {
    return node.type === "FRAME" || node.type === "COMPONENT";
  }
  function isInsideInstance(node) {
    for (let p = node.parent; p; p = p.parent) if (p.type === "INSTANCE") return true;
    return false;
  }
  function collectTargets() {
    const targets = [];
    let skipped = 0;
    for (const node of figma.currentPage.selection) {
      if (isRulerTarget(node) && !node.locked && !isInsideInstance(node)) targets.push(node);
      else skipped++;
    }
    return { targets, skipped };
  }
  function readMeta(node) {
    return parseFrameMeta(node.getPluginData(META_KEY));
  }
  function writeMeta(node, meta) {
    node.setPluginData(META_KEY, serializeFrameMeta(meta));
  }
  function hasRulerLayers(frame) {
    return frame.children.some((c) => c.getPluginData(LAYER_KEY) !== "");
  }
  function removeRulerLayers(frame) {
    let removed = 0;
    for (const child of frame.children.slice()) {
      if (child.getPluginData(LAYER_KEY) !== "") {
        child.remove();
        removed++;
      }
    }
    return removed;
  }
  var labelFontPromise = null;
  function ensureLabelFont() {
    if (!labelFontPromise) labelFontPromise = figma.loadFontAsync(LABEL_FONT).then(() => true, () => false);
    return labelFontPromise;
  }
  async function yieldToFigma() {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  async function runBatched(items, label, fn) {
    const showProgress = items.length > BATCH_SIZE;
    for (let i = 0; i < items.length; i++) {
      fn(items[i]);
      if (showProgress && (i + 1) % BATCH_SIZE === 0 && i + 1 < items.length) {
        post({ type: "progress", label, done: i + 1, total: items.length });
        await yieldToFigma();
      }
    }
    if (showProgress) post({ type: "progress-end" });
  }
  function rulerOptions(labelFontReady) {
    return {
      mode: settings.rulerMode,
      color: settings.rulerColor,
      label: settings.showLabel && labelFontReady,
      repeat: settings.repeatPerScreen
    };
  }
  function makeAbsoluteIfNeeded(frame, node) {
    if (frame.layoutMode !== "NONE") node.layoutPositioning = "ABSOLUTE";
  }
  function tagLayer(node, offset) {
    node.setPluginData(LAYER_KEY, JSON.stringify({ offset }));
  }
  function createRulerLayers(frame, offset, opts) {
    const rgb = hexToRgb(opts.color);
    const line = figma.createLine();
    frame.appendChild(line);
    makeAbsoluteIfNeeded(frame, line);
    line.name = `Fold \xB7 ${formatPx(offset)}px`;
    line.resize(Math.max(frame.width, 0.01), 0);
    line.x = 0;
    line.y = offset;
    line.strokes = [{ type: "SOLID", color: rgb }];
    line.strokeWeight = 1;
    line.dashPattern = [6, 4];
    line.constraints = { horizontal: "STRETCH", vertical: "MIN" };
    line.locked = true;
    tagLayer(line, offset);
    if (!opts.label) return;
    const text = figma.createText();
    frame.appendChild(text);
    makeAbsoluteIfNeeded(frame, text);
    text.fontName = LABEL_FONT;
    text.fontSize = 10;
    text.characters = `Fold \xB7 ${formatPx(offset)}px`;
    text.name = `Fold label \xB7 ${formatPx(offset)}px`;
    text.fills = [{ type: "SOLID", color: rgb }];
    text.x = 4;
    text.y = Math.max(0, offset - text.height - 2);
    text.constraints = { horizontal: "MIN", vertical: "MIN" };
    text.locked = true;
    tagLayer(text, offset);
  }
  function applyRuler(frame, foldY, opts) {
    var _a, _b, _c;
    const prev = readMeta(frame);
    const offsets = computeFoldOffsets(foldY, frame.height, opts.repeat);
    removeRulerLayers(frame);
    const userGuides = stripPluginGuides(frame.guides, (_a = prev == null ? void 0 : prev.guideOffsets) != null ? _a : []);
    let guideOffsets = [];
    let wantLines = opts.mode !== "guide";
    let fellBack = false;
    if (opts.mode !== "line") {
      try {
        frame.guides = [...userGuides, ...offsets.map((offset) => ({ axis: "Y", offset }))];
        guideOffsets = offsets;
      } catch (e) {
        fellBack = true;
        wantLines = true;
      }
    } else if (prev == null ? void 0 : prev.guideOffsets.length) {
      try {
        frame.guides = userGuides;
      } catch (e) {
      }
    }
    if (wantLines) for (const offset of offsets) createRulerLayers(frame, offset, opts);
    writeMeta(frame, {
      v: 1,
      presetId: (_b = opts.presetId) != null ? _b : prev == null ? void 0 : prev.presetId,
      foldY,
      guideOffsets,
      templateId: (_c = opts.templateId) != null ? _c : prev == null ? void 0 : prev.templateId
    });
    return { fellBack };
  }
  function removeRuler(frame) {
    const meta = readMeta(frame);
    let changed = removeRulerLayers(frame) > 0;
    if (meta && meta.guideOffsets.length) {
      try {
        frame.guides = stripPluginGuides(frame.guides, meta.guideOffsets);
      } catch (e) {
      }
      writeMeta(frame, __spreadProps(__spreadValues({}, meta), { guideOffsets: [] }));
      changed = true;
    }
    return changed;
  }
  function fallbackNote(count) {
    return count ? ` \xB7 ${plural(count, "frame")} can't hold guides, used a line layer instead` : "";
  }
  function skippedNote(count) {
    return count ? ` \xB7 skipped ${count} (locked or not a frame)` : "";
  }
  var NOTHING_SELECTED = { message: "Select one or more frames first.", error: true };
  var NO_FRAMES = { message: "No editable frames in the selection (locked or not a frame).", error: true };
  async function addRulerToSelection(customFold) {
    if (!figma.currentPage.selection.length) return NOTHING_SELECTED;
    const { targets, skipped } = collectTargets();
    if (!targets.length) return NO_FRAMES;
    const opts = rulerOptions(settings.showLabel ? await ensureLabelFont() : false);
    let fellBack = 0;
    let failed = 0;
    await runBatched(targets, "Adding fold rulers", (frame) => {
      var _a, _b;
      const foldY = customFold && customFold > 0 ? customFold : (_b = (_a = readMeta(frame)) == null ? void 0 : _a.foldY) != null ? _b : frame.height;
      try {
        if (applyRuler(frame, foldY, opts).fellBack) fellBack++;
      } catch (e) {
        failed++;
      }
    });
    figma.commitUndo();
    const done = targets.length - failed;
    return {
      message: `Fold ruler set on ${plural(done, "frame")}${fallbackNote(fellBack)}${skippedNote(skipped + failed)}`,
      error: done === 0
    };
  }
  async function removeRulersFromSelection() {
    if (!figma.currentPage.selection.length) return NOTHING_SELECTED;
    const { targets, skipped } = collectTargets();
    if (!targets.length) return NO_FRAMES;
    let changed = 0;
    await runBatched(targets, "Removing rulers", (frame) => {
      if (removeRuler(frame)) changed++;
    });
    figma.commitUndo();
    return {
      message: changed ? `Removed plugin rulers from ${plural(changed, "frame")}${skippedNote(skipped)}` : "No plugin rulers found in the selection."
    };
  }
  async function removeVisualRulers() {
    const selection = figma.currentPage.selection;
    let removed = 0;
    if (selection.length) {
      const { targets } = collectTargets();
      await runBatched(targets, "Removing visual rulers", (frame) => {
        removed += removeRulerLayers(frame);
      });
    } else {
      const nodes = figma.currentPage.findAllWithCriteria({ pluginData: { keys: [LAYER_KEY] } });
      await runBatched(nodes, "Removing visual rulers", (node) => {
        if (!node.removed) {
          node.remove();
          removed++;
        }
      });
    }
    figma.commitUndo();
    const scope = selection.length ? "the selection" : "this page";
    return { message: removed ? `Removed ${plural(removed, "visual ruler layer")} from ${scope}` : `No visual rulers on ${scope}.` };
  }
  function setGrids(frame, template, mode) {
    const grids = layersToLayoutGrids(template.layers);
    frame.layoutGrids = mode === "append" ? [...frame.layoutGrids, ...grids] : grids;
  }
  async function applyTemplateToSelection(templateId, mode) {
    const template = findTemplate(templateId);
    if (!template) return { message: "That template no longer exists.", error: true };
    if (!figma.currentPage.selection.length) return NOTHING_SELECTED;
    const { targets, skipped } = collectTargets();
    if (!targets.length) return NO_FRAMES;
    let failed = 0;
    await runBatched(targets, "Applying template", (frame) => {
      try {
        setGrids(frame, template, mode);
        const meta = readMeta(frame);
        if (meta) writeMeta(frame, __spreadProps(__spreadValues({}, meta), { templateId: template.id }));
      } catch (e) {
        failed++;
      }
    });
    figma.commitUndo();
    const done = targets.length - failed;
    return {
      message: `${mode === "append" ? "Appended" : "Applied"} "${template.name}" to ${plural(done, "frame")}${skippedNote(skipped + failed)}`,
      error: done === 0
    };
  }
  async function applyDefaultTemplateToSelection() {
    if (!figma.currentPage.selection.length) return NOTHING_SELECTED;
    const { targets, skipped } = collectTargets();
    if (!targets.length) return NO_FRAMES;
    let applied = 0;
    let noDefault = 0;
    await runBatched(targets, "Applying default templates", (frame) => {
      var _a, _b, _c;
      const meta = readMeta(frame);
      const presetId = (_c = meta == null ? void 0 : meta.presetId) != null ? _c : (_b = findPresetBySize(frame.width, (_a = meta == null ? void 0 : meta.foldY) != null ? _a : frame.height)) == null ? void 0 : _b.id;
      const template = defaultTemplateFor(presetId);
      if (!template) {
        noDefault++;
        return;
      }
      try {
        setGrids(frame, template, "replace");
        if (meta) writeMeta(frame, __spreadProps(__spreadValues({}, meta), { templateId: template.id }));
        applied++;
      } catch (e) {
        noDefault++;
      }
    });
    figma.commitUndo();
    if (!applied) {
      return {
        message: "No default template matches the selected frames. Set defaults in Settings \u2192 Default templates.",
        error: true
      };
    }
    const extra = noDefault ? ` \xB7 ${noDefault} without a matching default` : "";
    return { message: `Applied default templates to ${plural(applied, "frame")}${extra}${skippedNote(skipped)}` };
  }
  async function saveTemplateFromSelection(name) {
    const frame = figma.currentPage.selection.find(isRulerTarget);
    if (!frame) return { message: "Select a frame that has layout grids.", error: true };
    if (!frame.layoutGrids.length) return { message: `"${frame.name}" has no layout grids to save.`, error: true };
    const meta = readMeta(frame);
    const now = Date.now();
    const template = {
      id: uid("t"),
      name: (name == null ? void 0 : name.trim()) || `${frame.name} grids`,
      layers: layoutGridsToLayers(frame.layoutGrids, () => uid("l")),
      createdAt: now,
      updatedAt: now,
      scope: "library"
    };
    if (meta == null ? void 0 : meta.presetId) template.suggestedFor = [meta.presetId];
    templates.push(template);
    await persistTemplates();
    post({ type: "templates", templates });
    post({ type: "template-selected", id: template.id });
    return { message: `Saved "${template.name}" with ${plural(template.layers.length, "layer")}` };
  }
  function topLevelBoxes() {
    const boxes = [];
    for (const node of figma.currentPage.children) {
      if ("x" in node && "width" in node) boxes.push({ x: node.x, y: node.y, width: node.width, height: node.height });
    }
    return boxes;
  }
  function pickTemplate(choice, presetId) {
    if (choice === "none") return void 0;
    if (choice === "auto") return defaultTemplateFor(presetId);
    return findTemplate(choice);
  }
  async function createFrames(items, addRuler, choice) {
    const valid = items.filter((i) => i.width > 0 && i.height > 0);
    if (!valid.length) return { message: "Pick at least one preset or a custom size.", error: true };
    const page = figma.currentPage;
    const placements = computeRowPlacement(topLevelBoxes(), valid, figma.viewport.center, FRAME_GAP);
    const existingNames = page.children.map((n) => n.name);
    const counters = /* @__PURE__ */ new Map();
    const opts = rulerOptions(addRuler && settings.showLabel ? await ensureLabelFont() : false);
    const created = [];
    let fellBack = 0;
    let gridFailures = 0;
    await runBatched(valid, "Creating frames", (item) => {
      var _a;
      const index = created.length;
      const base = item.name.trim() || "Frame";
      const n = (_a = counters.get(base)) != null ? _a : nextFrameIndex(existingNames, base);
      counters.set(base, n + 1);
      const frame = figma.createFrame();
      frame.name = `${base} - ${n}`;
      frame.resize(item.width, item.height);
      frame.x = placements[index].x;
      frame.y = placements[index].y;
      const template = pickTemplate(choice, item.presetId);
      if (template) {
        try {
          setGrids(frame, template, "replace");
        } catch (e) {
          gridFailures++;
        }
      }
      const foldY = item.foldY > 0 ? item.foldY : item.height;
      if (addRuler) {
        if (applyRuler(frame, foldY, __spreadProps(__spreadValues({}, opts), { presetId: item.presetId, templateId: template == null ? void 0 : template.id })).fellBack) fellBack++;
      } else {
        writeMeta(frame, { v: 1, presetId: item.presetId, foldY, guideOffsets: [], templateId: template == null ? void 0 : template.id });
      }
      created.push(frame);
    });
    page.selection = created;
    figma.viewport.scrollAndZoomIntoView(created);
    figma.commitUndo();
    const gridNote = gridFailures ? ` \xB7 grids failed on ${gridFailures}` : "";
    return {
      message: `Created ${plural(created.length, "frame")}${fallbackNote(fellBack)}${gridNote}`,
      error: gridFailures > 0
    };
  }
  function selectionInfo() {
    const selection = figma.currentPage.selection;
    const frames = selection.filter(isRulerTarget);
    const first = frames[0];
    if (!first) return { total: selection.length, eligible: 0 };
    const meta = readMeta(first);
    return {
      total: selection.length,
      eligible: frames.length,
      first: {
        id: first.id,
        name: first.name,
        width: Math.round(first.width * 100) / 100,
        height: Math.round(first.height * 100) / 100,
        foldY: meta == null ? void 0 : meta.foldY,
        presetId: meta == null ? void 0 : meta.presetId,
        gridCount: first.layoutGrids.length,
        hasRuler: !!(meta == null ? void 0 : meta.guideOffsets.length) || hasRulerLayers(first)
      }
    };
  }
  function postSelection() {
    post({ type: "selection", selection: selectionInfo() });
  }
  async function upsertTemplate(raw) {
    const res = checkTemplate(raw);
    if (!res.ok) {
      notify({ message: `Template not saved: ${res.error}`, error: true });
      return;
    }
    const incoming = res.value;
    const index = templates.findIndex((t) => t.id === incoming.id);
    const now = Date.now();
    if (index === -1) {
      templates.push(__spreadProps(__spreadValues({}, incoming), { createdAt: now, updatedAt: now }));
    } else {
      templates[index] = __spreadProps(__spreadValues({}, incoming), { createdAt: templates[index].createdAt, updatedAt: now });
    }
    await persistTemplates();
    post({ type: "templates", templates });
  }
  async function deleteTemplate(id) {
    const template = findTemplate(id);
    if (!template) return;
    templates = templates.filter((t) => t.id !== id);
    await persistTemplates();
    const nextSettings = withoutTemplateDefaults(settings, id);
    if (nextSettings) {
      settings = nextSettings;
      await persistSettings();
      post({ type: "settings", settings });
    }
    post({ type: "templates", templates });
    notify({ message: `Deleted "${template.name}"` });
  }
  async function restoreStarters() {
    const missing = starterTemplates().filter((s) => !findTemplate(s.id));
    if (!missing.length) {
      notify({ message: "All starter templates are already in your library." });
      return;
    }
    templates.push(...missing);
    await persistTemplates();
    post({ type: "templates", templates });
    notify({ message: `Restored ${plural(missing.length, "starter template")}` });
  }
  async function importTemplates(json) {
    const res = parseImport(json, new Set(templates.map((t) => t.id)));
    if (!res.ok) {
      post({ type: "import-result", imported: 0, rejected: 0, errors: [res.error] });
      notify({ message: `Import failed: ${res.error}`, error: true });
      return;
    }
    const { templates: imported, rejected, errors } = res.value;
    templates.push(...imported);
    if (imported.length) await persistTemplates();
    post({ type: "templates", templates });
    post({ type: "import-result", imported: imported.length, rejected, errors });
    const rejectedNote = rejected ? ` \xB7 ${rejected} rejected` : "";
    notify({ message: `Imported ${plural(imported.length, "template")}${rejectedNote}`, error: imported.length === 0 });
  }
  async function handleMessage(msg) {
    switch (msg.type) {
      case "ui-ready":
        post({ type: "init", templates, settings, selection: selectionInfo() });
        return;
      case "create-frames":
        notify(await createFrames(msg.items, msg.addRuler, msg.templateChoice));
        return;
      case "upsert-template":
        await upsertTemplate(msg.template);
        return;
      case "delete-template":
        await deleteTemplate(msg.id);
        return;
      case "restore-starters":
        await restoreStarters();
        return;
      case "import-templates":
        await importTemplates(msg.json);
        return;
      case "save-settings":
        settings = sanitizeSettings(msg.settings);
        await persistSettings();
        post({ type: "settings", settings });
        return;
      case "save-from-selection":
        notify(await saveTemplateFromSelection(msg.name));
        return;
      case "apply-template":
        notify(await applyTemplateToSelection(msg.templateId, msg.mode));
        break;
      case "apply-default-template":
        notify(await applyDefaultTemplateToSelection());
        break;
      case "add-ruler":
        notify(await addRulerToSelection(msg.foldY));
        break;
      case "remove-rulers":
        notify(await removeRulersFromSelection());
        break;
      case "remove-visual-rulers":
        notify(await removeVisualRulers());
        break;
      case "notify":
        notify({ message: msg.message, error: msg.error });
        return;
    }
    postSelection();
  }
  async function runMenuCommand(command) {
    let result;
    switch (command) {
      case "add-ruler":
        result = await addRulerToSelection();
        break;
      case "apply-default":
        result = await applyDefaultTemplateToSelection();
        break;
      case "remove-rulers":
        result = await removeRulersFromSelection();
        break;
      default:
        result = { message: `Unknown command "${command}"`, error: true };
    }
    figma.closePlugin(result.message);
  }
  async function start() {
    const warnings = await loadState();
    const command = figma.command;
    if (command && command !== "open") {
      await runMenuCommand(command);
      return;
    }
    figma.showUI(__html__, { width: 360, height: 640, themeColors: true, title: "Fold Ruler & Grids" });
    uiOpen = true;
    figma.ui.onmessage = (msg) => {
      handleMessage(msg).catch((err) => {
        post({ type: "progress-end" });
        notify({ message: `Something went wrong: ${errorMessage(err)}`, error: true });
      });
    };
    figma.on("selectionchange", postSelection);
    figma.on("currentpagechange", postSelection);
    for (const message of warnings) notify({ message, error: true });
  }
  start().catch((err) => figma.closePlugin(`Fold Ruler couldn't start: ${errorMessage(err)}`));
})();
