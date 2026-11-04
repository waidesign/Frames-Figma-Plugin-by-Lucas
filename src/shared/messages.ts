// Copyright (c) 2026 Lucas. See LICENSE.
import type { LayoutTemplate, PluginSettings, SelectionInfo } from "./types";

/** "auto" = each preset's default template, "none" = no grids, otherwise a template id. */
export type TemplateChoice = string;
export type ApplyMode = "replace" | "append";

export interface CreateItem {
  presetId?: string;
  /** Base name; the plugin appends " - <n>". */
  name: string;
  width: number;
  height: number;
  foldY: number;
}

/** UI -> main thread. */
export type UiToMain =
  | { type: "ui-ready" }
  | { type: "create-frames"; items: CreateItem[]; addRuler: boolean; templateChoice: TemplateChoice }
  | { type: "upsert-template"; template: LayoutTemplate }
  | { type: "delete-template"; id: string }
  | { type: "restore-starters" }
  | { type: "import-templates"; json: string }
  | { type: "save-settings"; settings: PluginSettings }
  | { type: "save-from-selection"; name?: string }
  | { type: "apply-template"; templateId: string; mode: ApplyMode }
  | { type: "apply-default-template" }
  | { type: "add-ruler"; foldY?: number }
  | { type: "remove-rulers" }
  | { type: "remove-visual-rulers" }
  | { type: "notify"; message: string; error?: boolean };

/** Main thread -> UI. */
export type MainToUi =
  | { type: "init"; templates: LayoutTemplate[]; settings: PluginSettings; selection: SelectionInfo }
  | { type: "templates"; templates: LayoutTemplate[] }
  | { type: "settings"; settings: PluginSettings }
  | { type: "selection"; selection: SelectionInfo }
  | { type: "progress"; label: string; done: number; total: number }
  | { type: "progress-end" }
  | { type: "template-selected"; id: string }
  | { type: "import-result"; imported: number; rejected: number; errors: string[] };
