// Copyright (c) 2026 Lucas. See LICENSE.
import { normalizeHex } from "./gridMapping";
import type { PluginSettings } from "./types";
import { isRecord } from "./util";

export function defaultSettings(): PluginSettings {
  return {
    rulerEnabledByDefault: true,
    rulerMode: "guide",
    rulerColor: "FF4D4D",
    showLabel: true,
    repeatPerScreen: false,
    defaultTemplateByPreset: {},
    defaultTemplateByCategory: {},
  };
}

function stringRecord(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(raw)) return out;
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && v) out[k] = v;
  return out;
}

/** Merges untrusted stored settings over the defaults, dropping anything malformed. */
export function sanitizeSettings(raw: unknown): PluginSettings {
  const d = defaultSettings();
  if (!isRecord(raw)) return d;
  const bool = (key: keyof PluginSettings, fallback: boolean) =>
    typeof raw[key] === "boolean" ? (raw[key] as boolean) : fallback;
  const settings: PluginSettings = {
    rulerEnabledByDefault: bool("rulerEnabledByDefault", d.rulerEnabledByDefault),
    rulerMode: raw.rulerMode === "guide" || raw.rulerMode === "line" || raw.rulerMode === "both" ? raw.rulerMode : d.rulerMode,
    rulerColor: (typeof raw.rulerColor === "string" && normalizeHex(raw.rulerColor)) || d.rulerColor,
    showLabel: bool("showLabel", d.showLabel),
    repeatPerScreen: bool("repeatPerScreen", d.repeatPerScreen),
    defaultTemplateByPreset: stringRecord(raw.defaultTemplateByPreset),
    defaultTemplateByCategory: stringRecord(raw.defaultTemplateByCategory),
  };
  if (typeof raw.lastTemplateId === "string" && raw.lastTemplateId) settings.lastTemplateId = raw.lastTemplateId;
  return settings;
}

/** Preset-specific default wins over the category default. Ignores defaults pointing at deleted templates. */
export function resolveDefaultTemplateId(
  settings: PluginSettings,
  presetId: string | undefined,
  category: string | undefined,
  exists: (templateId: string) => boolean,
): string | undefined {
  const byPreset = presetId ? settings.defaultTemplateByPreset[presetId] : undefined;
  if (byPreset && exists(byPreset)) return byPreset;
  const byCategory = category ? settings.defaultTemplateByCategory[category] : undefined;
  if (byCategory && exists(byCategory)) return byCategory;
  return undefined;
}

/** Removes every default mapping that points at `templateId`. Returns null when nothing changed. */
export function withoutTemplateDefaults(settings: PluginSettings, templateId: string): PluginSettings | null {
  const strip = (map: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(map)) if (v !== templateId) out[k] = v;
    return out;
  };
  const byPreset = strip(settings.defaultTemplateByPreset);
  const byCategory = strip(settings.defaultTemplateByCategory);
  const changed =
    Object.keys(byPreset).length !== Object.keys(settings.defaultTemplateByPreset).length ||
    Object.keys(byCategory).length !== Object.keys(settings.defaultTemplateByCategory).length ||
    settings.lastTemplateId === templateId;
  if (!changed) return null;
  const next: PluginSettings = { ...settings, defaultTemplateByPreset: byPreset, defaultTemplateByCategory: byCategory };
  if (next.lastTemplateId === templateId) delete next.lastTemplateId;
  return next;
}
