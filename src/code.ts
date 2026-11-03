import { hexToRgb, layersToLayoutGrids, layoutGridsToLayers } from "./shared/gridMapping";
import { computeRowPlacement, nextFrameIndex, type Box } from "./shared/layout";
import type { ApplyMode, CreateItem, MainToUi, TemplateChoice, UiToMain } from "./shared/messages";
import { findPresetBySize, getPreset } from "./shared/presets";
import {
  computeFoldOffsets,
  formatPx,
  LAYER_KEY,
  META_KEY,
  parseFrameMeta,
  serializeFrameMeta,
  stripPluginGuides,
} from "./shared/rulerLogic";
import { defaultSettings, resolveDefaultTemplateId, sanitizeSettings, withoutTemplateDefaults } from "./shared/settings";
import { checkTemplate, parseImport, starterTemplates } from "./shared/templates";
import type { FrameMeta, LayoutTemplate, PluginSettings, RulerMode, SelectionInfo } from "./shared/types";
import { errorMessage, plural, uid } from "./shared/util";

// ---------------------------------------------------------------------------
// State & storage
// ---------------------------------------------------------------------------

/** figma.clientStorage keys ("My library", per user and machine). */
const STORAGE_TEMPLATES = "templates";
const STORAGE_SETTINGS = "settings";
/** figma.root pluginData key ("This file" scope, visible to collaborators). */
const FILE_TEMPLATES_KEY = "templates";

const FRAME_GAP = 100;
const BATCH_SIZE = 40;
const LABEL_FONT: FontName = { family: "Inter", style: "Regular" };

type RulerTarget = FrameNode | ComponentNode;

interface OpResult {
  message: string;
  error?: boolean;
}

let templates: LayoutTemplate[] = [];
let settings: PluginSettings = defaultSettings();
let uiOpen = false;

function post(msg: MainToUi): void {
  if (uiOpen) figma.ui.postMessage(msg);
}

function notify(result: OpResult): void {
  figma.notify(result.message, result.error ? { error: true } : undefined);
}

function stripScope({ scope: _scope, ...t }: LayoutTemplate): LayoutTemplate {
  return t;
}

/** Loads templates and settings, recovering from corrupt or missing data. Returns warnings to show. */
async function loadState(): Promise<string[]> {
  const warnings: string[] = [];

  let rawSettings: unknown;
  try {
    rawSettings = await figma.clientStorage.getAsync(STORAGE_SETTINGS);
  } catch {
    warnings.push("Couldn't read saved settings; using defaults.");
  }
  settings = sanitizeSettings(rawSettings);

  let rawLibrary: unknown;
  let readFailed = false;
  try {
    rawLibrary = await figma.clientStorage.getAsync(STORAGE_TEMPLATES);
  } catch {
    readFailed = true;
  }

  let library: LayoutTemplate[] = [];
  if (rawLibrary === undefined && !readFailed) {
    // First run: seed the editable starter templates.
    library = starterTemplates();
    await figma.clientStorage.setAsync(STORAGE_TEMPLATES, library.map(stripScope));
  } else if (Array.isArray(rawLibrary)) {
    let dropped = 0;
    for (const raw of rawLibrary) {
      const res = checkTemplate(raw);
      if (res.ok) library.push({ ...res.value, scope: "library" });
      else dropped++;
    }
    if (dropped) warnings.push(`${plural(dropped, "saved template")} couldn't be read and ${dropped === 1 ? "was" : "were"} skipped.`);
  } else {
    library = starterTemplates();
    warnings.push("Saved templates were unreadable, so the starter templates were restored.");
  }

  const fileTemplates: LayoutTemplate[] = [];
  const rawFile = figma.root.getPluginData(FILE_TEMPLATES_KEY);
  if (rawFile) {
    try {
      const parsed: unknown = JSON.parse(rawFile);
      if (!Array.isArray(parsed)) throw new Error("not a list");
      for (const raw of parsed) {
        const res = checkTemplate(raw);
        if (res.ok) fileTemplates.push({ ...res.value, scope: "file" });
      }
    } catch {
      warnings.push("Templates shared in this file were unreadable and were skipped.");
    }
  }

  const seen = new Set<string>();
  templates = [...library, ...fileTemplates].filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  return warnings;
}

