// Copyright (c) 2026 Apple Inc. Licensed under MIT License.

export interface AdaptiveHoverRadiusOptions {
  scale: number;
  maxDensity: number;
  width: number;
  height: number;
  minRadius?: number;
  maxRadius?: number;
  densityReference?: number;
}

/**
 * Resolve a CSS-pixel hit radius from the current zoom and the estimated peak
 * density. Dense overview states use a tight radius to avoid selecting an
 * adjacent point; sparse/zoomed-in states use a wider radius for easier aiming.
 */
export function adaptiveHoverRadius(options: AdaptiveHoverRadiusOptions): number {
  const minRadius = Math.max(1, options.minRadius ?? 6);
  const maxRadius = Math.max(minRadius, options.maxRadius ?? 18);
  const densityReference = Math.max(1e-6, options.densityReference ?? 0.25);
  const viewDimension = Math.max(1, options.width, options.height);
  const scale = Math.max(1e-6, Math.abs(options.scale));
  const density = Math.max(0, options.maxDensity) / (scale * scale * viewDimension * viewDimension);
  const densityFactor = Math.min(1, Math.log1p(density / densityReference) / Math.log(5));
  return maxRadius - (maxRadius - minRadius) * densityFactor;
}
