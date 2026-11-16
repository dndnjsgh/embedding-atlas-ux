import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/search/search.js", () => ({
  resolveSearcher: () => ({ fullTextSearch: () => [] }),
  performSearch: vi.fn(async (_options) => Array.from({ length: 49946 }, (_, id) => ({ id }))),
  querySearchResultItems: vi.fn(async (_c, _t, _id, _fields, _p, items) =>
    items.map((item: { id: number }) => ({ ...item, fields: { var_category: "Apple" } })),
  ),
}));
import { SearchStore } from "../src/stores/search_store.js";
import { performSearch, querySearchResultItems } from "../src/search/search.js";

describe("full search map membership", () => {
  it("does not resurrect a cleared query from a pending debounce", async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    try {
      const store = new SearchStore();
      store.config.set({
        coordinator: { query: async () => ({ get: () => ({ count: 100000 }) }) } as any,
        table: "points",
        id: "id",
        text: "var_category",
        getCurrentPredicate: () => null,
        getColumns: () => [],
      });
      store.query.set("apple");
      store.clear();
      await vi.advanceTimersByTimeAsync(1000);
      expect(get(store.query)).toBeUndefined();
      expect(get(store.result)).toBeUndefined();
      expect(performSearch).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it("requests all built-in matches but fetches only 500 detail records", async () => {
    const store = new SearchStore();
    store.config.set({
      coordinator: { query: async () => ({ get: () => ({ count: 100000 }) }) } as any,
      table: "points",
      id: "id",
      text: "var_category",
      getCurrentPredicate: () => null,
      getColumns: () => [],
    });
    store.search("apple", "full-text");
    await vi.waitFor(() => expect(get(store.result)?.allIds.length).toBe(49946));
    expect(get(store.result)?.totalCount).toBe(49946);
    expect(get(store.result)?.items).toHaveLength(500);
    expect(performSearch).toHaveBeenCalledWith(expect.objectContaining({ limit: 100000 }));
    expect(vi.mocked(querySearchResultItems).mock.calls.at(-1)?.[5]).toHaveLength(500);
  });
});
