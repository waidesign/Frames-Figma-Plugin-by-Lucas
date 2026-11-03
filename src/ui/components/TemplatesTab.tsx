import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ApplyMode } from "../../shared/messages";
import { isCategory, previewSize, targetLabel } from "../../shared/presets";
import { copyTemplate, defaultLayer, newTemplate, validateTemplate } from "../../shared/templates";
import type { GridLayerDef, LayoutTemplate, PluginSettings, SelectionInfo } from "../../shared/types";
import { plural, uid } from "../../shared/util";
import { send, toast } from "../bridge";
import { Chip, Switch } from "./controls";
import { GridPreview } from "./GridPreview";
import { IconPlus } from "./icons";
import { LayerEditor } from "./LayerEditor";
import { TargetSelect } from "./TargetSelect";
import { TransferDialog, type ImportResult } from "./TransferDialog";

interface Props {
  templates: LayoutTemplate[];
  settings: PluginSettings;
  selection: SelectionInfo;
  updateSettings: (patch: Partial<PluginSettings>) => void;
  selectRequest: { id: string; seq: number } | null;
  importResult: ImportResult | null;
}

const AUTOSAVE_MS = 350;
const clone = (t: LayoutTemplate): LayoutTemplate => JSON.parse(JSON.stringify(t));

