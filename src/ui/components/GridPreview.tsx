import { computeSections } from "../../shared/gridMapping";
import type { GridLayerDef } from "../../shared/types";

const MAX_W = 296;
const MAX_H = 140;

/** Small live preview of a template's layer stack on a frame of the given size. */
export function GridPreview(props: { layers: readonly GridLayerDef[]; width: number; height: number }) {
  const { width, height } = props;
  const scale = Math.min(MAX_W / width, MAX_H / height);
  const visible = props.layers.filter((l) => l.visible);

  return (
    <figure class="preview">
      <svg
        width={Math.max(1, Math.round(width * scale))}
        height={Math.max(1, Math.round(height * scale))}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Preview of ${visible.length} visible layout guide layers`}
      >
        <rect class="preview-frame" x="0" y="0" width={width} height={height} />
        {visible.map((layer) => (
          <LayerShapes key={layer.id} layer={layer} width={width} height={height} scale={scale} />
        ))}
      </svg>
      <figcaption>
        Preview · {width}×{height}
      </figcaption>
    </figure>
  );
}

function LayerShapes(props: { layer: GridLayerDef; width: number; height: number; scale: number }) {
  const { layer, width, height, scale } = props;
  const color = `#${layer.color}`;
  const opacity = Math.max(0.12, layer.opacity / 100);

  if (layer.pattern === "GRID") {
    const size = layer.size ?? 10;
    if (!(size >= 1)) return null;
    // Too dense to draw individual lines at this scale: show a tint instead.
    if (size * scale < 3) return <rect x="0" y="0" width={width} height={height} fill={color} opacity={opacity * 0.6} />;
    const patternId = `grid-${layer.id}`;
    return (
      <g opacity={opacity}>
        <defs>
          <pattern id={patternId} x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
            <path d={`M ${size} 0 L 0 0 0 ${size}`} fill="none" stroke={color} style={{ strokeWidth: 1 / scale }} />
          </pattern>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill={`url(#${patternId})`} />
      </g>
    );
  }

  const isColumns = layer.pattern === "COLUMNS";
  const sections = computeSections(isColumns ? width : height, layer);
  return (
    <g fill={color} opacity={opacity}>
      {sections.map((s, i) =>
        isColumns ? (
          <rect key={i} x={s.start} y="0" width={s.size} height={height} />
        ) : (
          <rect key={i} x="0" y={s.start} width={width} height={s.size} />
        ),
      )}
    </g>
  );
}
