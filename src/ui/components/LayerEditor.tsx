import type { JSX } from "preact";
import { DEFAULT_GUTTER } from "../../shared/gridMapping";
import {
  alignmentLabel,
  changeLayerAlignment,
  changeLayerPattern,
  describeLayer,
  type LayerErrors,
} from "../../shared/templates";
import type { GridAlignment, GridLayerDef, GridPattern } from "../../shared/types";
import { HexField, NumField } from "./controls";
import { IconChevron, IconCopy, IconEye, IconEyeOff, IconGrip, IconTrash } from "./icons";

export interface LayerDragProps {
  dragOver: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

interface Props {
  layer: GridLayerDef;
  errors: LayerErrors;
  expanded: boolean;
  onChange: (layer: GridLayerDef) => void;
  onToggleExpand: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (delta: -1 | 1) => void;
  drag: LayerDragProps;
}

const ALIGNMENTS: GridAlignment[] = ["STRETCH", "MIN", "CENTER", "MAX"];

/** One row of the layout guide stack, mirroring Figma's Layout grid panel fields. */
export function LayerEditor(p: Props) {
  const { layer, errors } = p;
  const patch = (fields: Partial<GridLayerDef>) => p.onChange({ ...layer, ...fields });
  const hasError = Object.keys(errors).length > 0;

  const onHeadKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    p.onMove(e.key === "ArrowUp" ? -1 : 1);
  };

  return (
    <div
      class={`layer ${p.drag.dragOver ? "drag-over" : ""} ${layer.visible ? "" : "is-hidden"} ${hasError ? "has-error" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={p.drag.onDragEnter}
      onDrop={(e) => {
        e.preventDefault();
        p.drag.onDrop();
      }}
    >
      <div class="layer-head" onKeyDown={onHeadKeyDown} title="Drag the handle, or Alt+↑/↓ to reorder">
        <span
          class="grip"
          draggable
          aria-hidden="true"
          onDragStart={(e) => {
            e.dataTransfer?.setData("text/plain", layer.id);
            const row = (e.currentTarget as HTMLElement).closest(".layer");
            if (row && e.dataTransfer) e.dataTransfer.setDragImage(row, 12, 12);
            p.drag.onDragStart();
          }}
          onDragEnd={p.drag.onDragEnd}
        >
          <IconGrip />
        </span>
        <select
          class="select select-compact"
          value={layer.pattern}
          aria-label="Layout guide type"
          onChange={(e) => p.onChange(changeLayerPattern(layer, e.currentTarget.value as GridPattern))}
        >
          <option value="GRID">Grid</option>
          <option value="COLUMNS">Columns</option>
          <option value="ROWS">Rows</option>
        </select>
        <button type="button" class="layer-summary" aria-expanded={p.expanded} onClick={p.onToggleExpand}>
          <span class="layer-swatch" style={{ background: `#${layer.color}`, opacity: Math.max(0.25, layer.opacity / 100) }} />
          <span class="layer-summary-text">{describeLayer(layer)}</span>
          <IconChevron open={p.expanded} />
        </button>
        <button
          type="button"
          class="icon-btn"
          aria-label={layer.visible ? "Hide layer" : "Show layer"}
          aria-pressed={!layer.visible}
          title={layer.visible ? "Hide" : "Show"}
          onClick={() => patch({ visible: !layer.visible })}
        >
          {layer.visible ? <IconEye /> : <IconEyeOff />}
        </button>
        <button type="button" class="icon-btn" aria-label="Duplicate layer" title="Duplicate" onClick={p.onDuplicate}>
          <IconCopy />
        </button>
        <button type="button" class="icon-btn" aria-label="Delete layer" title="Delete" onClick={p.onDelete}>
          <IconTrash />
        </button>
      </div>

      {p.expanded && (
        <div class="layer-body">
          {layer.pattern === "GRID" ? (
            <div class="field-grid">
              <NumField
                label="Size"
                value={layer.size ?? null}
                min={1}
                error={errors.size}
                onChange={(v) => typeof v === "number" && patch({ size: v })}
              />
              <span />
              <HexField label="Color" value={layer.color} onChange={(color) => patch({ color })} />
              <NumField
                label="Opacity"
                suffix="%"
                value={layer.opacity}
                min={0}
                error={errors.opacity}
                onChange={(v) => typeof v === "number" && patch({ opacity: v })}
              />
            </div>
          ) : (
            <RowsColsFields layer={layer} errors={errors} onChange={p.onChange} />
          )}
        </div>
      )}
    </div>
  );
}

function RowsColsFields(p: { layer: GridLayerDef; errors: LayerErrors; onChange: (l: GridLayerDef) => void }) {
  const { layer, errors } = p;
  const patch = (fields: Partial<GridLayerDef>) => p.onChange({ ...layer, ...fields });
  const alignment = layer.alignment ?? "STRETCH";
  const stretch = alignment === "STRETCH";
  const center = alignment === "CENTER";

  return (
    <div class="field-grid">
      <NumField
        label="Count"
        value={layer.count ?? null}
        allowAuto
        integer
        min={1}
        error={errors.count}
        title="A whole number, or Auto to fill the frame"
        onChange={(v) => v !== null && patch({ count: v })}
      />
      <label class="field">
        <span class="field-label">Type</span>
        <select
          class="select"
          value={alignment}
          onChange={(e) => p.onChange(changeLayerAlignment(layer, e.currentTarget.value as GridAlignment))}
        >
          {ALIGNMENTS.map((a) => (
            <option key={a} value={a}>
              {alignmentLabel(a, layer.pattern)}
            </option>
          ))}
        </select>
      </label>
      <NumField
        label={layer.pattern === "ROWS" ? "Height" : "Width"}
        value={stretch ? "auto" : typeof layer.sectionSize === "number" ? layer.sectionSize : null}
        disabled={stretch}
        disabledText="Auto"
        min={1}
        error={errors.sectionSize}
        onChange={(v) => typeof v === "number" && patch({ sectionSize: v })}
      />
      <NumField
        label={stretch ? "Margin" : "Offset"}
        value={layer.margin ?? 0}
        disabled={center}
        disabledText="—"
        min={0}
        error={errors.margin}
        title={center ? "Not used for Center" : undefined}
        onChange={(v) => typeof v === "number" && patch({ margin: v })}
      />
      <NumField
        label="Gutter"
        value={layer.gutter ?? DEFAULT_GUTTER}
        min={0}
        error={errors.gutter}
        onChange={(v) => typeof v === "number" && patch({ gutter: v })}
      />
      <span />
      <HexField label="Color" value={layer.color} onChange={(color) => patch({ color })} />
      <NumField
        label="Opacity"
        suffix="%"
        value={layer.opacity}
        min={0}
        error={errors.opacity}
        onChange={(v) => typeof v === "number" && patch({ opacity: v })}
      />
    </div>
  );
}
