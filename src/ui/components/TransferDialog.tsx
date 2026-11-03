import { useEffect, useRef, useState } from "preact/hooks";
import { exportTemplates } from "../../shared/templates";
import type { LayoutTemplate } from "../../shared/types";
import { plural } from "../../shared/util";
import { send, toast } from "../bridge";

export interface ImportResult {
  imported: number;
  rejected: number;
  errors: string[];
  seq: number;
}

interface Props {
  mode: "import" | "export";
  templates: LayoutTemplate[];
  importResult: ImportResult | null;
  onClose: () => void;
}

/** Export (copy / download JSON) and import (paste / choose file) of template libraries. */
export function TransferDialog(p: Props) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [json, setJson] = useState(() => (p.mode === "export" ? exportTemplates(p.templates) : ""));
  const [pendingSeq, setPendingSeq] = useState<number | null>(null);
  const result = pendingSeq !== null && p.importResult && p.importResult.seq > pendingSeq ? p.importResult : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && p.onClose();
    window.addEventListener("keydown", onKey);
    textRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copy = () => {
    const el = textRef.current;
    if (!el) return;
    el.select();
    // navigator.clipboard is blocked inside the plugin iframe; execCommand still works there.
    const copied = document.execCommand("copy");
    toast(copied ? "Template JSON copied" : "Couldn't copy — select the text and copy it manually", !copied);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "fold-ruler-templates.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setJson(await file.text());
    } catch {
      toast("Couldn't read that file", true);
    }
  };

  const runImport = () => {
    setPendingSeq(p.importResult?.seq ?? 0);
    send({ type: "import-templates", json });
  };

  return (
    <div class="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && p.onClose()}>
      <div class="dialog" role="dialog" aria-modal="true" aria-label={p.mode === "export" ? "Export templates" : "Import templates"}>
        <h2 class="dialog-title">{p.mode === "export" ? `Export ${plural(p.templates.length, "template")}` : "Import templates"}</h2>
        <p class="hint">
          {p.mode === "export"
            ? "Share this file with your team. They can import it from the Templates tab."
            : "Paste exported JSON or choose a .json file. Malformed entries are skipped."}
        </p>
        <textarea
          ref={textRef}
          class="textarea mono"
          rows={12}
          readOnly={p.mode === "export"}
          spellcheck={false}
          placeholder='{ "schema": 1, "templates": [ … ] }'
          value={json}
          onInput={(e) => setJson(e.currentTarget.value)}
        />
        {result && (
          <div class={`import-result ${result.imported ? "" : "is-error"}`} role="status">
            <strong>
              {result.imported ? `Imported ${plural(result.imported, "template")}` : "Nothing imported"}
              {result.rejected ? ` · ${result.rejected} rejected` : ""}
            </strong>
            {result.errors.length > 0 && (
              <ul>
                {result.errors.slice(0, 6).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {result.errors.length > 6 && <li>…and {result.errors.length - 6} more</li>}
              </ul>
            )}
          </div>
        )}
        <div class="dialog-actions">
          {p.mode === "export" ? (
            <>
              <button type="button" class="btn" onClick={copy}>
                Copy
              </button>
              <button type="button" class="btn btn-primary" onClick={download}>
                Download .json
              </button>
            </>
          ) : (
            <>
              <label class="btn file-btn">
                Choose file…
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => chooseFile(e.currentTarget.files?.[0])}
                />
              </label>
              <button type="button" class="btn btn-primary" disabled={!json.trim()} onClick={runImport}>
                Import
              </button>
            </>
          )}
          <span class="spacer" />
          <button type="button" class="btn" onClick={p.onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
