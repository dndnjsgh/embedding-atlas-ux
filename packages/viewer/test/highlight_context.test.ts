import { describe, expect, it } from "vitest";
import { findHighlightContext } from "../src/charts/embedding/highlight_context.js";

describe("context radius union", () => {
  it("includes neighbors of results beyond the former first-40 cap", () => {
    const seeds = Array.from({ length: 41 }, (_, id) => ({ id, x: id === 40 ? 1000 : id, y: 0 }));
    const points = [...seeds, { id: 100, x: 1000.2, y: 0 }, { id: 101, x: 500, y: 0 }];
    expect([
      ...findHighlightContext(
        points,
        seeds.map((p) => p.id),
        1,
      ).ids,
    ]).toEqual([100]);
  });
  it("does not truncate surrounding points to 600", () => {
    const points = Array.from({ length: 2001 }, (_, id) => ({ id, x: id === 0 ? 0 : 0.1, y: 0 }));
    points.push({ id: 3000, x: 100, y: 0 });
    expect(findHighlightContext(points, [0], 1).ids.size).toBe(2000);
  });
  it("matches a brute-force radius union, including negative coordinates and exact boundaries", () => {
    const points = Array.from({ length: 400 }, (_, id) => ({
      id,
      x: ((id * 17) % 101) - 50,
      y: ((id * 29) % 97) - 48,
    }));
    const seedIds = points.filter((p) => p.id % 7 === 0).map((p) => p.id);
    const seeds = points.filter((p) => seedIds.includes(p.id));
    for (const percent of [0.05, 1, 5, 10]) {
      const actual = findHighlightContext(points, seedIds, percent);
      const expected = points
        .filter((p) => !seedIds.includes(p.id) && seeds.some((s) => Math.hypot(s.x - p.x, s.y - p.y) <= actual.radius))
        .map((p) => p.id);
      expect([...actual.ids]).toEqual(expected);
      expect([...findHighlightContext(points, [...seedIds].reverse(), percent).ids]).toEqual(expected);
    }
    expect([
      ...findHighlightContext(
        [
          { id: 0, x: 0, y: 0 },
          { id: 1, x: 1, y: 0 },
          { id: 2, x: 10, y: 0 },
        ],
        [0],
        10,
      ).ids,
    ]).toEqual([1]);
  });
});
