import type { JSX } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { LayoutTemplate, PluginSettings, SelectionInfo } from "../shared/types";
import { listen, send } from "./bridge";
import { CreateTab } from "./components/CreateTab";
import { SettingsTab } from "./components/SettingsTab";
import { TemplatesTab } from "./components/TemplatesTab";
import type { ImportResult } from "./components/TransferDialog";

type Tab = "create" | "templates" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "create", label: "Create" },
  { id: "templates", label: "Templates" },
  { id: "settings", label: "Settings" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("create");
  const [templates, setTemplates] = useState<LayoutTemplate[]>([]);
  const [settings, setSettings] = useState<PluginSettings | null>(null);
  const [selection, setSelection] = useState<SelectionInfo>({ total: 0, eligible: 0 });
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [selectRequest, setSelectRequest] = useState<{ id: string; seq: number } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const settingsRef = useRef<PluginSettings | null>(null);
  settingsRef.current = settings;

  useEffect(() => {
    let seq = 0;
    const off = listen((msg) => {
      switch (msg.type) {
        case "init":
          setTemplates(msg.templates);
          setSettings(msg.settings);
          setSelection(msg.selection);
          break;
        case "templates":
          setTemplates(msg.templates);
          break;
        case "settings":
          setSettings(msg.settings);
          break;
        case "selection":
          setSelection(msg.selection);
          break;
        case "progress":
          setProgress({ label: msg.label, done: msg.done, total: msg.total });
          break;
        case "progress-end":
          setProgress(null);
          break;
        case "template-selected":
          setTab("templates");
          setSelectRequest({ id: msg.id, seq: ++seq });
          break;
        case "import-result":
          setImportResult({ imported: msg.imported, rejected: msg.rejected, errors: msg.errors, seq: ++seq });
          break;
      }
    });
    send({ type: "ui-ready" });
    return off;
  }, []);

  const updateSettings = useCallback((patch: Partial<PluginSettings>) => {
    const current = settingsRef.current;
    if (!current) return;
    const next = { ...current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    send({ type: "save-settings", settings: next });
  }, []);

  const onTabKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    setTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  if (!settings) return <div class="loading">Loading…</div>;

  return (
    <>
      <div class="tabs" role="tablist" aria-label="Sections" onKeyDown={onTabKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            class="tab"
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div class="tab-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "create" && <CreateTab templates={templates} settings={settings} selection={selection} />}
        {tab === "templates" && (
          <TemplatesTab
            templates={templates}
            settings={settings}
            selection={selection}
            updateSettings={updateSettings}
            selectRequest={selectRequest}
            importResult={importResult}
          />
        )}
        {tab === "settings" && <SettingsTab settings={settings} templates={templates} updateSettings={updateSettings} />}
      </div>

      {progress && (
        <div class="progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
          <span>
            {progress.label}… {progress.done}/{progress.total}
          </span>
          <span class="progress-bar">
            <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </span>
        </div>
      )}
    </>
  );
}
