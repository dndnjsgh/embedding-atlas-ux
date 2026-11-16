// Copyright (c) 2026 Apple Inc. Licensed under MIT License.

import { get } from "svelte/store";
import { describe, expect, it } from "vitest";

import { kMeansPartitions, ManualAnalysisStore, manualAnalysisCsv } from "../src/stores/manual_analysis_store.js";

describe("manual analysis", () => {
  it("separates spatially distant points deterministically", () => {
    const partitions = kMeansPartitions(
      [
        { id: 1, x: 0, y: 0 },
        { id: 2, x: 0.1, y: 0.1 },
        { id: 3, x: 10, y: 10 },
        { id: 4, x: 10.1, y: 10.1 },
      ],
      2,
    );
    expect(partitions.map((ids) => ids.sort()).sort((a, b) => a[0] - b[0])).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("tags points and supports cluster merge and split", () => {
    const store = new ManualAnalysisStore();
    store.tagPoints([1, 1, 2], " review ");
    store.createClusters(
      [
        [1, 2],
        [2, 3],
      ],
      "automatic",
    );
    let state = get(store.state);
    expect(state.pointTags).toEqual([
      { id: 1, tags: ["review"] },
      { id: 2, tags: ["review"] },
    ]);

    state.clusters.forEach((cluster) => store.toggleClusterSelection(cluster.id));
    store.renameCluster(state.clusters[0].id, "Priority group");
    store.mergeSelected();
    state = get(store.state);
    expect(state.clusters).toHaveLength(1);
    expect(state.clusters[0].memberIds).toEqual([1, 2, 3]);
    expect(state.clusters[0].name).toContain("Priority group");

    store.splitCluster(state.clusters[0].id, [[1, 2], [3]]);
    expect(get(store.state).clusters.map((cluster) => cluster.memberIds)).toEqual([[1, 2], [3]]);
  });

  it("exports tags and memberships as CSV", () => {
    const store = new ManualAnalysisStore();
    store.tagPoints([7], "outlier");
    store.createClusters([[7, 8]], "manual");
    expect(manualAnalysisCsv(store.snapshot())).toContain('"7","outlier","Cluster 1"');
  });
});
