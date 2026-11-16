// Copyright (c) 2026 Apple Inc. Licensed under MIT License.

import { describe, expect, it } from "vitest";
import { get } from "svelte/store";

import { manualClusterLabels } from "../src/charts/embedding/manual_cluster_labels.js";
import { ManualAnalysisStore, type AnalysisCluster } from "../src/stores/manual_analysis_store.js";

function cluster(id: string, name: string, memberIds: number[]): AnalysisCluster {
  return {
    id,
    name,
    color: "#f97316",
    memberIds,
    tags: [],
    source: "manual",
    createdAt: "2026-01-01T00:00:00Z",
  };
}

describe("manual cluster map labels", () => {
  const points = [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 10, y: 0 },
    { id: 3, x: 2, y: 0 },
    { id: 4, x: Number.NaN, y: 0 },
  ];

  it("anchors each label to a real member nearest the cluster center", () => {
    expect(manualClusterLabels([cluster("one", "Citrus", [1, 2, 3])], points)).toEqual([
      { id: "one", name: "Citrus", color: "#f97316", x: 2, y: 0 },
    ]);
  });

  it("updates renamed clusters and skips members without valid coordinates", () => {
    const labels = manualClusterLabels(
      [cluster("one", "Renamed", [3, 4]), cluster("empty", "No location", [99])],
      points,
    );
    expect(labels).toEqual([{ id: "one", name: "Renamed", color: "#f97316", x: 2, y: 0 }]);
  });

  it("tracks cluster rename, split, and deletion without changing point annotations", () => {
    const store = new ManualAnalysisStore();
    store.createClusters([[1, 2, 3]], "manual");
    const original = get(store.state).clusters[0];
    store.renameCluster(original.id, "Citrus wines");
    expect(manualClusterLabels(get(store.state).clusters, points)[0].name).toBe("Citrus wines");

    store.splitCluster(original.id, [[1, 3], [2]]);
    expect(manualClusterLabels(get(store.state).clusters, points).map((label) => label.name)).toEqual([
      "Citrus wines 1",
      "Citrus wines 2",
    ]);

    for (const item of get(store.state).clusters) store.deleteCluster(item.id);
    expect(manualClusterLabels(get(store.state).clusters, points)).toEqual([]);
    expect(get(store.showMapLabels)).toBe(true);
  });
});
