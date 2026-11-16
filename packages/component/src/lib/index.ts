// Copyright (c) 2025 Apple Inc. Licensed under MIT License.

export {
  EmbeddingView,
  EmbeddingViewMosaic,
  maxDensityModeCategories,
  type EmbeddingViewMosaicProps,
  type EmbeddingViewProps,
} from "./embedding_view/api.js";

export { defaultCategoryColors } from "./colors.js";

export type {
  EmbeddingViewConfig,
  GuidedTourConfig,
  HighlightConfig,
  HighlightPoint,
  HoverSelectionConfig,
  MinimapConfig,
} from "./embedding_view/embedding_view_config.js";
export { adaptiveHoverRadius, type AdaptiveHoverRadiusOptions } from "./embedding_view/adaptive_hover.js";
export { CameraController } from "./embedding_view/cameraController.js";
export type {
  CameraControllerOptions,
  CameraTarget,
  DatasetBounds,
  GuidedTourStep,
} from "./embedding_view/cameraController.js";
export type { EmbeddingViewTheme } from "./embedding_view/theme.js";
export type {
  CustomComponent,
  DataField,
  DataPoint,
  DataPointID,
  Label,
  LabelContent,
  OverlayProxy,
} from "./embedding_view/types.js";
export type { Point, Rectangle, ViewportState } from "./utils.js";