export function TemplatesTab(p: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const last = p.settings.lastTemplateId;
    return last && p.templates.some((t) => t.id === last) ? last : p.templates[0]?.id ?? null;
  });
  const [draft, setDraft] = useState<LayoutTemplate | null>(null);
  const [dirty, setDirty] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [applyMode, setApplyMode] = useState<ApplyMode>("replace");
  const [dialog, setDialog] = useState<null | "import" | "export">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [target, setTarget] = useState("");

  const saved = p.templates.find((t) => t.id === selectedId) ?? null;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  /** Id of a template we just asked the main thread to create, until it arrives back. */
  const pendingIdRef = useRef<string | null>(null);

  // Fall back to the first template when the selected one disappears.
  useEffect(() => {
    if (saved) {
      if (pendingIdRef.current === saved.id) pendingIdRef.current = null;
      return;
    }
    if (selectedId && selectedId === pendingIdRef.current) return;
    if (!dirty && p.templates.length) setSelectedId(p.templates[0].id);
  }, [p.templates, saved, selectedId, dirty]);

  // Keep the draft in sync with the stored template while there are no unsaved edits.
  useEffect(() => {
    if (!dirty) setDraft(saved ? clone(saved) : null);
  }, [saved, dirty]);

  useEffect(() => {
    if (p.selectRequest) select(p.selectRequest.id);
  }, [p.selectRequest]);

  const validation = useMemo(() => (draft ? validateTemplate(draft) : null), [draft]);

  /** Sends pending valid edits now. Returns false if the draft is invalid. */
  const flush = (): boolean => {
    const d = draftRef.current;
    if (!d || !dirtyRef.current) return true;
    if (!validateTemplate(d).valid) return false;
    send({ type: "upsert-template", template: d });
    dirtyRef.current = false;
    setDirty(false);
    return true;
  };

  // Autosave: valid edits are saved shortly after the last change; invalid ones wait for a fix.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(flush, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [draft, dirty]);

  useEffect(() => () => void flush(), []);

  function select(id: string) {
    if (id === selectedId) return;
    if (!flush()) toast("Unsaved invalid changes were discarded", true);
    setDirty(false);
    dirtyRef.current = false;
    setSelectedId(id);
    setConfirmDelete(false);
    p.updateSettings({ lastTemplateId: id });
  }

  const edit = (fn: (t: LayoutTemplate) => LayoutTemplate) => {
    setDraft((d) => (d ? fn(d) : d));
    setDirty(true);
  };
  const setLayers = (fn: (layers: GridLayerDef[]) => GridLayerDef[]) => edit((t) => ({ ...t, layers: fn(t.layers) }));

  const moveLayer = (from: number, to: number) =>
    setLayers((layers) => {
      if (to < 0 || to >= layers.length || from === to) return layers;
      const next = layers.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const createNew = () => {
    if (!flush()) toast("Unsaved invalid changes were discarded", true);
    const names = new Set(p.templates.map((t) => t.name));
    let n = 1;
    while (names.has(`Untitled template ${n}`)) n++;
    const t = newTemplate(`Untitled template ${n}`);
    pendingIdRef.current = t.id;
    send({ type: "upsert-template", template: t });
    setExpanded({ [t.layers[0].id]: true });
    setDirty(false);
    setSelectedId(t.id);
    p.updateSettings({ lastTemplateId: t.id });
  };

  const duplicate = () => {
    if (!draft) return;
    flush();
    const t = copyTemplate(draft, `${draft.name} copy`);
    pendingIdRef.current = t.id;
    send({ type: "upsert-template", template: t });
    setDirty(false);
    setSelectedId(t.id);
  };

  const remove = () => {
    if (!draft) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setConfirmDelete(false);
    setDirty(false);
    dirtyRef.current = false;
    send({ type: "delete-template", id: draft.id });
    const next = p.templates.find((t) => t.id !== draft.id);
    setSelectedId(next?.id ?? null);
  };

  const apply = () => {
    if (!draft) return;
    if (!flush()) {
      toast("Fix the highlighted fields before applying", true);
      return;
    }
    send({ type: "apply-template", templateId: draft.id, mode: applyMode });
  };

  const q = query.trim().toLowerCase();
  const list = p.templates.filter(
    (t) => !q || t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q),
  );

  const defaultsForDraft = draft
    ? [
        ...Object.entries(p.settings.defaultTemplateByCategory).filter(([, id]) => id === draft.id).map(([k]) => k),
        ...Object.entries(p.settings.defaultTemplateByPreset).filter(([, id]) => id === draft.id).map(([k]) => k),
      ]
    : [];

  const setDefault = (key: string, templateId: string | null) => {
    const field = isCategory(key) ? "defaultTemplateByCategory" : "defaultTemplateByPreset";
    const map = { ...p.settings[field] };
    if (templateId) map[key] = templateId;
    else delete map[key];
    p.updateSettings({ [field]: map });
  };

  const size = previewSize(draft?.suggestedFor);
  const canUseSelection = p.selection.eligible > 0;

  return (
    <>
      <div class="panel">
        <div class="toolbar">
          <input
            class="input search"
            type="search"
            placeholder="Search templates…"
            aria-label="Search templates"
            value={query}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
          <button type="button" class="btn" onClick={createNew}>
            New
          </button>
          <button type="button" class="btn btn-ghost" onClick={() => setDialog("import")}>
            Import
          </button>
          <button type="button" class="btn btn-ghost" disabled={!p.templates.length} onClick={() => setDialog("export")}>
            Export
          </button>
        </div>

        {p.templates.length === 0 ? (
          <p class="empty">
            No templates yet. Create one, save one from a selected frame, or restore the starters in Settings.
          </p>
        ) : (
          <ul class="template-list" role="listbox" aria-label="Templates">
            {list.length === 0 && <li class="empty">No templates match “{query}”.</li>}
            {list.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={t.id === selectedId}
                  class={`template-item ${t.id === selectedId ? "is-selected" : ""}`}
                  onClick={() => select(t.id)}
                >
                  <span class="template-name">{t.id === selectedId && draft ? draft.name || "Untitled" : t.name}</span>
                  {t.builtIn && <span class="tag">Starter</span>}
                  {t.scope === "file" && <span class="tag tag-file">File</span>}
                  <span class="muted">{plural(t.layers.length, "layer")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {draft && validation && (
          <div class="editor">
            <div class="field-grid">
              <label class={`field span-2 ${validation.name ? "has-error" : ""}`}>
                <span class="field-label">Name</span>
                <input
                  class="input"
                  type="text"
                  value={draft.name}
                  aria-invalid={!!validation.name}
                  onInput={(e) => {
                    const name = e.currentTarget.value;
                    edit((t) => ({ ...t, name }));
                  }}
                />
                {validation.name && <span class="field-error">{validation.name}</span>}
              </label>
              <label class="field span-2">
                <span class="field-label">Description (optional)</span>
                <input
                  class="input"
                  type="text"
                  value={draft.description ?? ""}
                  onInput={(e) => {
                    const description = e.currentTarget.value;
                    edit((t) => ({ ...t, description: description || undefined }));
                  }}
                />
              </label>
            </div>

            <div class="row">
              <Switch
                checked={draft.scope === "file"}
                onChange={(on) => edit((t) => ({ ...t, scope: on ? "file" : "library" }))}
                label="Share in this file"
                title="Stored in this Figma file so collaborators see it. Off = only in your library on this machine."
              />
            </div>

            <div class="presets-box">
              <div class="row">
                <TargetSelect value={target} onChange={setTarget} placeholder="Preset or category…" label="Preset or category" />
                <button
                  type="button"
                  class="btn"
                  disabled={!target}
                  title="Mark as suggested for this preset/category"
                  onClick={() => {
                    edit((t) => ({ ...t, suggestedFor: Array.from(new Set([...(t.suggestedFor ?? []), target])) }));
                    setTarget("");
                  }}
                >
                  Suggest
                </button>
                <button
                  type="button"
                  class="btn"
                  disabled={!target}
                  title="Auto-apply this template when frames of this preset/category are created"
                  onClick={() => {
                    setDefault(target, draft.id);
                    setTarget("");
                  }}
                >
                  Make default
                </button>
              </div>
              {(draft.suggestedFor?.length ?? 0) > 0 && (
                <div class="chips">
                  <span class="chips-label">Suggested for</span>
                  {draft.suggestedFor!.map((key) => (
                    <Chip
                      key={key}
                      label={targetLabel(key)}
                      onRemove={() =>
                        edit((t) => {
                          const rest = (t.suggestedFor ?? []).filter((k) => k !== key);
                          return { ...t, suggestedFor: rest.length ? rest : undefined };
                        })
                      }
                    />
                  ))}
                </div>
              )}
              {defaultsForDraft.length > 0 && (
                <div class="chips">
                  <span class="chips-label">Default for</span>
                  {defaultsForDraft.map((key) => (
                    <Chip key={key} label={targetLabel(key)} onRemove={() => setDefault(key, null)} />
                  ))}
                </div>
              )}
            </div>

            <div class="section-head">
              <h2 class="section-title">Layout guides</h2>
              <button
                type="button"
                class="btn btn-ghost"
                onClick={() => {
                  const layer = defaultLayer("COLUMNS");
                  setLayers((layers) => [...layers, layer]);
                  setExpanded((e) => ({ ...e, [layer.id]: true }));
                }}
              >
                <IconPlus /> Add layer
              </button>
            </div>

            {draft.layers.length === 0 && <p class="empty">No layers. Applying this template clears a frame's grids.</p>}
            <div class="layers" onDragLeave={(e) => e.currentTarget === e.target && setDragOver(null)}>
              {draft.layers.map((layer, i) => (
                <LayerEditor
                  key={layer.id}
                  layer={layer}
                  errors={validation.layers[layer.id] ?? {}}
                  expanded={!!expanded[layer.id] || !!validation.layers[layer.id]}
                  onToggleExpand={() => setExpanded((e) => ({ ...e, [layer.id]: !e[layer.id] }))}
                  onChange={(next) => setLayers((layers) => layers.map((l) => (l.id === layer.id ? next : l)))}
                  onDelete={() => setLayers((layers) => layers.filter((l) => l.id !== layer.id))}
                  onDuplicate={() =>
                    setLayers((layers) => {
                      const next = layers.slice();
                      next.splice(i + 1, 0, { ...layer, id: uid("l") });
                      return next;
                    })
                  }
                  onMove={(delta) => moveLayer(i, i + delta)}
                  drag={{
                    dragOver: dragOver === i && dragFrom !== null && dragFrom !== i,
                    onDragStart: () => setDragFrom(i),
                    onDragEnter: () => setDragOver(i),
                    onDrop: () => {
                      if (dragFrom !== null) moveLayer(dragFrom, i);
                      setDragFrom(null);
                      setDragOver(null);
                    },
                    onDragEnd: () => {
                      setDragFrom(null);
                      setDragOver(null);
                    },
                  }}
                />
              ))}
            </div>

            <GridPreview layers={draft.layers} width={size.width} height={size.height} />

            <div class="row">
              <span class="save-state muted" role="status">
                {validation.valid ? (dirty ? "Saving…" : "All changes saved") : "Fix highlighted fields to save"}
              </span>
              <span class="spacer" />
              <button type="button" class="btn btn-ghost" onClick={duplicate}>
                Duplicate
              </button>
              <button type="button" class={`btn btn-ghost ${confirmDelete ? "btn-danger" : ""}`} onClick={remove}>
                {confirmDelete ? "Click to confirm" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </div>

      <footer class="footer">
        <p class="hint">
          {canUseSelection
            ? `${plural(p.selection.eligible, "frame")} selected${p.selection.first && p.selection.eligible === 1 ? ` · ${plural(p.selection.first.gridCount, "grid")}` : ""}`
            : "Select a frame to save its grids or apply a template."}
        </p>
        <div class="row">
          <button
            type="button"
            class="btn"
            disabled={!canUseSelection}
            onClick={() => send({ type: "save-from-selection" })}
            title="Create a new template from the selected frame's layout grids"
          >
            Save from selection
          </button>
          <span class="spacer" />
          <select
            class="select select-compact"
            aria-label="Apply mode"
            value={applyMode}
            onChange={(e) => setApplyMode(e.currentTarget.value as ApplyMode)}
          >
            <option value="replace">Replace</option>
            <option value="append">Append</option>
          </select>
          <button
            type="button"
            class="btn btn-primary"
            disabled={!canUseSelection || !draft || !validation?.valid}
            onClick={apply}
          >
            Apply to selection
          </button>
        </div>
      </footer>

      {dialog && (
        <TransferDialog mode={dialog} templates={p.templates} importResult={p.importResult} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
