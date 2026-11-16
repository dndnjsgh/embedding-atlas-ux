// Copyright (c) 2026 Apple Inc. Licensed under MIT License.

import type { RowID } from "../chart.js";
import type { HighlightMode } from "../../stores/embedding_highlight_store.js";

export type HighlightKind = "primary" | "secondary" | "intersection" | "context";

/** Shared by the renderer and the search legend to prevent color drift. */
export const highlightColors = {
  primary: "#f97316",
  secondary: "#3b82f6",
  intersection: "#a855f7",
  context: "#eab308",
} as const;

export function resolveHighlightKinds({
  mode,
  primaryIds,
  secondaryIds,
  contextIds = [],
}: {
  mode: HighlightMode;
  primaryIds: RowID[];
  secondaryIds: RowID[];
  contextIds?: Iterable<RowID>;
}): Map<RowID, HighlightKind> {
  const primary = new Set(primaryIds);
  const secondary = new Set(secondaryIds);
  const context = new Set(contextIds);
  const result = new Map<RowID, HighlightKind>();

  for (const id of primary) {
    result.set(id, mode == "compare" && secondary.has(id) ? "intersection" : "primary");
  }
  if (mode == "compare") {
    for (const id of secondary) {
      if (!primary.has(id)) result.set(id, "secondary");
    }
  }
  if (mode == "context") {
    for (const id of context) {
      if (!primary.has(id)) result.set(id, "context");
    }
  }
  return result;
}
