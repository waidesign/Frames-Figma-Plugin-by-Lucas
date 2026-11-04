// Copyright (c) 2026 Lucas. See LICENSE.
/** Hex color without "#", e.g. "FF0000". */
export type Hex = string;

export type GridPattern = "GRID" | "COLUMNS" | "ROWS";
export type GridAlignment = "STRETCH" | "MIN" | "CENTER" | "MAX";

export interface GridLayerDef {
  id: string;
  pattern: GridPattern;
  visible: boolean;
  color: Hex;
  /** 0–100 (UI percent). */
  opacity: number;
  /** GRID only. */
  size?: number;
  /** COLUMNS/ROWS; "auto" maps to Infinity (JSON can't store Infinity). */
  count?: number | "auto";
  alignment?: GridAlignment;
  /** Column width / row height; ignored for STRETCH. */
  sectionSize?: number | "auto";
  /** Maps to `offset`. */
  margin?: number;
  /** Maps to `gutterSize`. */
  gutter?: number;
}

/** Where a template is stored. Kept in memory only; never written into exported JSON. */
export type TemplateScope = "library" | "file";

export interface LayoutTemplate {
  id: string;
  name: string;
  description?: string;
  layers: GridLayerDef[];
  /** Preset ids or category names. */
  suggestedFor?: string[];
  builtIn?: boolean;
  createdAt: number;
  updatedAt: number;
  scope?: TemplateScope;
}

export type RulerMode = "guide" | "line" | "both";

export interface PluginSettings {
  rulerEnabledByDefault: boolean;
  rulerMode: RulerMode;
  rulerColor: Hex;
  showLabel: boolean;
  repeatPerScreen: boolean;
  /** presetId -> templateId */
  defaultTemplateByPreset: Record<string, string>;
  /** category -> templateId */
  defaultTemplateByCategory: Record<string, string>;
  lastTemplateId?: string;
}

export interface FrameMeta {
  v: 1;
  presetId?: string;
  foldY: number;
  guideOffsets: number[];
  templateId?: string;
}

export type PresetCategory =
  | "Phone"
  | "Tablet"
  | "Desktop"
  | "Watch"
  | "Presentation"
  | "Social media"
  | "Paper"
  | "Figma Community";

export interface Preset {
  id: string;
  category: PresetCategory;
  name: string;
  width: number;
  height: number;
}

export interface SelectedFrameInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  foldY?: number;
  presetId?: string;
  gridCount: number;
  hasRuler: boolean;
}

export interface SelectionInfo {
  /** Number of selected nodes. */
  total: number;
  /** Number of selected frames/components the plugin can work on. */
  eligible: number;
  first?: SelectedFrameInfo;
}
