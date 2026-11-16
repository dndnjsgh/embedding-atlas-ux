// Licensed under the MIT License. See LICENSE in the project root.

import type { AnalysisCluster } from "../../stores/manual_analysis_store.js";
import type { RowID } from "../chart.js";

export interface ManualClusterLayer {
  id: string;
  color: string;
  points: { x: number; y: number }[];
}

/** Resolve selected cluster members to map coordinates, with the first selected cluster owning overlaps. */
export function manualClusterLayers(
  clusters: AnalysisCluster[],
  selectedClusterIds: string[],
  coordinates: Iterable<{ id: RowID; x: number; y: number }>,
): ManualClusterLayer[] {
  const selected = new Set(selectedClusterIds);
  const layers = clusters.filter((cluster) => selected.has(cluster.id)).map((cluster) => ({
    id: cluster.id,
    color: cluster.color,
    points: [] as { x: number; y: number }[],
  }));
  const ownerById = new Map<RowID, number>();
  for (const [index, cluster] of clusters.filter((cluster) => selected.has(cluster.id)).entries()) {
    for (const id of cluster.memberIds) if (!ownerById.has(id)) ownerById.set(id, index);
  }
  for (const point of coordinates) {
    const index = ownerById.get(point.id);
    if (index == null || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    layers[index].points.push({ x: point.x, y: point.y });
  }
  return layers;
}
