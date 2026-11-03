import { useMemo, useState } from "preact/hooks";
import type { CreateItem, TemplateChoice } from "../../shared/messages";
import { CATEGORIES, PRESETS } from "../../shared/presets";
import type { LayoutTemplate, PluginSettings, SelectionInfo } from "../../shared/types";
import { plural } from "../../shared/util";
import { send } from "../bridge";
import { NumField, Switch, type NumValue } from "./controls";
import { IconChevron } from "./icons";

interface Props {
  templates: LayoutTemplate[];
  settings: PluginSettings;
  selection: SelectionInfo;
}

interface CustomSize {
  enabled: boolean;
  name: string;
  width: NumValue;
  height: NumValue;
  fold: NumValue;
}

export const GUIDE_HINT = "Native guides are visible when Rulers are on (Shift+R).";

export function CreateTab({ templates, settings, selection }: Props) {
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({ Desktop: true });
  const [custom, setCustom] = useState<CustomSize>({ enabled: false, name: "Frame", width: 1440, height: 1024, fold: null });
  const [addRuler, setAddRuler] = useState(settings.rulerEnabledByDefault);
  const [templateChoice, setTemplateChoice] = useState<TemplateChoice>("auto");
  const [customFold, setCustomFold] = useState<NumValue>(null);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      PRESETS.filter((p) => {
        if (!q) return true;
        const size = `${p.width}×${p.height} ${p.width}x${p.height}`;
        return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || size.includes(q);
      }),
    [q],
  );

  const customErrors = {
    width: typeof custom.width === "number" && custom.width < 1 ? "Must be ≥ 1" : undefined,
    height: typeof custom.height === "number" && custom.height < 1 ? "Must be ≥ 1" : undefined,
    fold: typeof custom.fold === "number" && custom.fold <= 0 ? "Must be > 0" : undefined,
  };
  const customValid =
    custom.enabled &&
    typeof custom.width === "number" &&
    custom.width >= 1 &&
    typeof custom.height === "number" &&
    custom.height >= 1 &&
    !customErrors.fold;

  const count = checked.length + (customValid ? 1 : 0);
  const choiceExists = templateChoice === "auto" || templateChoice === "none" || templates.some((t) => t.id === templateChoice);
  const effectiveChoice = choiceExists ? templateChoice : "auto";

  const toggle = (id: string) =>
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const create = () => {
    const items: CreateItem[] = PRESETS.filter((p) => checked.includes(p.id)).map((p) => ({
      presetId: p.id,
      name: p.name,
      width: p.width,
      height: p.height,
      foldY: p.height,
    }));
    if (customValid) {
      const width = custom.width as number;
      const height = custom.height as number;
      items.push({
        name: custom.name.trim() || "Frame",
        width,
        height,
        foldY: typeof custom.fold === "number" && custom.fold > 0 ? custom.fold : height,
      });
    }
    send({ type: "create-frames", items, addRuler, templateChoice: effectiveChoice });
  };

  const first = selection.first;

  return (
    <>
      <div class="panel">
        <div class="toolbar">
          <input
            class="input search"
            type="search"
            placeholder="Search presets or sizes…"
            aria-label="Search presets"
            value={query}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
          {checked.length > 0 && (
            <button type="button" class="btn btn-ghost" onClick={() => setChecked([])}>
              Clear ({checked.length})
            </button>
          )}
        </div>

        {filtered.length === 0 && <p class="empty">No presets match “{query}”. Try a custom size below.</p>}

        {CATEGORIES.map((category) => {
          const items = filtered.filter((p) => p.category === category);
          if (!items.length) return null;
          const isOpen = q ? true : !!open[category];
          const selectedCount = items.filter((p) => checked.includes(p.id)).length;
          return (
            <div class="category" key={category}>
              <button
                type="button"
                class="category-head"
                aria-expanded={isOpen}
                onClick={() => setOpen((o) => ({ ...o, [category]: !isOpen }))}
              >
                <IconChevron open={isOpen} />
                <span class="category-name">{category}</span>
                {selectedCount > 0 && <span class="badge">{selectedCount}</span>}
                <span class="muted">{items.length}</span>
              </button>
              {isOpen && (
                <ul class="preset-list">
                  {items.map((p) => (
                    <li key={p.id}>
                      <label class="preset-row">
                        <input type="checkbox" checked={checked.includes(p.id)} onChange={() => toggle(p.id)} />
                        <span class="preset-name">{p.name}</span>
                        <span class="preset-size">
                          {p.width}×{p.height}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        <div class="category">
          <label class="category-head custom-head">
            <input
              type="checkbox"
              checked={custom.enabled}
              onChange={(e) => setCustom({ ...custom, enabled: e.currentTarget.checked })}
            />
            <span class="category-name">Custom size</span>
          </label>
          {custom.enabled && (
            <div class="field-grid pad">
              <label class="field span-2">
                <span class="field-label">Name</span>
                <input
                  class="input"
                  type="text"
                  value={custom.name}
                  onInput={(e) => setCustom({ ...custom, name: e.currentTarget.value })}
                />
              </label>
              <NumField label="Width" value={custom.width} min={1} error={customErrors.width} onChange={(width) => setCustom({ ...custom, width })} />
              <NumField label="Height" value={custom.height} min={1} error={customErrors.height} onChange={(height) => setCustom({ ...custom, height })} />
              <NumField
                label="Fold (optional)"
                value={custom.fold}
                optional
                min={1}
                placeholder={typeof custom.height === "number" ? `${custom.height} (height)` : "Height"}
                error={customErrors.fold}
                onChange={(fold) => setCustom({ ...custom, fold })}
              />
            </div>
          )}
        </div>

        <div class="section existing">
          <h2 class="section-title">Existing frames</h2>
          {selection.eligible === 0 ? (
            <p class="empty">
              {selection.total ? "The selection has no frames." : "Select frames on the canvas to add rulers or grids."}
            </p>
          ) : (
            <>
              <p class="selection-info">
                <strong>{selection.eligible > 1 ? plural(selection.eligible, "frame") : first?.name}</strong>
                {first && selection.eligible === 1 && (
                  <span class="muted">
                    {" "}
                    · {first.width}×{first.height}
                    {first.foldY !== undefined ? ` · fold ${first.foldY}` : ""}
                    {first.hasRuler ? " · has ruler" : ""}
                  </span>
                )}
              </p>
              <div class="row">
                <NumField
                  class="grow"
                  label="Fold Y (optional)"
                  value={customFold}
                  optional
                  min={1}
                  placeholder={first ? `${first.foldY ?? first.height} (${first.foldY !== undefined ? "stored" : "height"})` : ""}
                  onChange={setCustomFold}
                />
                <button
                  type="button"
                  class="btn align-end"
                  onClick={() => send({ type: "add-ruler", foldY: typeof customFold === "number" ? customFold : undefined })}
                >
                  {first?.hasRuler ? "Update ruler" : "Add fold ruler"}
                </button>
              </div>
              <div class="row wrap">
                <button type="button" class="btn" onClick={() => send({ type: "apply-default-template" })}>
                  Apply default template
                </button>
                <button type="button" class="btn" onClick={() => send({ type: "remove-rulers" })}>
                  Remove plugin rulers
                </button>
              </div>
            </>
          )}
          <div class="row">
            <button type="button" class="btn btn-ghost" onClick={() => send({ type: "remove-visual-rulers" })}>
              Remove visual rulers {selection.total ? "from selection" : "on this page"}
            </button>
          </div>
          <p class="hint">Visual line rulers show up in exports — remove them before exporting. Native guides never export.</p>
        </div>
      </div>

      <footer class="footer">
        <div class="row">
          <Switch checked={addRuler} onChange={setAddRuler} label="Add fold ruler" />
          <select
            class="select grow"
            aria-label="Layout guide template"
            value={effectiveChoice}
            onChange={(e) => setTemplateChoice(e.currentTarget.value)}
          >
            <option value="auto">Grids: preset default</option>
            <option value="none">Grids: none</option>
            {templates.length > 0 && (
              <optgroup label="Templates">
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {addRuler && settings.rulerMode !== "line" && <p class="hint">{GUIDE_HINT}</p>}
        <button type="button" class="btn btn-primary btn-block" disabled={count === 0} onClick={create}>
          {count === 0 ? "Select presets to create" : `Create ${plural(count, "frame")}`}
        </button>
      </footer>
    </>
  );
}
