# Fold Ruler & Grid Templates (Figma plugin)

Creates frames from device presets with a **fold ruler** at the end of the first screen (e.g. Desktop 1440×1024 → ruler at y = 1024, which stays put when you extend the frame), and lets you save **Layout Guide templates** (Grid / Columns / Rows) that are applied automatically to new frames.

## Install (development)

Requires [Node.js](https://nodejs.org) 18+ and the **Figma desktop app**.

```bash
npm install
npm run build        # writes code.js and ui.html next to manifest.json
```

Then in Figma Desktop: **Menu → Plugins → Development → Import plugin from manifest…** and pick this folder's `manifest.json`. Run it from **Plugins → Development → Fold Ruler & Grid Templates**.

While developing, run `npm run watch` and re-run the plugin in Figma after each change.

| Script | What it does |
| --- | --- |
| `npm run build` | Bundle `src/code.ts` → `code.js` and `src/ui` → single-file `ui.html` |
| `npm run watch` | Same, rebuilding on save |
| `npm run typecheck` | Strict TypeScript check (`tsc --noEmit`) |
| `npm test` | Vitest unit tests + a UI smoke test |
| `npm run check` | All three of the above |

## Usage

### Create tab
- Search or browse presets by category, tick one or more (e.g. Desktop + Tablet + Phone), or tick **Custom size** (width, height, optional fold).
- Footer: **Add fold ruler** switch, **Grids** dropdown (*preset default*, *none*, or any template), **Create N frames**.
- Frames are named `<Preset> - <n>` (n counts up per name on the current page), placed in a row 100 px right of the rightmost top-level node (or centered in the viewport on an empty page), then selected and zoomed to.
- **Existing frames** (works on the current selection): add/update a fold ruler (optionally at a custom Y), apply the default template, remove plugin rulers, and **Remove visual rulers** (selection, or the whole page when nothing is selected). Visual line rulers appear in exports, so remove them before exporting. Native guides never export.

> Native guides are visible when Rulers are on (**Shift+R**).

### Templates tab
- List with search, **New**, **Import**, **Export**. Starter templates are tagged *Starter*; templates stored in the file are tagged *File*.
- The editor mirrors Figma's Layout grid panel: type (Grid/Columns/Rows), count (number or **Auto**), type (Stretch/Left/Center/Right, or Top/Bottom for rows), width/height (shown as *Auto* for Stretch), margin/offset, gutter, color and opacity. Each layer can be hidden, duplicated, deleted and reordered (drag the handle, or Alt+↑/↓).
- Edits **autosave** once valid. Invalid fields are highlighted inline and are not saved.
- **Suggest** / **Make default** link a template to a preset or a whole category.
- **Share in this file** stores the template in the document so collaborators see it.
- Footer: **Save from selection** (captures the selected frame's layout grids, including Auto counts) and **Apply to selection** (Replace or Append).

### Settings tab
Ruler mode (Native guide / Visual line layer / Both), line color, label, *Repeat for every additional screen*, default templates per category and per preset, and **Restore starter templates**.

### Menu commands (Plugins → Fold Ruler & Grid Templates)
- **Open Fold Ruler & Grids**
- **Add fold ruler to selection**: uses the frame's stored fold, or its current height if none is stored
- **Apply default template to selection**: uses the frame's stored preset, or a preset with the same size
- **Remove plugin rulers from selection**

## How it works

- **Fold ruler**: the fold Y is stored per frame in `pluginData("foldRuler")` as `{ v: 1, presetId, foldY, guideOffsets, templateId }`.
  - *Native guide* mode adds `{ axis: "Y", offset: foldY }` to `frame.guides`. The plugin records the offsets it added and, when updating or removing, takes out only those. **User guides are never removed or altered.**
  - *Visual line* mode adds a locked, dashed 1 px `LineNode` ("Fold · 1024px") with constraints Stretch/Top, absolutely positioned inside auto-layout frames, plus an optional Inter label. Both layers are tagged with `pluginData("foldRulerLayer")`.
  - If a node rejects guides, the plugin falls back to the line layer and tells you.
  - Re-running "Add fold ruler" updates the ruler in place, so you never get duplicates.
- **Storage**: *My library* lives in `figma.clientStorage` (keys `templates`, `settings`; per user and machine). *This file* lives in `figma.root` pluginData. Corrupt data is skipped or reset to defaults with a warning.
- **Export format**: `{ "schema": 1, "exportedAt": "…", "templates": [ … ] }`. Auto count is stored as `"auto"`, because JSON can't hold `Infinity`. Import validates every entry, rejects malformed ones with a reason, and gives new ids to any that collide.
- Every action is committed as **one undo step**. Large selections are processed in batches of 40 with a progress bar.
- No network access (`allowedDomains: ["none"]`), no analytics.

## Project structure

```
manifest.json
build.mjs                    esbuild: code.js + single-file ui.html
src/code.ts                  main thread (Figma API)
src/ui/                      Preact UI (App, components/, styles.css, bridge.ts)
src/shared/types.ts          data model
src/shared/presets.ts        all presets: edit here to add devices
src/shared/gridMapping.ts    GridLayerDef ↔ LayoutGrid, hex+opacity ↔ RGBA
src/shared/templates.ts      starters, validation, import/export
src/shared/settings.ts       settings defaults/sanitizing, default-template resolution
src/shared/rulerLogic.ts     fold offsets, guide merging, frame meta
src/shared/layout.ts         frame naming and placement
src/shared/messages.ts       typed UI ↔ main message protocol
tests/                       Vitest
```

To add a device, append `{ id, category, name, width, height }` to `PRESETS` in `src/shared/presets.ts` and rebuild. Keep ids stable, because templates and settings refer to them.

## Publishing checklist

1. In Figma: **Plugins → Development → Manage plugins in development** → publish, which assigns a real plugin id. Replace the placeholder `"id"` in `manifest.json` with it.
2. `npm run check`: typecheck, tests and build must all pass.
3. Run the manual QA checklist below in both light and dark themes.
4. Prepare a 128×128 icon, a 1920×1080 cover, a description and screenshots (the *Figma Community* presets have these sizes).
5. Confirm `networkAccess` stays `["none"]` and there are no `console.log` calls left over.
6. Bump `version` in `package.json` and write release notes.

## Manual QA checklist (acceptance criteria)

1. **Desktop fold**: Create → tick *Desktop* → Create. The frame is 1440×1024 and named **"Desktop - 1"**. With Shift+R, a guide shows at y = 1024. Resize the frame to 1334 tall: the guide stays at 1024. Create Desktop again: you get "Desktop - 2", placed 100 px to the right.
2. **Every preset + custom**: tick a few presets in every category plus a Custom size (e.g. 500×2000, fold 800). Every frame's guide sits at its preset height (custom: 800). Switch the ruler mode to *Visual line layer* and repeat: you get a locked dashed line plus a "Fold · Npx" label. Try *Both*.
3. **Template values**: Templates → New → set layer 1 to **Grid**. Add a **Columns** layer: Stretch, count 5, margin 0, gutter 20, FF0000 at 10 %. Add a **Rows** layer. On Create, pick that template and create a frame. Figma's Layout grid panel shows exactly those values.
4. **Save from selection**: on a frame, add Columns with Count = **Auto** and Type = Left (width 80) by hand. Select it → Templates → Save from selection. The new template shows *Auto* columns, Left, width 80. Apply it to another frame: identical.
5. **Defaults**: Settings → set Phone → *Mobile 4-col* and preset *Desktop* → *Desktop 12-col*. Create Phone + Desktop frames with *Grids: preset default*: each gets its own grid. *Apply default template to selection* (menu command) does the same on existing frames.
6. **Export/Import**: Export → Download. Delete a template. Import the file: everything comes back, colliding ids are renamed, and there are no duplicates of the same id. Paste `{ not json` or `{"schema":2}`: you get a clear error and nothing crashes.
7. **User guides are safe**: drag your own horizontal and vertical guides into a frame (one exactly at the fold y). Add the ruler, update it, change mode, and remove plugin rulers. Your guides are all still there.
8. **Themes and errors**: switch Figma between light and dark: the UI follows. Open the dev console (Plugins → Development → Show/Hide console) and confirm there are no errors while clicking through all tabs. Run `npm run check` and confirm it's clean.

Edge cases to spot-check: nothing selected or a rectangle selected → friendly toast. Locked frames are skipped and counted. A frame inside an auto-layout parent or a Section still works. Select 100+ frames → progress bar, then one undo reverts everything.
