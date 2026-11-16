// Copyright (c) 2026 Apple Inc. Licensed under MIT License.

import { get } from "svelte/store";
import { describe, expect, it } from "vitest";

import { EmbeddingHighlightStore } from "../src/stores/embedding_highlight_store.js";

describe("EmbeddingHighlightStore", () => {
  it("deduplicates the current search result", () => {
    const store = new EmbeddingHighlightStore();
    store.setPrimary([1, 2, 2, 3]);

    expect(get(store.state)).toMatchObject({ mode: "focus", primaryIds: [1, 2, 3], secondaryIds: [] });
  });

  it("pins a result set before the next search replaces the primary set", () => {
    const store = new EmbeddingHighlightStore();
    store.setPrimary([1, 2]);
    store.pinCurrentAsComparison();
    store.setPrimary([2, 3]);

    expect(get(store.state)).toMatchObject({ mode: "compare", primaryIds: [2, 3], secondaryIds: [1, 2] });
  });

  it("clears comparison state without retaining stale result IDs", () => {
    const store = new EmbeddingHighlightStore();
    store.setPrimary([1]);
    store.pinCurrentAsComparison();
    store.clearComparison();

    expect(get(store.state)).toMatchObject({ mode: "focus", primaryIds: [1], secondaryIds: [] });
  });

  it("retains every pinned ID and its label/filter after B changes or becomes empty", () => {
    const store = new EmbeddingHighlightStore();
    const ids = Array.from({ length: 49946 }, (_, i) => i);
    store.setPrimary(ids, "var_category: Apple", "year = 2025");
    store.pinCurrentAsComparison();
    store.setPrimary([], "var_category: missing");
    const pinned = get(store.state);
    expect(pinned.secondaryIds).toHaveLength(ids.length);
    expect(pinned.secondaryIds.every((id, index) => id === ids[index])).toBe(true);
    expect(pinned.secondaryIds).not.toBe(ids);
    expect(pinned).toMatchObject({
      secondaryLabel: "var_category: Apple",
      secondaryPredicate: "year = 2025",
      primaryIds: [],
      mode: "compare",
    });
    store.clearComparison();
    expect(get(store.state)).toMatchObject({ secondaryIds: [], secondaryLabel: "", secondaryPredicate: null });
  });
});
