import type { FrameMeta } from "./types";
import { isRecord } from "./util";

/** pluginData key on frames holding FrameMeta JSON. */
export const META_KEY = "foldRuler";
/** pluginData key marking line/label layers the plugin created. */
export const LAYER_KEY = "foldRulerLayer";

export const MAX_REPEATS = 200;
const EPSILON = 0.01;

export interface GuideLike {
  axis: "X" | "Y";
  offset: number;
}

export function roundPx(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 1024 -> "1024", 1024.5 -> "1024.5" */
export function formatPx(n: number): string {
  return String(roundPx(n));
}

/**
 * Y offsets for the fold ruler(s). The first fold is always included (even if the frame is now
 * shorter). With `repeat`, every further multiple strictly inside the frame is added.
 */
export function computeFoldOffsets(foldY: number, frameHeight: number, repeat: boolean): number[] {
  if (!Number.isFinite(foldY) || foldY <= 0) return [];
  const out = [roundPx(foldY)];
  if (repeat) {
    for (let k = 2; k <= MAX_REPEATS && k * foldY < frameHeight - EPSILON; k++) out.push(roundPx(k * foldY));
  }
  return out;
}

/**
 * Removes the guides the plugin added (one guide per recorded offset) and keeps everything else
 * untouched, in order. A user guide at the same offset as a plugin guide survives as long as the
 * plugin's own copy is still there to be removed instead.
 */
export function stripPluginGuides<G extends GuideLike>(existing: readonly G[], pluginOffsets: readonly number[]): G[] {
  const remaining = pluginOffsets.slice();
  const out: G[] = [];
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

/** User guides (preserved) followed by the plugin's new fold guides. */
export function mergeGuides(
  existing: readonly GuideLike[],
  previousPluginOffsets: readonly number[],
  newOffsets: readonly number[],
): GuideLike[] {
  return [
    ...stripPluginGuides(existing, previousPluginOffsets).map((g) => ({ axis: g.axis, offset: g.offset })),
    ...newOffsets.map((offset) => ({ axis: "Y" as const, offset })),
  ];
}

export function parseFrameMeta(raw: string): FrameMeta | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.v !== 1) return null;
  if (typeof data.foldY !== "number" || !Number.isFinite(data.foldY) || data.foldY <= 0) return null;
  const meta: FrameMeta = {
    v: 1,
    foldY: data.foldY,
    guideOffsets: Array.isArray(data.guideOffsets)
      ? data.guideOffsets.filter((o): o is number => typeof o === "number" && Number.isFinite(o))
      : [],
  };
  if (typeof data.presetId === "string" && data.presetId) meta.presetId = data.presetId;
  if (typeof data.templateId === "string" && data.templateId) meta.templateId = data.templateId;
  return meta;
}

export function serializeFrameMeta(meta: FrameMeta): string {
  return JSON.stringify(meta);
}
