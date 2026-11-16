import type { SearchResultItem } from "./search.js";

export type ConfidenceLevel = "high" | "medium" | "low" | "unavailable";
export interface SearchScoreConfig {
  metric: "cosine-distance" | "cosine-similarity" | "euclidean";
  /** Thresholds must be validated for this provider/model/dataset. Scores are not probabilities. */
  calibration?: { high: number; medium: number; label: string };
}
export interface SearchEvidence {
  field: string;
  start: number;
  end: number;
  before: string;
  match: string;
  after: string;
}
export interface SearchMatch {
  type: "exact" | "partial" | "semantic" | "filter" | "index" | "raw";
  evidence: SearchEvidence[];
  predicate: string | null;
  similarity?: number;
  distance?: number;
  metric?: SearchScoreConfig["metric"];
  confidence: ConfidenceLevel;
  explanation: string;
  confidenceExplanation: string;
}

function ranges(text: string, query: string): Array<[number, number]> {
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found: Array<[number, number]> = [];
  for (const m of text.matchAll(new RegExp(escaped, "giu"))) {
    found.push([m.index!, m.index! + m[0].length]);
    if (found.length >= 20) break;
  }
  return found;
}

export function extractTextEvidence(query: string, fields: Record<string, unknown>, field?: string) {
  const text = field ? fields[field] : undefined;
  if (typeof text !== "string" || !field || !query.trim()) return { exact: false, evidence: [] as SearchEvidence[] };
  const whole = ranges(text, query.trim());
  const found = whole.length
    ? whole
    : query
        .trim()
        .split(/\s+/u)
        .flatMap((term) => ranges(text, term));
  const merged: Array<[number, number]> = [];
  for (const [start, end] of found.sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return {
    exact: whole.length > 0,
    evidence: merged.slice(0, 5).map(([start, end]) => ({
      field,
      start,
      end,
      before: (start > 65 ? "…" : "") + text.slice(Math.max(0, start - 65), start),
      match: text.slice(start, end),
      after: text.slice(end, end + 100) + (end + 100 < text.length ? "…" : ""),
    })),
  };
}

export function scoreConfidence(
  value: number | undefined,
  config?: SearchScoreConfig,
): Pick<SearchMatch, "similarity" | "confidence" | "confidenceExplanation"> {
  const unavailable = {
    confidence: "unavailable" as const,
    confidenceExplanation:
      "Confidence is unavailable: this score has no validated calibration. Similarity is not a probability of correctness.",
  };
  if (value == null || !Number.isFinite(value) || !config) return unavailable;
  let similarity: number | undefined;
  if (config.metric === "cosine-distance" && value >= 0 && value <= 2) similarity = 1 - value;
  if (config.metric === "cosine-similarity" && value >= -1 && value <= 1) similarity = value;
  if (config.metric === "euclidean") return unavailable;
  if (similarity == null) return unavailable;
  const c = config.calibration;
  if (
    !c ||
    !c.label.trim() ||
    !Number.isFinite(c.high) ||
    !Number.isFinite(c.medium) ||
    c.high <= c.medium ||
    c.high > 1 ||
    c.medium < -1
  )
    return { ...unavailable, similarity };
  return {
    similarity,
    confidence: similarity >= c.high ? "high" : similarity >= c.medium ? "medium" : "low",
    confidenceExplanation: `Relevance rating using ${c.label} (high ≥ ${c.high}, medium ≥ ${c.medium}). This is not a measured accuracy or probability.`,
  };
}

export function enrichSearchResults(
  items: SearchResultItem[],
  options: { query: string; mode: string; field?: string; predicate: string | null; scoreConfig?: SearchScoreConfig },
): SearchResultItem[] {
  return items.map((item) => {
    const lexical = extractTextEvidence(options.query, item.fields, options.field);
    const type: SearchMatch["type"] =
      options.mode === "vector"
        ? "semantic"
        : options.mode === "full-text"
          ? lexical.exact
            ? "exact"
            : lexical.evidence.length
              ? "partial"
              : "index"
          : options.mode === "filter"
            ? "filter"
            : "raw";
    const explanation = {
      exact:
        "The complete query occurs in the searched field (case-insensitive). This confirms text occurrence, not relevance.",
      partial: "Some query terms occur in the searched field. Review the original text for relevance.",
      semantic: "Returned by vector search. Any marked words are literal overlaps, not proof of the semantic match.",
      index: "Returned by the text index, but no literal query span was found in the searched field.",
      filter: "Matches the applied filter conditions.",
      raw: "Supplied result set. No text or semantic match is inferred.",
    }[type];
    const score = scoreConfidence(type === "semantic" ? item.distance : undefined, options.scoreConfig);
    if (type !== "semantic")
      score.confidenceExplanation =
        "Literal text evidence and filter conditions can be checked below. Relevance confidence has not been evaluated for this result.";
    return {
      ...item,
      match: {
        ...score,
        type,
        explanation,
        evidence: type === "raw" || type === "filter" ? [] : lexical.evidence,
        predicate: options.predicate,
        distance: Number.isFinite(item.distance) ? item.distance : undefined,
        metric: options.mode === "vector" ? options.scoreConfig?.metric : undefined,
      },
    };
  });
}

export type SearchSort = "rank" | "exact" | "similarity" | "confidence";
export function sortSearchResults(items: SearchResultItem[], sort: SearchSort) {
  const levels = { high: 3, medium: 2, low: 1, unavailable: 0 };
  const score = (item: SearchResultItem) =>
    sort === "exact"
      ? Number(item.match?.type === "exact")
      : sort === "similarity"
        ? (item.match?.similarity ?? -Infinity)
        : levels[item.match?.confidence ?? "unavailable"];
  return sort === "rank" ? items : [...items].sort((a, b) => score(b) - score(a));
}
