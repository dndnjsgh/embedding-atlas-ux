import { describe, expect, it } from "vitest";
import {
  enrichSearchResults,
  extractTextEvidence,
  scoreConfidence,
  sortSearchResults,
} from "../src/search/search_evidence.js";

describe("search evidence", () => {
  it("keeps original offsets for Korean, emoji and regex characters", () => {
    const text = "🙂 임베딩 C++ [test] 임베딩";
    for (const query of ["임베딩", "C++", "[test]"]) {
      const result = extractTextEvidence(query, { text }, "text");
      expect(result.exact).toBe(true);
      for (const e of result.evidence) expect(text.slice(e.start, e.end)).toBe(e.match);
    }
    expect(extractTextEvidence("임베딩", { text }, "text").evidence).toHaveLength(2);
  });
  it("does not claim a match in an unrelated column or missing text", () => {
    expect(extractTextEvidence("apple", { title: "apple", text: null }, "text").evidence).toEqual([]);
    const [item] = enrichSearchResults([{ id: 1, fields: { title: "apple", text: "pear" } }], {
      query: "apple",
      field: "text",
      mode: "full-text",
      predicate: null,
    });
    expect(item.match?.type).toBe("index");
  });
  it("keeps semantic retrieval separate from literal overlap and filters", () => {
    const [item] = enrichSearchResults([{ id: 1, distance: 0.1, fields: { text: "medical AI" } }], {
      query: "AI",
      field: "text",
      mode: "vector",
      predicate: "year > 2020",
      scoreConfig: { metric: "cosine-distance" },
    });
    expect(item.match).toMatchObject({
      type: "semantic",
      similarity: 0.9,
      confidence: "unavailable",
      predicate: "year > 2020",
    });
    expect(item.match?.evidence[0].match).toBe("AI");
  });
  it("distinguishes partial phrases and raw results", () => {
    const items = [{ id: 1, fields: { text: "Alpha then beta" } }];
    expect(
      enrichSearchResults(items, { query: "alpha beta", mode: "full-text", field: "text", predicate: null })[0].match
        ?.type,
    ).toBe("partial");
    expect(
      enrichSearchResults(items, { query: "Alpha", mode: "raw", field: "text", predicate: null })[0].match,
    ).toMatchObject({ type: "raw", evidence: [], confidence: "unavailable" });
  });
  it("never invents similarity from unknown metrics, invalid values or Euclidean distances", () => {
    expect(scoreConfidence(0.1).similarity).toBeUndefined();
    for (const value of [NaN, Infinity, -1, 3])
      expect(scoreConfidence(value, { metric: "cosine-distance" }).similarity).toBeUndefined();
    expect(scoreConfidence(0.1, { metric: "euclidean" }).confidence).toBe("unavailable");
  });
  it("requires valid calibration and preserves negative cosine similarity", () => {
    expect(scoreConfidence(1.5, { metric: "cosine-distance" }).similarity).toBe(-0.5);
    const config = {
      metric: "cosine-similarity" as const,
      calibration: { high: 0.8, medium: 0.6, label: "validated dataset v1" },
    };
    expect([0.8, 0.6, 0.59].map((x) => scoreConfidence(x, config).confidence)).toEqual(["high", "medium", "low"]);
    expect(
      scoreConfidence(0.9, { ...config, calibration: { high: 0.4, medium: 0.6, label: "invalid" } }).confidence,
    ).toBe("unavailable");
  });
  it("sorts available scores first without changing original provider order", () => {
    const items = enrichSearchResults(
      [
        { id: 1, fields: {} },
        { id: 2, distance: 0.1, fields: {} },
        { id: 3, distance: 0.4, fields: {} },
      ],
      { query: "x", mode: "vector", predicate: null, scoreConfig: { metric: "cosine-distance" } },
    );
    expect(sortSearchResults(items, "similarity").map((x) => x.id)).toEqual([2, 3, 1]);
    expect(sortSearchResults(items, "rank").map((x) => x.id)).toEqual([1, 2, 3]);
  });
});