async function persistTemplates(): Promise<void> {
  await figma.clientStorage.setAsync(
    STORAGE_TEMPLATES,
    templates.filter((t) => t.scope !== "file").map(stripScope),
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

async function persistSettings(): Promise<void> {
  await figma.clientStorage.setAsync(STORAGE_SETTINGS, settings);
}

function findTemplate(id: string | undefined): LayoutTemplate | undefined {
  return id ? templates.find((t) => t.id === id) : undefined;
}

function defaultTemplateFor(presetId: string | undefined): LayoutTemplate | undefined {
  const preset = getPreset(presetId);
  const id = resolveDefaultTemplateId(settings, presetId, preset?.category, (tid) => !!findTemplate(tid));
  return findTemplate(id);
}

// ---------------------------------------------------------------------------
// Node helpers
// ---------------------------------------------------------------------------

function isRulerTarget(node: SceneNode): node is RulerTarget {
  return node.type === "FRAME" || node.type === "COMPONENT";
}

function isInsideInstance(node: BaseNode): boolean {
  for (let p = node.parent; p; p = p.parent) if (p.type === "INSTANCE") return true;
  return false;
}

/** Frames/components in the selection the plugin may edit; everything else is counted as skipped. */
function collectTargets(): { targets: RulerTarget[]; skipped: number } {
  const targets: RulerTarget[] = [];
  let skipped = 0;
  for (const node of figma.currentPage.selection) {
    if (isRulerTarget(node) && !node.locked && !isInsideInstance(node)) targets.push(node);
    else skipped++;
  }
  return { targets, skipped };
}

function readMeta(node: BaseNode): FrameMeta | null {
  return parseFrameMeta(node.getPluginData(META_KEY));
}

function writeMeta(node: BaseNode, meta: FrameMeta): void {
  node.setPluginData(META_KEY, serializeFrameMeta(meta));
}

function hasRulerLayers(frame: RulerTarget): boolean {
  return frame.children.some((c) => c.getPluginData(LAYER_KEY) !== "");
}

function removeRulerLayers(frame: RulerTarget): number {
  let removed = 0;
  for (const child of frame.children.slice()) {
    if (child.getPluginData(LAYER_KEY) !== "") {
      child.remove();
      removed++;
    }
  }
  return removed;
}

let labelFontPromise: Promise<boolean> | null = null;
function ensureLabelFont(): Promise<boolean> {
  if (!labelFontPromise) labelFontPromise = figma.loadFontAsync(LABEL_FONT).then(() => true, () => false);
  return labelFontPromise;
}

async function yieldToFigma(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** Runs `fn` over items, yielding and reporting progress every BATCH_SIZE items for big selections. */
async function runBatched<T>(items: readonly T[], label: string, fn: (item: T) => void): Promise<void> {
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

// ---------------------------------------------------------------------------
// Fold ruler
// ---------------------------------------------------------------------------

interface RulerOptions {
  mode: RulerMode;
  color: string;
  label: boolean;
  repeat: boolean;
  presetId?: string;
  templateId?: string;
}

function rulerOptions(labelFontReady: boolean): RulerOptions {
  return {
    mode: settings.rulerMode,
    color: settings.rulerColor,
    label: settings.showLabel && labelFontReady,
    repeat: settings.repeatPerScreen,
  };
}

/** Absolutely positions a child when the frame uses auto layout, so the ruler doesn't join the flow. */
function makeAbsoluteIfNeeded(frame: RulerTarget, node: LineNode | TextNode): void {
  if (frame.layoutMode !== "NONE") node.layoutPositioning = "ABSOLUTE";
}

function tagLayer(node: SceneNode, offset: number): void {
  node.setPluginData(LAYER_KEY, JSON.stringify({ offset }));
}

function createRulerLayers(frame: RulerTarget, offset: number, opts: RulerOptions): void {
  const rgb = hexToRgb(opts.color);

  const line = figma.createLine();
  frame.appendChild(line);
  makeAbsoluteIfNeeded(frame, line);
  line.name = `Fold · ${formatPx(offset)}px`;
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
  text.characters = `Fold · ${formatPx(offset)}px`;
  text.name = `Fold label · ${formatPx(offset)}px`;
  text.fills = [{ type: "SOLID", color: rgb }];
  text.x = 4;
  text.y = Math.max(0, offset - text.height - 2);
  text.constraints = { horizontal: "MIN", vertical: "MIN" };
  text.locked = true;
  tagLayer(text, offset);
}

/**
 * Adds or updates the fold ruler on a frame. Only guides/layers the plugin created are touched;
 * all other guides are preserved. Returns whether native guides failed and the line layer was used.
 */
function applyRuler(frame: RulerTarget, foldY: number, opts: RulerOptions): { fellBack: boolean } {
  const prev = readMeta(frame);
  const offsets = computeFoldOffsets(foldY, frame.height, opts.repeat);

  removeRulerLayers(frame);
  const userGuides = stripPluginGuides(frame.guides, prev?.guideOffsets ?? []);

  let guideOffsets: number[] = [];
  let wantLines = opts.mode !== "guide";
  let fellBack = false;

  if (opts.mode !== "line") {
    try {
      frame.guides = [...userGuides, ...offsets.map((offset) => ({ axis: "Y" as const, offset }))];
      guideOffsets = offsets;
    } catch {
      fellBack = true;
      wantLines = true;
    }
  } else if (prev?.guideOffsets.length) {
    try {
      frame.guides = userGuides;
    } catch {
      // Guides unsupported here; nothing of ours to remove.
    }
  }

  if (wantLines) for (const offset of offsets) createRulerLayers(frame, offset, opts);

  writeMeta(frame, {
    v: 1,
    presetId: opts.presetId ?? prev?.presetId,
    foldY,
    guideOffsets,
    templateId: opts.templateId ?? prev?.templateId,
  });
  return { fellBack };
}

/** Removes the plugin's guides and line layers. Keeps foldY so the ruler can be re-added later. */
function removeRuler(frame: RulerTarget): boolean {
  const meta = readMeta(frame);
  let changed = removeRulerLayers(frame) > 0;
  if (meta && meta.guideOffsets.length) {
    try {
      frame.guides = stripPluginGuides(frame.guides, meta.guideOffsets);
    } catch {
      // Guides unsupported here.
    }
    writeMeta(frame, { ...meta, guideOffsets: [] });
    changed = true;
  }
  return changed;
}

function fallbackNote(count: number): string {
  return count ? ` · ${plural(count, "frame")} can't hold guides, used a line layer instead` : "";
}

function skippedNote(count: number): string {
  return count ? ` · skipped ${count} (locked or not a frame)` : "";
}

const NOTHING_SELECTED: OpResult = { message: "Select one or more frames first.", error: true };
const NO_FRAMES: OpResult = { message: "No editable frames in the selection (locked or not a frame).", error: true };

async function addRulerToSelection(customFold?: number): Promise<OpResult> {
  if (!figma.currentPage.selection.length) return NOTHING_SELECTED;
  const { targets, skipped } = collectTargets();
  if (!targets.length) return NO_FRAMES;

  const opts = rulerOptions(settings.showLabel ? await ensureLabelFont() : false);
  let fellBack = 0;
  let failed = 0;
  await runBatched(targets, "Adding fold rulers", (frame) => {
    const foldY = customFold && customFold > 0 ? customFold : readMeta(frame)?.foldY ?? frame.height;
    try {
      if (applyRuler(frame, foldY, opts).fellBack) fellBack++;
    } catch {
      failed++;
    }
  });
  figma.commitUndo();
  const done = targets.length - failed;
  return {
    message: `Fold ruler set on ${plural(done, "frame")}${fallbackNote(fellBack)}${skippedNote(skipped + failed)}`,
    error: done === 0,
  };
}

async function removeRulersFromSelection(): Promise<OpResult> {
  if (!figma.currentPage.selection.length) return NOTHING_SELECTED;
  const { targets, skipped } = collectTargets();
  if (!targets.length) return NO_FRAMES;
  let changed = 0;
  await runBatched(targets, "Removing rulers", (frame) => {
    if (removeRuler(frame)) changed++;
  });
  figma.commitUndo();
  return {
    message: changed
      ? `Removed plugin rulers from ${plural(changed, "frame")}${skippedNote(skipped)}`
      : "No plugin rulers found in the selection.",
  };
}

/** Removes visual line/label layers (keeps native guides). Selection if any, otherwise the whole page. */
async function removeVisualRulers(): Promise<OpResult> {
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

// ---------------------------------------------------------------------------
// Templates on frames
// ---------------------------------------------------------------------------

function setGrids(frame: RulerTarget, template: LayoutTemplate, mode: ApplyMode): void {
  const grids = layersToLayoutGrids(template.layers);
  frame.layoutGrids = mode === "append" ? [...frame.layoutGrids, ...grids] : grids;
}

async function applyTemplateToSelection(templateId: string, mode: ApplyMode): Promise<OpResult> {
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
      if (meta) writeMeta(frame, { ...meta, templateId: template.id });
    } catch {
      failed++;
    }
  });
  figma.commitUndo();
  const done = targets.length - failed;
  return {
    message: `${mode === "append" ? "Appended" : "Applied"} "${template.name}" to ${plural(done, "frame")}${skippedNote(skipped + failed)}`,
    error: done === 0,
  };
}

async function applyDefaultTemplateToSelection(): Promise<OpResult> {
  if (!figma.currentPage.selection.length) return NOTHING_SELECTED;
  const { targets, skipped } = collectTargets();
  if (!targets.length) return NO_FRAMES;

  let applied = 0;
  let noDefault = 0;
  await runBatched(targets, "Applying default templates", (frame) => {
    const meta = readMeta(frame);
    const presetId = meta?.presetId ?? findPresetBySize(frame.width, meta?.foldY ?? frame.height)?.id;
    const template = defaultTemplateFor(presetId);
    if (!template) {
      noDefault++;
      return;
    }
    try {
      setGrids(frame, template, "replace");
      if (meta) writeMeta(frame, { ...meta, templateId: template.id });
      applied++;
    } catch {
      noDefault++;
    }
  });
  figma.commitUndo();
  if (!applied) {
    return {
      message: "No default template matches the selected frames. Set defaults in Settings → Default templates.",
      error: true,
    };
  }
  const extra = noDefault ? ` · ${noDefault} without a matching default` : "";
  return { message: `Applied default templates to ${plural(applied, "frame")}${extra}${skippedNote(skipped)}` };
}

async function saveTemplateFromSelection(name?: string): Promise<OpResult> {
  const frame = figma.currentPage.selection.find(isRulerTarget);
  if (!frame) return { message: "Select a frame that has layout grids.", error: true };
  if (!frame.layoutGrids.length) return { message: `"${frame.name}" has no layout grids to save.`, error: true };

  const meta = readMeta(frame);
  const now = Date.now();
  const template: LayoutTemplate = {
    id: uid("t"),
    name: name?.trim() || `${frame.name} grids`,
    layers: layoutGridsToLayers(frame.layoutGrids, () => uid("l")),
    createdAt: now,
    updatedAt: now,
    scope: "library",
  };
  if (meta?.presetId) template.suggestedFor = [meta.presetId];
  templates.push(template);
  await persistTemplates();
  post({ type: "templates", templates });
  post({ type: "template-selected", id: template.id });
  return { message: `Saved "${template.name}" with ${plural(template.layers.length, "layer")}` };
}

// ---------------------------------------------------------------------------
// Frame creation
// ---------------------------------------------------------------------------

function topLevelBoxes(): Box[] {
  const boxes: Box[] = [];
  for (const node of figma.currentPage.children) {
    if ("x" in node && "width" in node) boxes.push({ x: node.x, y: node.y, width: node.width, height: node.height });
  }
  return boxes;
}

function pickTemplate(choice: TemplateChoice, presetId: string | undefined): LayoutTemplate | undefined {
  if (choice === "none") return undefined;
  if (choice === "auto") return defaultTemplateFor(presetId);
  return findTemplate(choice);
}

async function createFrames(items: CreateItem[], addRuler: boolean, choice: TemplateChoice): Promise<OpResult> {
  const valid = items.filter((i) => i.width > 0 && i.height > 0);
  if (!valid.length) return { message: "Pick at least one preset or a custom size.", error: true };

  const page = figma.currentPage;
  const placements = computeRowPlacement(topLevelBoxes(), valid, figma.viewport.center, FRAME_GAP);
  const existingNames = page.children.map((n) => n.name);
  const counters = new Map<string, number>();
  // Loaded even in native-guide mode: a frame that can't hold guides falls back to a labelled line.
  const opts = rulerOptions(addRuler && settings.showLabel ? await ensureLabelFont() : false);

  const created: FrameNode[] = [];
  let fellBack = 0;
  let gridFailures = 0;

  await runBatched(valid, "Creating frames", (item) => {
    const index = created.length;
    const base = item.name.trim() || "Frame";
    const n = counters.get(base) ?? nextFrameIndex(existingNames, base);
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
      } catch {
        gridFailures++;
      }
    }

    const foldY = item.foldY > 0 ? item.foldY : item.height;
    if (addRuler) {
      if (applyRuler(frame, foldY, { ...opts, presetId: item.presetId, templateId: template?.id }).fellBack) fellBack++;
    } else {
      // Remember the fold anyway so "Add fold ruler" later uses the original viewport height.
      writeMeta(frame, { v: 1, presetId: item.presetId, foldY, guideOffsets: [], templateId: template?.id });
    }
    created.push(frame);
  });

  page.selection = created;
  figma.viewport.scrollAndZoomIntoView(created);
  figma.commitUndo();

  const gridNote = gridFailures ? ` · grids failed on ${gridFailures}` : "";
  return {
    message: `Created ${plural(created.length, "frame")}${fallbackNote(fellBack)}${gridNote}`,
    error: gridFailures > 0,
  };
}

