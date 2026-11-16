// Copyright (c) 2026 Apple Inc. Licensed under MIT License.

import { get, writable, type Writable } from "svelte/store";

import type { RowID } from "../charts/chart.js";

export interface AnalysisPoint {
  id: RowID;
  x: number;
  y: number;
}

export interface AnalysisCluster {
  id: string;
  name: string;
  color: string;
  memberIds: RowID[];
  tags: string[];
  source: "automatic" | "manual" | "merged" | "split";
  createdAt: string;
}

export interface ManualAnalysisState {
  pointTags: Array<{ id: RowID; tags: string[] }>;
  clusters: AnalysisCluster[];
  selectedClusterIds: string[];
}

const clusterColors = ["#f97316", "#2563eb", "#7c3aed", "#059669", "#db2777", "#ca8a04", "#0891b2"];

function uniqueIds(ids: RowID[]): RowID[] {
  return [...new Set(ids)];
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, " ");
}

function clusterId(): string {
  return `cluster-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function kMeansPartitions(points: AnalysisPoint[], requestedK: number, iterations = 20): RowID[][] {
  if (points.length === 0) return [];
  const k = Math.max(1, Math.min(Math.floor(requestedK), points.length));
  const centroids: Array<{ x: number; y: number }> = [{ x: points[0].x, y: points[0].y }];
  while (centroids.length < k) {
    let candidate = points[0];
    let farthest = -1;
    for (const point of points) {
      const distance = Math.min(...centroids.map((c) => (point.x - c.x) ** 2 + (point.y - c.y) ** 2));
      if (distance > farthest) {
        farthest = distance;
        candidate = point;
      }
    }
    centroids.push({ x: candidate.x, y: candidate.y });
  }

  let assignments = new Array<number>(points.length).fill(0);
  for (let iteration = 0; iteration < iterations; iteration++) {
    let changed = false;
    points.forEach((point, index) => {
      let best = 0;
      let bestDistance = Infinity;
      centroids.forEach((centroid, centroidIndex) => {
        const distance = (point.x - centroid.x) ** 2 + (point.y - centroid.y) ** 2;
        if (distance < bestDistance) {
          best = centroidIndex;
          bestDistance = distance;
        }
      });
      if (assignments[index] !== best) changed = true;
      assignments[index] = best;
    });

    const sums = Array.from({ length: k }, () => ({ x: 0, y: 0, count: 0 }));
    points.forEach((point, index) => {
      const sum = sums[assignments[index]];
      sum.x += point.x;
      sum.y += point.y;
      sum.count += 1;
    });
    sums.forEach((sum, index) => {
      if (sum.count > 0) centroids[index] = { x: sum.x / sum.count, y: sum.y / sum.count };
    });
    if (!changed && iteration > 0) break;
  }

  const partitions = Array.from({ length: k }, () => [] as RowID[]);
  points.forEach((point, index) => partitions[assignments[index]].push(point.id));
  return partitions.filter((partition) => partition.length > 0);
}

export class ManualAnalysisStore {
  readonly state: Writable<ManualAnalysisState>;
  /** Presentation preference, separate from exported annotation data. */
  readonly showMapLabels: Writable<boolean> = writable(true);

  constructor(initial?: Partial<ManualAnalysisState>) {
    this.state = writable({
      pointTags: initial?.pointTags ?? [],
      clusters: initial?.clusters ?? [],
      selectedClusterIds: initial?.selectedClusterIds ?? [],
    });
  }

  tagPoints(ids: RowID[], tag: string) {
    const value = normalizeTag(tag);
    if (!value || ids.length === 0) return;
    this.state.update((state) => {
      const tags = new Map(state.pointTags.map((entry) => [entry.id, new Set(entry.tags)]));
      for (const id of uniqueIds(ids)) {
        const current = tags.get(id) ?? new Set<string>();
        current.add(value);
        tags.set(id, current);
      }
      return { ...state, pointTags: [...tags].map(([id, values]) => ({ id, tags: [...values] })) };
    });
  }

  removePointTag(id: RowID, tag: string) {
    this.state.update((state) => ({
      ...state,
      pointTags: state.pointTags
        .map((entry) => (entry.id === id ? { ...entry, tags: entry.tags.filter((value) => value !== tag) } : entry))
        .filter((entry) => entry.tags.length > 0),
    }));
  }

  createClusters(partitions: RowID[][], source: AnalysisCluster["source"] = "automatic") {
    this.state.update((state) => {
      const offset = state.clusters.length;
      const additions = partitions
        .map(uniqueIds)
        .filter((ids) => ids.length > 0)
        .map(
          (memberIds, index): AnalysisCluster => ({
            id: clusterId(),
            name: `${source === "automatic" ? "Auto" : "Cluster"} ${offset + index + 1}`,
            color: clusterColors[(offset + index) % clusterColors.length],
            memberIds,
            tags: [],
            source,
            createdAt: new Date().toISOString(),
          }),
        );
      return { ...state, clusters: [...state.clusters, ...additions] };
    });
  }

  renameCluster(id: string, name: string) {
    const value = name.trim();
    if (!value) return;
    this.state.update((state) => ({
      ...state,
      clusters: state.clusters.map((cluster) => (cluster.id === id ? { ...cluster, name: value } : cluster)),
    }));
  }

  tagCluster(id: string, tag: string) {
    const value = normalizeTag(tag);
    if (!value) return;
    this.state.update((state) => ({
      ...state,
      clusters: state.clusters.map((cluster) =>
        cluster.id === id ? { ...cluster, tags: [...new Set([...cluster.tags, value])] } : cluster,
      ),
    }));
  }

  toggleClusterSelection(id: string) {
    this.state.update((state) => ({
      ...state,
      selectedClusterIds: state.selectedClusterIds.includes(id)
        ? state.selectedClusterIds.filter((value) => value !== id)
        : [...state.selectedClusterIds, id],
    }));
  }

  mergeSelected() {
    this.state.update((state) => {
      const selected = state.clusters.filter((cluster) => state.selectedClusterIds.includes(cluster.id));
      if (selected.length < 2) return state;
      const merged: AnalysisCluster = {
        id: clusterId(),
        name: `Merged ${selected.map((cluster) => cluster.name).join(" + ")}`,
        color: selected[0].color,
        memberIds: uniqueIds(selected.flatMap((cluster) => cluster.memberIds)),
        tags: [...new Set(selected.flatMap((cluster) => cluster.tags))],
        source: "merged",
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        clusters: [...state.clusters.filter((cluster) => !state.selectedClusterIds.includes(cluster.id)), merged],
        selectedClusterIds: [merged.id],
      };
    });
  }

  splitCluster(id: string, partitions: RowID[][]) {
    this.state.update((state) => {
      const original = state.clusters.find((cluster) => cluster.id === id);
      if (original == null || partitions.length < 2) return state;
      const replacements = partitions.map(
        (memberIds, index): AnalysisCluster => ({
          ...original,
          id: clusterId(),
          name: `${original.name} ${index + 1}`,
          memberIds: uniqueIds(memberIds),
          source: "split",
          createdAt: new Date().toISOString(),
        }),
      );
      return {
        ...state,
        clusters: [...state.clusters.filter((cluster) => cluster.id !== id), ...replacements],
        selectedClusterIds: replacements.map((cluster) => cluster.id),
      };
    });
  }

  deleteCluster(id: string) {
    this.state.update((state) => ({
      ...state,
      clusters: state.clusters.filter((cluster) => cluster.id !== id),
      selectedClusterIds: state.selectedClusterIds.filter((value) => value !== id),
    }));
  }

  snapshot(): ManualAnalysisState {
    return structuredClone(get(this.state));
  }

  clear() {
    this.state.set({ pointTags: [], clusters: [], selectedClusterIds: [] });
  }
}

export function manualAnalysisCsv(state: ManualAnalysisState): string {
  const clusterMembership = new Map<RowID, string[]>();
  for (const cluster of state.clusters) {
    for (const id of cluster.memberIds) {
      const names = clusterMembership.get(id) ?? [];
      names.push(cluster.name);
      clusterMembership.set(id, names);
    }
  }
  const tags = new Map(state.pointTags.map((entry) => [entry.id, entry.tags]));
  const ids = new Set<RowID>([...tags.keys(), ...clusterMembership.keys()]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    "id,tags,clusters",
    ...[...ids].map((id) =>
      [escape(id), escape((tags.get(id) ?? []).join("|")), escape((clusterMembership.get(id) ?? []).join("|"))].join(
        ",",
      ),
    ),
  ].join("\n");
}
