// Copyright (c) 2026 Lucas. See LICENSE.
import { AUTHOR_NAME, AUTHOR_URL, PLUGIN_NAME } from "./credit";
import {
  DEFAULT_COLOR,
  DEFAULT_COUNT,
  DEFAULT_GRID_SIZE,
  DEFAULT_GUTTER,
  DEFAULT_OPACITY,
  DEFAULT_SECTION_SIZE,
  normalizeHex,
} from "./gridMapping";
import type { GridAlignment, GridLayerDef, GridPattern, LayoutTemplate } from "./types";
import { isRecord, uid } from "./util";

export const TEMPLATE_SCHEMA = 1;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

export function defaultLayer(pattern: GridPattern, id: string = uid("l")): GridLayerDef {
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
    gutter: DEFAULT_GUTTER,
  };
}

/** Switches a layer's pattern, keeping color/opacity/visibility (and all fields between Columns and Rows). */
export function changeLayerPattern(layer: GridLayerDef, pattern: GridPattern): GridLayerDef {
  if (layer.pattern === pattern) return layer;
  if (layer.pattern !== "GRID" && pattern !== "GRID") return { ...layer, pattern };
  return { ...defaultLayer(pattern, layer.id), color: layer.color, opacity: layer.opacity, visible: layer.visible };
}

/** Switches Columns/Rows alignment, filling in values the new alignment needs. */
export function changeLayerAlignment(layer: GridLayerDef, alignment: GridAlignment): GridLayerDef {
  const next: GridLayerDef = { ...layer, alignment };
  if (alignment !== "STRETCH" && typeof next.sectionSize !== "number") next.sectionSize = DEFAULT_SECTION_SIZE;
  if (alignment === "STRETCH" && next.count === "auto") next.count = DEFAULT_COUNT;
  return next;
}

export type LayerField = "color" | "opacity" | "size" | "count" | "sectionSize" | "margin" | "gutter" | "alignment";
export type LayerErrors = Partial<Record<LayerField, string>>;

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Business-rule validation shared by the editor (inline errors) and import/storage. */
export function validateLayer(l: GridLayerDef): LayerErrors {
  const e: LayerErrors = {};
  if (!normalizeHex(l.color)) e.color = "Use a 6-digit hex like FF0000";
  if (!isNum(l.opacity) || l.opacity < 0 || l.opacity > 100) e.opacity = "0–100";
  if (l.pattern === "GRID") {
    if (!isNum(l.size) || l.size < 1) e.size = "Size must be ≥ 1";
    return e;
  }
  const alignment = l.alignment ?? "STRETCH";
  if (!["STRETCH", "MIN", "CENTER", "MAX"].includes(alignment)) e.alignment = "Unknown type";
  if (l.count !== "auto" && (!isNum(l.count) || !Number.isInteger(l.count) || l.count < 1)) {
    e.count = "Count must be a whole number ≥ 1";
  } else if (l.count === "auto" && alignment === "STRETCH") {
    e.count = "Auto count needs a fixed type (not Stretch)";
  }
  if (alignment !== "STRETCH" && (!isNum(l.sectionSize) || l.sectionSize < 1)) {
    e.sectionSize = `${l.pattern === "ROWS" ? "Height" : "Width"} must be ≥ 1`;
  }
  if (alignment !== "CENTER" && l.margin !== undefined && (!isNum(l.margin) || l.margin < 0)) e.margin = "Must be ≥ 0";
  if (l.gutter !== undefined && (!isNum(l.gutter) || l.gutter < 0)) e.gutter = "Gutter must be ≥ 0";
  return e;
}

export function hasErrors(e: LayerErrors): boolean {
  return Object.keys(e).length > 0;
}

/** Reads a number field: undefined if absent, null if present but not a finite number. */
function readNum(raw: Record<string, unknown>, key: string): number | undefined | null {
  if (raw[key] === undefined) return undefined;
  return isNum(raw[key]) ? (raw[key] as number) : null;
}

