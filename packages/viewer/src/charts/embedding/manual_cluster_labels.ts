// Licensed under the MIT License. See LICENSE in the project root.

import type { RowID } from "../chart.js";
import type { AnalysisCluster } from "../../stores/manual_analysis_store.js";

export interface ManualClusterLabel {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

/** Place each label on an actual member nearest to its 2-D centroid. */
export function manualClusterLabels(
  clusters: AnalysisCluster[],
  coordinates: Iterable<{ id: RowID; x: number; y: number }>,
): ManualClusterLabel[] {
  const points = new Map<RowID, { x: number; y: number }>();
  for (const point of coordinates) {
    if (Number.isFinite(point.x) && Number.isFinite(point.y)) points.set(point.id, point);
  }

  const labels: ManualClusterLabel[] = [];
  for (const cluster of clusters) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const id of cluster.memberIds) {
      const point = points.get(id);
      if (!point) continue;
      sumX += point.x;
      sumY += point.y;
      count++;
    }
    if (count === 0) continue;
    const x = sumX / count;
    const y = sumY / count;
    let representative: { x: number; y: number } | null = null;
    let bestDistance = Infinity;
    for (const id of cluster.memberIds) {
      const point = points.get(id);
      if (!point) continue;
      const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        representative = point;
      }
    }
    if (!representative) continue;
    labels.push({
      id: cluster.id,
      name: cluster.name,
      color: cluster.color,
      x: representative.x,
      y: representative.y,
    });
  }
  return labels;
}
