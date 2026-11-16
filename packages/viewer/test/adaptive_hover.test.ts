// Licensed under the MIT License. See LICENSE in the project root.

import { describe, expect, it } from "vitest";

import { adaptiveHoverRadius } from "../../component/src/lib/embedding_view/adaptive_hover.js";

describe("adaptiveHoverRadius", () => {
  it("uses a tighter radius for dense overview states", () => {
    const dense = adaptiveHoverRadius({ scale: 0.1, maxDensity: 50_000, width: 800, height: 600 });
    const sparse = adaptiveHoverRadius({ scale: 4, maxDensity: 50_000, width: 800, height: 600 });
    expect(dense).toBeLessThan(sparse);
  });

  it("honors the configured bounds", () => {
    expect(
      adaptiveHoverRadius({
        scale: 0.0001,
        maxDensity: 1e12,
        width: 1,
        height: 1,
        minRadius: 5,
        maxRadius: 15,
      }),
    ).toBe(5);
    expect(
      adaptiveHoverRadius({ scale: 100, maxDensity: 0, width: 800, height: 600, minRadius: 5, maxRadius: 15 }),
    ).toBe(15);
  });
});
