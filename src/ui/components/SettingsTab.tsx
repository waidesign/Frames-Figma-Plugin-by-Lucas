// Copyright (c) 2026 Lucas. See LICENSE.
import { useState } from "preact/hooks";
import {
  AUTHOR_NAME,
  AUTHOR_URL,
  COPYRIGHT_YEAR,
  FACEBOOK_URL,
  ISSUES_URL,
  LICENSE_NAME,
  LINKEDIN_URL,
  PLUGIN_NAME,
  PLUGIN_VERSION,
} from "../../shared/credit";
import { CATEGORIES, isCategory, targetLabel } from "../../shared/presets";
import type { LayoutTemplate, PluginSettings, RulerMode } from "../../shared/types";
import { send } from "../bridge";
import { GUIDE_HINT } from "./CreateTab";
import { HexField, Section, Switch } from "./controls";
import { IconClose } from "./icons";
import { TargetSelect } from "./TargetSelect";

interface Props {
  settings: PluginSettings;
  templates: LayoutTemplate[];
  updateSettings: (patch: Partial<PluginSettings>) => void;
}

const MODES: { value: RulerMode; label: string; hint: string }[] = [
  { value: "guide", label: "Native guide", hint: "A Figma guide at the fold. Never exported." },
  { value: "line", label: "Visual line layer", hint: "A locked dashed line layer. Visible in exports." },
  { value: "both", label: "Both", hint: "Guide + line layer." },
];

function TemplateSelect(props: { value: string; templates: LayoutTemplate[]; onChange: (id: string) => void; label: string }) {
  return (
    <select class="select grow" aria-label={props.label} value={props.value} onChange={(e) => props.onChange(e.currentTarget.value)}>
      <option value="">None</option>
      {props.templates.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

export function SettingsTab({ settings, templates, updateSettings }: Props) {
  const [newPreset, setNewPreset] = useState("");
  const [newTemplate, setNewTemplate] = useState("");

  const setMapping = (field: "defaultTemplateByCategory" | "defaultTemplateByPreset", key: string, id: string) => {
    const map = { ...settings[field] };
    if (id) map[key] = id;
    else delete map[key];
    updateSettings({ [field]: map });
  };

  const presetOverrides = Object.entries(settings.defaultTemplateByPreset);

  return (
    <div class="panel">
      <Section title="Fold ruler">
        <div class="stack">
          <Switch
            checked={settings.rulerEnabledByDefault}
            onChange={(rulerEnabledByDefault) => updateSettings({ rulerEnabledByDefault })}
            label="Add fold ruler to new frames by default"
          />
          <fieldset class="radio-group">
            <legend class="field-label">Ruler mode</legend>
            {MODES.map((m) => (
              <label key={m.value} class="radio">
                <input
                  type="radio"
                  name="ruler-mode"
                  value={m.value}
                  checked={settings.rulerMode === m.value}
                  onChange={() => updateSettings({ rulerMode: m.value })}
                />
                <span>
                  {m.label}
                  <span class="muted"> — {m.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p class="hint">{GUIDE_HINT}</p>
          <HexField label="Line color" value={settings.rulerColor} onChange={(rulerColor) => updateSettings({ rulerColor })} />
          <Switch
            checked={settings.showLabel}
            onChange={(showLabel) => updateSettings({ showLabel })}
            label="Show “Fold · 1024px” label on line layers"
          />
          <Switch
            checked={settings.repeatPerScreen}
            onChange={(repeatPerScreen) => updateSettings({ repeatPerScreen })}
            label="Repeat for every additional screen"
            title="Also add rulers at 2×, 3×… the fold, up to the frame height. Use “Update ruler” after extending a frame."
          />
        </div>
      </Section>

      <Section title="Default templates">
        <p class="hint">Auto-applied when “Grids: preset default” is chosen on the Create tab. A preset default beats its category default.</p>
        <div class="defaults">
          {CATEGORIES.map((c) => (
            <label key={c} class="default-row">
              <span class="default-key">{c}</span>
              <TemplateSelect
                label={`Default template for ${c}`}
                value={settings.defaultTemplateByCategory[c] ?? ""}
                templates={templates}
                onChange={(id) => setMapping("defaultTemplateByCategory", c, id)}
              />
            </label>
          ))}
        </div>

        <h3 class="subhead">Preset overrides</h3>
        {presetOverrides.length === 0 && <p class="empty">No preset-specific defaults.</p>}
        <div class="defaults">
          {presetOverrides.map(([presetId, templateId]) => (
            <div key={presetId} class="default-row">
              <span class="default-key" title={targetLabel(presetId)}>
                {targetLabel(presetId)}
              </span>
              <TemplateSelect
                label={`Default template for ${targetLabel(presetId)}`}
                value={templateId}
                templates={templates}
                onChange={(id) => setMapping("defaultTemplateByPreset", presetId, id)}
              />
              <button
                type="button"
                class="icon-btn"
                aria-label={`Remove override for ${targetLabel(presetId)}`}
                onClick={() => setMapping("defaultTemplateByPreset", presetId, "")}
              >
                <IconClose />
              </button>
            </div>
          ))}
        </div>
        <div class="row">
          <TargetSelect value={newPreset} onChange={setNewPreset} placeholder="Add override for…" label="Preset" />
          <TemplateSelect label="Template" value={newTemplate} templates={templates} onChange={setNewTemplate} />
          <button
            type="button"
            class="btn"
            disabled={!newPreset || !newTemplate}
            onClick={() => {
              setMapping(isCategory(newPreset) ? "defaultTemplateByCategory" : "defaultTemplateByPreset", newPreset, newTemplate);
              setNewPreset("");
              setNewTemplate("");
            }}
          >
            Add
          </button>
        </div>
      </Section>

      <Section title="Library">
        <p class="hint">
          Templates live in your library on this machine. Turn on “Share in this file” on a template to store it in the current
          file for collaborators. Use Export/Import on the Templates tab to share with your team.
        </p>
        <div class="row">
          <button type="button" class="btn" onClick={() => send({ type: "restore-starters" })}>
            Restore starter templates
          </button>
        </div>
      </Section>

      <Section title="About">
        <div class="about-section stack">
          <div class="row">
            <span class="about-title">
              <strong>{PLUGIN_NAME}</strong> <span class="muted">v{PLUGIN_VERSION}</span>
            </span>
          </div>
          <p class="about-author">Created by {AUTHOR_NAME}</p>
          <p class="about-copyright muted">
            Copyright © {COPYRIGHT_YEAR} {AUTHOR_NAME} · {LICENSE_NAME}
          </p>
          <div class="row wrap about-links">
            <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
              Website
            </a>
            <span class="muted" aria-hidden="true">
              ·
            </span>
            <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
            <span class="muted" aria-hidden="true">
              ·
            </span>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
            <span class="muted" aria-hidden="true">
              ·
            </span>
            <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">
              Report an issue
            </a>
          </div>
        </div>
      </Section>
    </div>
  );
}
