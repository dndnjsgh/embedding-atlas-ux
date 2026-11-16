import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { compile } from "svelte/compiler";
import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import { enrichSearchResults } from "../src/search/search_evidence.js";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/views/SearchEvidence.svelte", import.meta.url), "utf8");
const compiled = compile(source, { generate: "server" }).js.code.replace(
  /(['"])svelte\/internal\/server\1/g,
  JSON.stringify(pathToFileURL(require.resolve("svelte/internal/server")).href),
);
const { default: Evidence } = await import(
  /* @vite-ignore */ "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);

describe("search evidence rendering", () => {
  it("escapes source snippets and presents semantic score metadata", () => {
    const [item] = enrichSearchResults([{ id: 1, distance: 0.1, fields: { text: "<script>alert(1)</script>" } }], {
      query: "<script>",
      field: "text",
      mode: "vector",
      predicate: "year > 2020",
      scoreConfig: { metric: "cosine-distance", calibration: { high: 0.8, medium: 0.6, label: "test calibration" } },
    });
    const html = render(Evidence, { props: { match: item.match } }).body;
    expect(html).toContain("Semantic match");
    expect(html).toContain("0.9000");
    expect(html).toContain("Confidence: High");
    expect(html).toContain("test calibration");
    expect(html).toContain("&lt;script>");
    expect(html).not.toContain("<script>");
  });
  it("does not expose a hidden field through its evidence excerpt", () => {
    const [item] = enrichSearchResults([{ id: 1, fields: { text: "hidden-secret" } }], {
      query: "secret",
      field: "text",
      mode: "full-text",
      predicate: null,
    });
    const html = render(Evidence, { props: { match: item.match, columnStyles: { text: { display: "hidden" } } } }).body;
    expect(html).not.toContain("hidden-secret");
    expect(html).not.toContain("<mark>");
    expect(html).toContain("Confidence: Unavailable");
  });
});
