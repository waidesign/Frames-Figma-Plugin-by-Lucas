// Copyright (c) 2026 Lucas. See LICENSE.
import type { GridAlignment, GridLayerDef, Hex } from "./types";

export const DEFAULT_COLOR: Hex = "FF0000";
export const DEFAULT_OPACITY = 10;
export const DEFAULT_GRID_SIZE = 10;
export const DEFAULT_COUNT = 5;
export const DEFAULT_GUTTER = 20;
export const DEFAULT_SECTION_SIZE = 64;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}
export interface Rgba extends Rgb {
  a: number;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Accepts "f00", "#F00", "ff0000", "#FF0000". Returns uppercase 6-digit hex without "#", or null. */
export function normalizeHex(input: string): Hex | null {
  const s = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(s)) {
    return s
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase();
  }
  if (/^[0-9a-f]{6}$/i.test(s)) return s.toUpperCase();
  return null;
}

export function hexToRgb(hex: Hex): Rgb {
  const n = parseInt(normalizeHex(hex) ?? DEFAULT_COLOR, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

/** Hex + opacity percent (0–100) -> Figma RGBA (all channels 0–1). */
export function hexToRgba(hex: Hex, opacityPct: number): Rgba {
  return { ...hexToRgb(hex), a: round(clamp(opacityPct, 0, 100) / 100, 4) };
}

/** Figma RGBA (0–1) -> hex + opacity percent (rounded to 2 decimals). */
export function rgbaToHexOpacity(color: { r: number; g: number; b: number; a?: number }): { hex: Hex; opacity: number } {
  const channel = (v: number) => clamp(Math.round(v * 255), 0, 255).toString(16).padStart(2, "0");
  return {
    hex: (channel(color.r) + channel(color.g) + channel(color.b)).toUpperCase(),
    opacity: round(clamp(color.a ?? 1, 0, 1) * 100, 2),
  };
}

/** GridLayerDef -> Figma LayoutGrid. */
export function layerToLayoutGrid(def: GridLayerDef): LayoutGrid {
  const color = hexToRgba(def.color, def.opacity);
  const pattern = def.pattern;
  if (pattern === "GRID") {
    const grid: GridLayoutGrid = {
      pattern: "GRID",
      sectionSize: def.size ?? DEFAULT_GRID_SIZE,
      visible: def.visible,
      color,
    };
    return grid;
  }
  const alignment: GridAlignment = def.alignment ?? "STRETCH";
  const grid: RowsColsLayoutGrid = {
    pattern,
    alignment,
    gutterSize: def.gutter ?? DEFAULT_GUTTER,
    count: def.count === "auto" ? Infinity : def.count ?? DEFAULT_COUNT,
    visible: def.visible,
    color,
    // Width/height is not used for STRETCH; margin (offset) is not used for CENTER.
    ...(alignment !== "STRETCH"
      ? { sectionSize: typeof def.sectionSize === "number" ? def.sectionSize : DEFAULT_SECTION_SIZE }
      : {}),
    ...(alignment !== "CENTER" ? { offset: def.margin ?? 0 } : {}),
  };
  return grid;
}

/** Figma LayoutGrid -> GridLayerDef. */
export function layoutGridToLayer(grid: LayoutGrid, id: string): GridLayerDef {
  const { hex, opacity } = rgbaToHexOpacity(grid.color ?? hexToRgba(DEFAULT_COLOR, DEFAULT_OPACITY));
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
    sectionSize: grid.alignment === "STRETCH" ? "auto" : grid.sectionSize ?? DEFAULT_SECTION_SIZE,
    margin: grid.offset ?? 0,
    gutter: grid.gutterSize,
  };
}

export function layersToLayoutGrids(defs: readonly GridLayerDef[]): LayoutGrid[] {
  return defs.map(layerToLayoutGrid);
}

export function layoutGridsToLayers(grids: readonly LayoutGrid[], makeId: () => string): GridLayerDef[] {
  return grids.map((g) => layoutGridToLayer(g, makeId()));
}

export interface Section {
  start: number;
  size: number;
}

const MAX_PREVIEW_SECTIONS = 500;

/**
 * Positions of columns (or rows) along an axis of length `total`, following Figma's layout rules.
 * Used by the UI preview; not needed to apply grids.
 */
export function computeSections(total: number, def: GridLayerDef): Section[] {
  if (def.pattern === "GRID") return [];
  const alignment = def.alignment ?? "STRETCH";
  const gutter = Math.max(0, def.gutter ?? DEFAULT_GUTTER);
  const margin = alignment === "CENTER" ? 0 : def.margin ?? 0;
  const fixed = typeof def.sectionSize === "number" ? def.sectionSize : DEFAULT_SECTION_SIZE;

  if (alignment === "STRETCH") {
    const n = typeof def.count === "number" ? Math.min(def.count, MAX_PREVIEW_SECTIONS) : 1;
    if (n < 1) return [];
    const size = (total - 2 * margin - gutter * (n - 1)) / n;
    if (size <= 0) return [];
    return Array.from({ length: n }, (_, i) => ({ start: margin + i * (size + gutter), size }));
  }

  if (fixed <= 0) return [];
  const available = alignment === "CENTER" ? total : total - margin;
  const n = Math.min(
    def.count === "auto" || def.count === undefined
      ? Math.max(0, Math.floor((available + gutter) / (fixed + gutter)))
      : def.count,
    MAX_PREVIEW_SECTIONS,
  );
  const block = n * fixed + Math.max(0, n - 1) * gutter;
  const start0 = alignment === "MIN" ? margin : alignment === "MAX" ? total - margin - block : (total - block) / 2;
  return Array.from({ length: n }, (_, i) => ({ start: start0 + i * (fixed + gutter), size: fixed }));
}