/** Structural check + normalization of an untrusted layer object (import, storage). */
export function checkLayer(raw: unknown): Result<GridLayerDef> {
  if (!isRecord(raw)) return fail("layer is not an object");
  const pattern = raw.pattern;
  if (pattern !== "GRID" && pattern !== "COLUMNS" && pattern !== "ROWS") {
    return fail(`unknown layer type "${String(pattern)}"`);
  }
  const layer = defaultLayer(pattern, typeof raw.id === "string" && raw.id ? raw.id : uid("l"));

  if (raw.visible !== undefined) {
    if (typeof raw.visible !== "boolean") return fail("visible must be true or false");
    layer.visible = raw.visible;
  }
  if (raw.color !== undefined) {
    const color = typeof raw.color === "string" ? normalizeHex(raw.color) : null;
    if (!color) return fail("color must be a 6-digit hex");
    layer.color = color;
  }

  const numFields = pattern === "GRID" ? (["opacity", "size"] as const) : (["opacity", "margin", "gutter"] as const);
  for (const key of numFields) {
    const v = readNum(raw, key);
    if (v === null) return fail(`${key} must be a number`);
    if (v !== undefined) layer[key] = v;
  }

  if (pattern !== "GRID") {
    // JSON.stringify(Infinity) === "null", so accept null as Auto too.
    if (raw.count === "auto" || raw.count === null) layer.count = "auto";
    else if (raw.count !== undefined) {
      if (!isNum(raw.count)) return fail("count must be a number or \"auto\"");
      layer.count = raw.count;
    }
    if (raw.alignment !== undefined) {
      if (!["STRETCH", "MIN", "CENTER", "MAX"].includes(raw.alignment as string)) {
        return fail(`unknown alignment "${String(raw.alignment)}"`);
      }
      layer.alignment = raw.alignment as GridAlignment;
    }
    if (raw.sectionSize === "auto" || raw.sectionSize === null) layer.sectionSize = "auto";
    else if (raw.sectionSize !== undefined) {
      if (!isNum(raw.sectionSize)) return fail("sectionSize must be a number or \"auto\"");
      layer.sectionSize = raw.sectionSize;
    }
    if (layer.alignment !== "STRETCH" && layer.sectionSize === "auto") layer.sectionSize = DEFAULT_SECTION_SIZE;
  }

  const errors = validateLayer(layer);
  const first = Object.values(errors)[0];
  return first ? fail(first) : ok(layer);
}

export function describeLayer(l: GridLayerDef): string {
  if (l.pattern === "GRID") return `Grid ${l.size ?? DEFAULT_GRID_SIZE}px`;
  const noun = l.pattern === "COLUMNS" ? "columns" : "rows";
  const count = l.count === "auto" ? "Auto" : String(l.count ?? DEFAULT_COUNT);
  const alignment = l.alignment ?? "STRETCH";
  const typeName = alignmentLabel(alignment, l.pattern);
  return alignment === "STRETCH" ? `${count} ${noun} (${typeName})` : `${count} ${noun} (${typeName}, ${l.sectionSize}px)`;
}

