export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Next n for "<base> - <n>" given the names already on the page. Starts at 1. */
export function nextFrameIndex(existingNames: readonly string[], base: string): number {
  const re = new RegExp(`^${escapeRegExp(base)} - (\\d+)$`);
  let max = 0;
  for (const name of existingNames) {
    const m = re.exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/**
 * Lays out new frames in a row. With existing top-level nodes, the row starts `gap` px to the right
 * of the rightmost one, top-aligned with it. On an empty page, the row is centered on the viewport.
 */
export function computeRowPlacement(
  existing: readonly Box[],
  sizes: readonly Size[],
  viewportCenter: Point,
  gap = 100,
): Point[] {
  if (!sizes.length) return [];
  let x: number;
  let y: number;
  if (existing.length) {
    let rightmost = existing[0];
    for (const b of existing) if (b.x + b.width > rightmost.x + rightmost.width) rightmost = b;
    x = rightmost.x + rightmost.width + gap;
    y = rightmost.y;
  } else {
    const totalWidth = sizes.reduce((sum, s) => sum + s.width, 0) + gap * (sizes.length - 1);
    const maxHeight = Math.max(...sizes.map((s) => s.height));
    x = viewportCenter.x - totalWidth / 2;
    y = viewportCenter.y - maxHeight / 2;
  }
  const out: Point[] = [];
  let cursor = Math.round(x);
  const top = Math.round(y);
  for (const s of sizes) {
    out.push({ x: cursor, y: top });
    cursor += Math.round(s.width) + gap;
  }
  return out;
}
