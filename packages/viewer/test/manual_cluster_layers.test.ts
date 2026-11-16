// Licensed under the MIT License. See LICENSE in the project root.

import { describe, expect, it } from "vitest";
import { manualClusterLayers } from "../src/charts/embedding/manual_cluster_layers.js";
import type { AnalysisCluster } from "../src/stores/manual_analysis_store.js";

function cluster(id: string, color: string, memberIds: number[]): AnalysisCluster {
  return { id, name: id, color, memberIds, tags: [], source: "manual", createdAt: "2026-01-01" };
}

const clusters = [cluster("one", "#f97316", [1, 2]), cluster("two", "#2563eb", [2, 3])];
const coordinates = [
  { id: 1, x: 10, y: 20 },
  { id: 2, x: 30, y: 40 },
  { id: 3, x: 50, y: 60 },
  { id: 4, x: 70, y: 80 },
];

describe("selected manual cluster map colors", () => {
  it("draws only checked clusters in their swatch colors", () => {
    expect(manualClusterLayers(clusters, ["two"], coordinates)).toEqual([
      { id: "two", color: "#2563eb", points: [{ x: 30, y: 40 }, { x: 50, y: 60 }] },
    ]);
    expect(manualClusterLayers(clusters, [], coordinates)).toEqual([]);
  });

  it("draws overlapping members once and ignores invalid locations", () => {
    const layers = manualClusterLayers(clusters, ["one", "two"], [
      ...coordinates,
      { id: 2, x: Number.NaN, y: 0 },
    ]);
    expect(layers).toEqual([
      { id: "one", color: "#f97316", points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] },
      { id: "two", color: "#2563eb", points: [{ x: 50, y: 60 }] },
    ]);
  });
});