export function alignmentLabel(alignment: GridAlignment, pattern: GridPattern): string {
  if (alignment === "STRETCH") return "Stretch";
  if (alignment === "CENTER") return "Center";
  if (pattern === "ROWS") return alignment === "MIN" ? "Top" : "Bottom";
  return alignment === "MIN" ? "Left" : "Right";
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function starterTemplates(now: number = Date.now()): LayoutTemplate[] {
  const columns = (id: string, count: number, margin: number, gutter: number): GridLayerDef => ({
    id,
    pattern: "COLUMNS",
    visible: true,
    color: DEFAULT_COLOR,
    opacity: DEFAULT_OPACITY,
    count,
    alignment: "STRETCH",
    sectionSize: "auto",
    margin,
    gutter,
  });
  const base = { builtIn: true, createdAt: now, updatedAt: now, scope: "library" as const };
  return [
    {
      ...base,
      id: "starter-desktop-12",
      name: "Desktop 12-col",
      description: "12 stretch columns, 80 margin, 24 gutter",
      layers: [columns("starter-desktop-12-cols", 12, 80, 24)],
      suggestedFor: ["Desktop"],
    },
    {
      ...base,
      id: "starter-tablet-8",
      name: "Tablet 8-col",
      description: "8 stretch columns, 32 margin, 24 gutter",
      layers: [columns("starter-tablet-8-cols", 8, 32, 24)],
      suggestedFor: ["Tablet"],
    },
    {
      ...base,
      id: "starter-mobile-4",
      name: "Mobile 4-col",
      description: "4 stretch columns, 16 margin, 16 gutter",
      layers: [columns("starter-mobile-4-cols", 4, 16, 16)],
      suggestedFor: ["Phone"],
    },
    {
      ...base,
      id: "starter-grid-8",
      name: "8px Grid",
      description: "8px square grid",
      layers: [{ ...defaultLayer("GRID", "starter-grid-8-grid"), size: 8 }],
    },
  ];
}

export function newTemplate(name: string, now: number = Date.now()): LayoutTemplate {
  return { id: uid("t"), name, layers: [defaultLayer("COLUMNS")], createdAt: now, updatedAt: now, scope: "library" };
}

/** Copy with fresh template and layer ids. */
export function copyTemplate(t: LayoutTemplate, name: string, now: number = Date.now()): LayoutTemplate {
  return {
    ...t,
    id: uid("t"),
    name,
    builtIn: false,
    layers: t.layers.map((l) => ({ ...l, id: uid("l") })),
    suggestedFor: t.suggestedFor ? [...t.suggestedFor] : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/** Structural check + normalization of an untrusted template object (import, storage, UI messages). */
export function checkTemplate(raw: unknown): Result<LayoutTemplate> {
  if (!isRecord(raw)) return fail("template is not an object");
  if (typeof raw.name !== "string" || !raw.name.trim()) return fail("template has no name");
  const name = raw.name.slice(0, 120);
  if (!Array.isArray(raw.layers)) return fail(`"${name}": layers must be a list`);

  const layers: GridLayerDef[] = [];
  const layerIds = new Set<string>();
  for (let i = 0; i < raw.layers.length; i++) {
    const res = checkLayer(raw.layers[i]);
    if (!res.ok) return fail(`"${name}", layer ${i + 1}: ${res.error}`);
    const layer = res.value;
    if (layerIds.has(layer.id)) layer.id = uid("l");
    layerIds.add(layer.id);
    layers.push(layer);
  }

  const now = Date.now();
  const template: LayoutTemplate = {
    id: typeof raw.id === "string" && raw.id ? raw.id : uid("t"),
    name,
    layers,
    builtIn: raw.builtIn === true,
    createdAt: isNum(raw.createdAt) ? raw.createdAt : now,
    updatedAt: isNum(raw.updatedAt) ? raw.updatedAt : now,
    scope: raw.scope === "file" ? "file" : "library",
  };
  if (typeof raw.description === "string" && raw.description) template.description = raw.description.slice(0, 500);
  if (Array.isArray(raw.suggestedFor)) {
    const keys = raw.suggestedFor.filter((k): k is string => typeof k === "string" && k.length > 0);
    if (keys.length) template.suggestedFor = Array.from(new Set(keys));
  }
  return ok(template);
}

export interface TemplateValidation {
  name?: string;
  layers: Record<string, LayerErrors>;
  valid: boolean;
}

export function validateTemplate(t: LayoutTemplate): TemplateValidation {
  const layers: Record<string, LayerErrors> = {};
  let valid = true;
  for (const l of t.layers) {
    const e = validateLayer(l);
    if (hasErrors(e)) {
      layers[l.id] = e;
      valid = false;
    }
  }
  const name = t.name.trim() ? undefined : "Name is required";
  if (name) valid = false;
  return { name, layers, valid };
}

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

export interface TemplateFile {
  schema: typeof TEMPLATE_SCHEMA;
  exportedAt: string;
  createdWith?: string;
  website?: string;
  templates: LayoutTemplate[];
}

export function exportTemplates(templates: readonly LayoutTemplate[]): string {
  const file: TemplateFile = {
    schema: TEMPLATE_SCHEMA,
    exportedAt: new Date().toISOString(),
    createdWith: `${PLUGIN_NAME} by ${AUTHOR_NAME}`,
    website: AUTHOR_URL,
    templates: templates.map(({ scope: _scope, ...t }) => t),
  };
  return JSON.stringify(file, null, 2);
}

export interface ImportSummary {
  templates: LayoutTemplate[];
  rejected: number;
  errors: string[];
}

/**
 * Parses an exported template file. Never throws.
 * Malformed entries are rejected individually; ids that collide with `existingIds`
 * (or with each other) are regenerated. Imported templates always land in the library scope.
 */
export function parseImport(json: string, existingIds: ReadonlySet<string>): Result<ImportSummary> {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return fail("This isn't valid JSON.");
  }

  let list: unknown[];
  if (Array.isArray(data)) {
    list = data;
  } else if (isRecord(data)) {
    if (data.schema !== TEMPLATE_SCHEMA) {
      return fail(
        data.schema === undefined
          ? "Missing \"schema\" field — is this a Fold Ruler template export?"
          : `Unsupported schema version ${JSON.stringify(data.schema)} (expected ${TEMPLATE_SCHEMA}).`,
      );
    }
    if (!Array.isArray(data.templates)) return fail("\"templates\" must be a list.");
    list = data.templates;
  } else {
    return fail("Expected an object like { \"schema\": 1, \"templates\": [...] }.");
  }

  const taken = new Set(existingIds);
  const templates: LayoutTemplate[] = [];
  const errors: string[] = [];
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
    templates.push(t);
  });
  return ok({ templates, rejected: errors.length, errors });
}
