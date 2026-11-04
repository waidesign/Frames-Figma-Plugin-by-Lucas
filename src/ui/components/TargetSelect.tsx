// Copyright (c) 2026 Lucas. See LICENSE.
import { CATEGORIES, PRESETS } from "../../shared/presets";

/** Picker for a preset id or a whole category (used for "suggested for" and default templates). */
export function TargetSelect(props: { value: string; onChange: (key: string) => void; placeholder: string; label: string }) {
  return (
    <select
      class="select"
      value={props.value}
      aria-label={props.label}
      onChange={(e) => props.onChange(e.currentTarget.value)}
    >
      <option value="">{props.placeholder}</option>
      <optgroup label="Whole category">
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c} (all)
          </option>
        ))}
      </optgroup>
      {CATEGORIES.map((c) => (
        <optgroup key={`g-${c}`} label={c}>
          {PRESETS.filter((p) => p.category === c).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.width}×{p.height}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
