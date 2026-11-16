// Copyright (c) 2026 Apple Inc. Licensed under MIT License.

import { describe, expect, it } from "vitest";

import { resolveHighlightKinds } from "../src/charts/embedding/highlight_resolver.js";

describe("resolveHighlightKinds", () => {
  it("shows only the active search result in focus mode", () => {
    expect(
      [...resolveHighlightKinds({ mode: "focus", primaryIds: [1, 2], secondaryIds: [2, 3], contextIds: [4] })],
    ).toEqual([
      [1, "primary"],
      [2, "primary"],
    ]);
  });

  it("adds only non-result neighbors in context mode", () => {
    expect(
      [...resolveHighlightKinds({ mode: "context", primaryIds: [1, 2], secondaryIds: [], contextIds: [2, 3, 4] })],
    ).toEqual([
      [1, "primary"],
      [2, "primary"],
      [3, "context"],
      [4, "context"],
    ]);
  });

  it("keeps A, B, and their intersection visually distinct in compare mode", () => {
    expect(
      [...resolveHighlightKinds({ mode: "compare", primaryIds: [1, 2], secondaryIds: [2, 3] })],
    ).toEqual([
      [1, "primary"],
      [2, "intersection"],
      [3, "secondary"],
    ]);
  });
});
