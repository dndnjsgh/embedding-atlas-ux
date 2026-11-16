import type { RowID } from "../chart.js";

export interface HighlightCoordinate {
  id: RowID;
  x: number;
  y: number;
}

/** Exact radius union around ALL matching points, with a uniform spatial index. */
export function findHighlightContext(
  points: HighlightCoordinate[],
  primaryIds: Iterable<RowID>,
  radiusPercent: number,
) {
  const primary = new Set(primaryIds);
  const valid = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of valid) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const diagonal = valid.length ? Math.hypot(maxX - minX, maxY - minY) : 0;
  const radius = ((diagonal || 1) * Math.max(0, radiusPercent)) / 100;
  const ids = new Set<RowID>();
  if (!Number.isFinite(radius) || radius <= 0 || primary.size === 0) return { ids, radius: 0 };
  const cells = new Map<string, HighlightCoordinate[]>();
  for (const p of valid) {
    if (!primary.has(p.id)) continue;
    const key = `${Math.floor(p.x / radius)},${Math.floor(p.y / radius)}`;
    const cell = cells.get(key);
    if (cell) cell.push(p);
    else cells.set(key, [p]);
  }
  const squaredRadius = radius * radius;
  for (const p of valid) {
    if (primary.has(p.id)) continue;
    const cx = Math.floor(p.x / radius),
      cy = Math.floor(p.y / radius);
    search: for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const seed of cells.get(`${cx + dx},${cy + dy}`) ?? []) {
          if ((p.x - seed.x) ** 2 + (p.y - seed.y) ** 2 <= squaredRadius) {
            ids.add(p.id);
            break search;
          }
        }
      }
    }
  }
  return { ids, radius };
}
