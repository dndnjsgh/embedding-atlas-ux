// Copyright (c) 2025 Apple Inc. Licensed under MIT License.

import type { GuidedTourStep } from "./cameraController.js";

export interface GuidedTourConfig {
  /** Defaults to true when the object form is supplied. */
  enabled?: boolean | null;
  /** Ordered camera destinations. If omitted, useful relative defaults are generated from the data extent. */
  steps?: GuidedTourStep[] | null;
  /** Animation duration in milliseconds for steps without their own duration. */
  duration?: number | null;
  /** Delay in milliseconds before the first camera movement. */
  startDelay?: number | null;
}

export interface MinimapConfig {
  /** Defaults to true when the object form is supplied. */
  enabled?: boolean | null;
  width?: number | null;
  height?: number | null;
  /** Maximum number of representative points drawn in the minimap. */
  maxPreviewPoints?: number | null;
}

export interface HighlightPoint {
  x: number;
  y: number;
  /** The visual role is intentionally coordinate-only so the base component stays data-source agnostic. */
  kind: "primary" | "secondary" | "intersection" | "context";
}

export interface HighlightConfig {
  /** Dims non-matching points while preserving the full embedding distribution. */
  backgroundOpacity?: number | null;
  /** Coordinate markers also rendered in the minimap. */
  points?: HighlightPoint[] | null;
}

export interface HoverSelectionConfig {
  /** Smallest hit radius in CSS pixels in dense overview states. Default: 6. */
  minRadius?: number | null;
  /** Largest hit radius in CSS pixels in sparse or zoomed-in states. Default: 18. */
  maxRadius?: number | null;
  /** Density, in points per CSS-pixel squared, that starts tightening the hit radius. Default: 0.25. */
  densityReference?: number | null;
  /** Multiplier used to keep the current tooltip stable while the pointer remains nearby. Default: 1.35. */
  retentionMultiplier?: number | null;
}

export interface EmbeddingViewConfig {
  /**
   * Show an onboarding camera tour on mount. Use an object with `steps` to
   * supply dataset-specific cluster coordinates; `true` uses relative defaults.
   * Disabled unless explicitly enabled.
   */
  guidedTour?: boolean | GuidedTourConfig | null;

  /** Show a clickable and draggable overview map. Disabled unless explicitly enabled. */
  minimap?: boolean | MinimapConfig | null;

  /** Search-result highlight presentation supplied by a host application. */
  highlight?: HighlightConfig | null;

  /** Adaptive point hit testing and tooltip retention behavior. */
  hoverSelection?: HoverSelectionConfig | null;

  /** Color scheme. */
  colorScheme?: "light" | "dark" | null;

  /** View mode. */
  mode?: "points" | "density" | null;

  /** Minimum average density for density contours to show up.
   * The density is measured as number of points per square points (aka., px in CSS units). */
  minimumDensity?: number | null;

  /** Override the automatically calculated point size.
   * If not specified, point size is calculated based on density. */
  pointSize?: number | null;

  /** Generate labels automatically.
   * By default labels are generated automatically if the `labels` prop is not specified,
   * and a `text` column is specified in the Mosaic view,
   * or a `queryClusterLabels` callback is specified in the non-Mosaic view.
   * Set this to `false` to disable automatic labels. */
  autoLabelEnabled?: boolean | null;

  /** The density threshold to filter the clusters before generating automatic labels.
   * The value is relative to the max density. */
  autoLabelDensityThreshold?: number | null;

  /** The stop words for automatic label generation. By default use NLTK stop words. */
  autoLabelStopWords?: string[] | null;

  /** Approximate maximum number of points to render when downsampling is active.
   * Points are sampled with bias toward sparse regions (fewer points kept in dense areas).
   * The sampling probability is given by this formula:
   * P(i) = (downsampleMaxPoints / numPointsInViewport) * (2 / (1 + density(p_i) / maxDensity * downsampleDensityWeight))
   * Default: 4,000,000. Set to null or Infinity to disable downsampling. */
  downsampleMaxPoints?: number | null;

  /** Density weight for downsampling (0-10).
   * Higher values mean more aggressive culling in dense areas.
   * Default: 5 */
  downsampleDensityWeight?: number | null;
}
