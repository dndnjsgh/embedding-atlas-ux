// Copyright (c) 2026 Apple Inc. Licensed under MIT License.

import { describe, expect, it } from "vitest";
import { CameraController } from "../../component/src/lib/embedding_view/cameraController.js";

describe("minimap camera synchronization", () => {
  it("notifies the minimap when the main viewport zooms or pans", () => {
    const camera = new CameraController({
      viewport: { x: 0, y: 0, scale: 1 },
      width: 800,
      height: 600,
      bounds: { xMin: -1, xMax: 1, yMin: -1, yMax: 1 },
    });
    let updates = 0;
    camera.subscribe(() => updates++);
    const initial = camera.getViewBounds();

    camera.update({ viewport: { x: 0.25, y: 0.1, scale: 2 } });
    const zoomed = camera.getViewBounds();
    expect(updates).toBe(1);
    expect(zoomed.xMax - zoomed.xMin).toBeLessThan(initial.xMax - initial.xMin);
    expect(zoomed.xMin).toBeGreaterThan(initial.xMin);

    camera.update({ viewport: { x: 0.25, y: 0.1, scale: 2 } });
    expect(updates).toBe(1);
    camera.update({ width: 1000 });
    expect(updates).toBe(2);
    camera.destroy();
  });
});
