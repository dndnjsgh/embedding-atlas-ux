// Licensed under the MIT License. See LICENSE in the project root.

import type { ManualClusterLabel } from "./manual_cluster_labels.js";

export interface PlacedManualClusterLabel extends ManualClusterLabel {
  anchorX: number;
  anchorY: number;
  screenX: number;
  screenY: number;
}

interface ScreenProjection {
  width: number;
  height: number;
  location: (x: number, y: number) => { x: number; y: number };
}

const cellSize = 8;
const pointClearance = 8;
const labelHeight = 26;
const directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.707, 0.707],
  [-0.707, 0.707],
  [0.707, -0.707],
  [-0.707, -0.707],
];

/** Put labels only in screen regions that contain no plotted point centres. */
export function placeManualLabels(
  labels: ManualClusterLabel[],
  coordinates: Iterable<{ x: number; y: number }>,
  projection: ScreenProjection,
): PlacedManualClusterLabel[] {
  const { width, height } = projection;
  if (!labels.length || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];

  const columns = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const occupied = new Uint8Array(columns * rows);
  for (const coordinate of coordinates) {
    if (!Number.isFinite(coordinate.x) || !Number.isFinite(coordinate.y)) continue;
    const point = projection.location(coordinate.x, coordinate.y);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    if (point.x < 0 || point.y < 0 || point.x >= width || point.y >= height) continue;
    occupied[Math.floor(point.y / cellSize) * columns + Math.floor(point.x / cellSize)] = 1;
  }

  const placed: PlacedManualClusterLabel[] = [];
  const boxes: { left: number; right: number; top: number; bottom: number }[] = [];
  for (const label of labels) {
    const anchor = projection.location(label.x, label.y);
    if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) continue;
    if (anchor.x < 0 || anchor.y < 0 || anchor.x > width || anchor.y > height) continue;

    // This is deliberately a little wider than the CSS pill, including its border.
    const labelWidth = Math.min(168, Math.max(74, label.name.length * 8 + 38));
    let position: { x: number; y: number } | null = null;
    for (let radius = 44; radius <= 340 && !position; radius += 24) {
      for (const [dx, dy] of directions) {
        const x = anchor.x + dx * radius;
        const y = anchor.y + dy * radius;
        const box = {
          left: x - labelWidth / 2 - pointClearance,
          right: x + labelWidth / 2 + pointClearance,
          top: y - labelHeight / 2 - pointClearance,
          bottom: y + labelHeight / 2 + pointClearance,
        };
        if (box.left < 6 || box.top < 6 || box.right > width - 6 || box.bottom > height - 6) continue;
        if (boxes.some((other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)) continue;

        let clear = true;
        const leftCell = Math.floor(box.left / cellSize);
        const rightCell = Math.floor(box.right / cellSize);
        const topCell = Math.floor(box.top / cellSize);
        const bottomCell = Math.floor(box.bottom / cellSize);
        for (let row = topCell; row <= bottomCell && clear; row++) {
          for (let column = leftCell; column <= rightCell; column++) {
            if (occupied[row * columns + column]) {
              clear = false;
              break;
            }
          }
        }
        if (!clear) continue;
        boxes.push(box);
        position = { x, y };
        break;
      }
    }
    if (position) placed.push({ ...label, anchorX: anchor.x, anchorY: anchor.y, screenX: position.x, screenY: position.y });
  }
  return placed;
}
