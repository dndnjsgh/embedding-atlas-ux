// Copyright (c) 2026 Apple Inc. Licensed under MIT License.

import { describe, expect, it } from "vitest";
import { placeManualLabels } from "../src/charts/embedding/manual_label_placement.js";
import type { ManualClusterLabel } from "../src/charts/embedding/manual_cluster_labels.js";

const projection = { width: 500, height: 400, location: (x: number, y: number) => ({ x, y }) };
const label = (id: string, x: number, y: number): ManualClusterLabel => ({
  id,
  name: `Cluster ${id}`,
  color: "#ff8800",
  x,
  y,
});

describe("manual cluster label placement", () => {
  it("places labels away from every plotted point and keeps a connector anchor", () => {
    const coordinates = [];
    for (let x = 150; x <= 350; x += 5) {
      for (let y = 100; y <= 300; y += 5) coordinates.push({ x, y });
    }
    const [placed] = placeManualLabels([label("one", 250, 200)], coordinates, projection);
    expect(placed).toBeDefined();
    expect([placed.anchorX, placed.anchorY]).toEqual([250, 200]);
    for (const point of coordinates) {
      expect(
        Math.abs(point.x - placed.screenX) <= 84 && Math.abs(point.y - placed.screenY) <= 13,
      ).toBe(false);
    }
  });

  it("hides labels when the viewport has no point-free space", () => {
    const small = { width: 100, height: 100, location: projection.location };
    const coordinates = [];
    for (let x = 0; x < 100; x += 4) {
      for (let y = 0; y < 100; y += 4) coordinates.push({ x, y });
    }
    expect(placeManualLabels([label("one", 50, 50)], coordinates, small)).toEqual([]);
  });

  it("does not overlap labels or place offscreen anchors", () => {
    const placed = placeManualLabels(
      [label("one", 250, 200), label("two", 250, 200), label("offscreen", 600, 200)],
      [{ x: 250, y: 200 }],
      projection,
    );
    expect(placed.map((item) => item.id)).toEqual(["one", "two"]);
    expect(
      Math.abs(placed[0].screenX - placed[1].screenX) < 168 &&
        Math.abs(placed[0].screenY - placed[1].screenY) < 26,
    ).toBe(false);
  });
});
