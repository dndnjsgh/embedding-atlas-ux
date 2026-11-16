// Licensed under the MIT License. See LICENSE in the project root.

import { writable, type Writable } from "svelte/store";

import type { RowID } from "../charts/chart.js";

export type HighlightMode = "focus" | "context" | "compare";

export interface EmbeddingHighlightState {
  mode: HighlightMode;
  /** The current search result. This is updated whenever a search completes. */
  primaryIds: RowID[];
  /** A user-pinned result set used only by compare mode. */
  secondaryIds: RowID[];
  primaryLabel: string;
  secondaryLabel: string;
  primaryPredicate: string | null;
  secondaryPredicate: string | null;
  /** Radius as a percentage of the full 2-D dataset bounding-box diagonal. */
  contextRadiusPercent: number;
}

/**
 * Keeps search highlighting independent from chart selection. A chart selection is
 * intentionally transient; a highlight set remains visible while a user changes
 * the viewport, opens a tooltip, or pins a second search for comparison.
 */
export class EmbeddingHighlightStore {
  readonly state: Writable<EmbeddingHighlightState> = writable({
    mode: "focus",
    primaryIds: [],
    secondaryIds: [],
    primaryLabel: "",
    secondaryLabel: "",
    primaryPredicate: null,
    secondaryPredicate: null,
    contextRadiusPercent: 1,
  });

  setMode(mode: HighlightMode) {
    this.state.update((state) => ({ ...state, mode }));
  }

  setPrimary(ids: RowID[], label = "", predicate: string | null = null) {
    this.state.update((state) => ({
      ...state,
      primaryIds: [...new Set(ids)],
      primaryLabel: label,
      primaryPredicate: predicate,
    }));
  }

  setContextRadiusPercent(value: number) {
    if (!Number.isFinite(value)) return;
    this.state.update((state) => ({ ...state, contextRadiusPercent: Math.max(0.05, Math.min(10, value)) }));
  }

  pinCurrentAsComparison() {
    this.state.update((state) =>
      state.primaryIds.length === 0
        ? state
        : {
            ...state,
            secondaryIds: [...state.primaryIds],
            secondaryLabel: state.primaryLabel,
            secondaryPredicate: state.primaryPredicate,
            mode: "compare",
          },
    );
  }

  clearComparison() {
    this.state.update((state) => ({
      ...state,
      secondaryIds: [],
      secondaryLabel: "",
      secondaryPredicate: null,
      mode: "focus",
    }));
  }

  clear() {
    this.state.update((state) => ({
      ...state,
      mode: "focus",
      primaryIds: [],
      secondaryIds: [],
      primaryLabel: "",
      secondaryLabel: "",
      primaryPredicate: null,
      secondaryPredicate: null,
    }));
  }
}
