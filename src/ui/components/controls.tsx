import type { ComponentChildren, JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { normalizeHex } from "../../shared/gridMapping";

export function Switch(props: { checked: boolean; onChange: (v: boolean) => void; label: string; title?: string }) {
  return (
    <label class="switch" title={props.title}>
      <input type="checkbox" role="switch" checked={props.checked} onChange={(e) => props.onChange(e.currentTarget.checked)} />
      <span class="switch-track" aria-hidden="true">
        <span class="switch-thumb" />
      </span>
      <span class="switch-label">{props.label}</span>
    </label>
  );
}

export type NumValue = number | "auto" | null;

export interface NumFieldProps {
  label: string;
  value: NumValue;
  onChange: (v: NumValue) => void;
  /** Accept "Auto" as a value. */
  allowAuto?: boolean;
  /** Empty input is valid and reported as null. */
  optional?: boolean;
  integer?: boolean;
  min?: number;
  disabled?: boolean;
  /** Text shown while disabled (e.g. "Auto" for Stretch width). */
  disabledText?: string;
  placeholder?: string;
  error?: string;
  title?: string;
  suffix?: string;
  class?: string;
}

/**
 * Text-based number input (like Figma's): keeps the raw text while typing, reports parsed values,
 * shows inline errors, and supports ArrowUp/ArrowDown (Shift = ×10).
 */
export function NumField(p: NumFieldProps) {
  const show = (v: NumValue) => (v === null ? "" : v === "auto" ? "Auto" : String(v));
  const [text, setText] = useState(show(p.value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(show(p.value));
  }, [p.value, focused]);

  const parse = (s: string): NumValue | undefined => {
    const t = s.trim().replace(/%$/, "");
    if (t === "") return p.optional ? null : undefined;
    if (p.allowAuto && /^auto$/i.test(t)) return "auto";
    const n = Number(t);
    if (!Number.isFinite(n)) return undefined;
    if (p.integer && !Number.isInteger(n)) return undefined;
    return n;
  };

  const parsed = parse(text);
  const localError =
    parsed === undefined
      ? p.integer
        ? p.allowAuto
          ? "Whole number or Auto"
          : "Whole number"
        : p.allowAuto
          ? "Number or Auto"
          : "Enter a number"
      : undefined;
  const error = p.disabled ? undefined : localError ?? p.error;

  const commit = (s: string) => {
    setText(s);
    const v = parse(s);
    if (v !== undefined) p.onChange(v);
  };

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    const current = parse(text);
    if (typeof current !== "number") return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    let next = current + (e.key === "ArrowUp" ? step : -step);
    if (p.min !== undefined) next = Math.max(p.min, next);
    commit(String(Math.round(next * 100) / 100));
  };

  return (
    <label class={`field ${p.class ?? ""} ${error ? "has-error" : ""}`} title={p.title}>
      <span class="field-label">{p.label}</span>
      <span class="input-wrap">
        <input
          class="input"
          type="text"
          inputMode="decimal"
          spellcheck={false}
          value={p.disabled && p.disabledText !== undefined ? p.disabledText : text}
          placeholder={p.placeholder}
          disabled={p.disabled}
          aria-invalid={!!error}
          onInput={(e) => commit(e.currentTarget.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
        />
        {p.suffix && <span class="input-suffix">{p.suffix}</span>}
      </span>
      {error && (
        <span class="field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

/** Color swatch (native picker) + hex text input. */
export function HexField(props: { label: string; value: string; onChange: (hex: string) => void; class?: string }) {
  const [text, setText] = useState(props.value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(props.value);
  }, [props.value, focused]);
  const valid = normalizeHex(text) !== null;

  return (
    <div class={`field ${props.class ?? ""} ${valid ? "" : "has-error"}`}>
      <span class="field-label">{props.label}</span>
      <span class="color-row">
        <input
          type="color"
          class="swatch"
          value={`#${props.value}`}
          aria-label={`${props.label} picker`}
          onInput={(e) => {
            const hex = normalizeHex(e.currentTarget.value);
            if (hex) props.onChange(hex);
          }}
        />
        <input
          class="input hex"
          type="text"
          spellcheck={false}
          maxLength={7}
          value={text}
          aria-label={`${props.label} hex`}
          aria-invalid={!valid}
          onInput={(e) => {
            const v = e.currentTarget.value;
            setText(v);
            const hex = normalizeHex(v);
            if (hex && hex.length === 6 && v.replace("#", "").length === 6) props.onChange(hex);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            const hex = normalizeHex(text);
            if (hex) props.onChange(hex);
          }}
        />
      </span>
      {!valid && (
        <span class="field-error" role="alert">
          6-digit hex, e.g. FF0000
        </span>
      )}
    </div>
  );
}

export function Section(props: { title: string; children: ComponentChildren; actions?: ComponentChildren }) {
  return (
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">{props.title}</h2>
        {props.actions && <div class="section-actions">{props.actions}</div>}
      </div>
      {props.children}
    </section>
  );
}

export function Chip(props: { label: string; onRemove?: () => void; title?: string }) {
  return (
    <span class="chip" title={props.title}>
      {props.label}
      {props.onRemove && (
        <button type="button" class="chip-x" aria-label={`Remove ${props.label}`} onClick={props.onRemove}>
          ×
        </button>
      )}
    </span>
  );
}