// ---------------------------------------------------------------------------
// Selection info
// ---------------------------------------------------------------------------

function selectionInfo(): SelectionInfo {
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
      foldY: meta?.foldY,
      presetId: meta?.presetId,
      gridCount: first.layoutGrids.length,
      hasRuler: !!meta?.guideOffsets.length || hasRulerLayers(first),
    },
  };
}

function postSelection(): void {
  post({ type: "selection", selection: selectionInfo() });
}

// ---------------------------------------------------------------------------
// UI messages
// ---------------------------------------------------------------------------

async function upsertTemplate(raw: LayoutTemplate): Promise<void> {
  const res = checkTemplate(raw);
  if (!res.ok) {
    notify({ message: `Template not saved: ${res.error}`, error: true });
    return;
  }
  const incoming = res.value;
  const index = templates.findIndex((t) => t.id === incoming.id);
  const now = Date.now();
  if (index === -1) {
    templates.push({ ...incoming, createdAt: now, updatedAt: now });
  } else {
    templates[index] = { ...incoming, createdAt: templates[index].createdAt, updatedAt: now };
  }
  await persistTemplates();
  post({ type: "templates", templates });
}

async function deleteTemplate(id: string): Promise<void> {
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

async function restoreStarters(): Promise<void> {
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

async function importTemplates(json: string): Promise<void> {
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
  const rejectedNote = rejected ? ` · ${rejected} rejected` : "";
  notify({ message: `Imported ${plural(imported.length, "template")}${rejectedNote}`, error: imported.length === 0 });
}

async function handleMessage(msg: UiToMain): Promise<void> {
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
  // Frame-editing actions change what the selection panel shows.
  postSelection();
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function runMenuCommand(command: string): Promise<void> {
  let result: OpResult;
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

async function start(): Promise<void> {
  const warnings = await loadState();
  const command = figma.command;
  if (command && command !== "open") {
    await runMenuCommand(command);
    return;
  }

  figma.showUI(__html__, { width: 360, height: 640, themeColors: true, title: "Fold Ruler & Grids" });
  uiOpen = true;
  figma.ui.onmessage = (msg: UiToMain) => {
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
