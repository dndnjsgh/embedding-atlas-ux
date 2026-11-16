// Licensed under the MIT License. See LICENSE in the project root.

import type { Matrix3 } from "../matrix.js";
import type { Point, Rectangle, ViewportState } from "../utils.js";
import { Viewport } from "../viewport_utils.js";

/** The world-space extent used by the minimap. */
export type DatasetBounds = Rectangle;

export interface CameraTarget {
  x: number;
  y: number;
  /** Viewport scale. Larger values zoom in. */
  zoom: number;
}

export interface GuidedTourStep extends CameraTarget {
  title: string;
  description?: string;
  duration?: number;
}

export interface CameraControllerOptions {
  viewport: ViewportState;
  width: number;
  height: number;
  bounds: DatasetBounds;
}

type ViewportListener = (viewport: ViewportState) => void;

const EPSILON = 1e-9;

function sameViewport(a: ViewportState, b: ViewportState): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON && Math.abs(a.scale - b.scale) < EPSILON;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cubicInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * A framework-agnostic camera manager for an Embedding Atlas viewport.
 *
 * It owns no GPU resources. Consumers subscribe to state changes and pass the
 * resulting ViewportState to the renderer, which keeps it safe to use with
 * controlled Svelte props as well as a standalone canvas.
 */
export class CameraController {
  private state: ViewportState;
  private width: number;
  private height: number;
  private bounds: DatasetBounds;
  private viewport: Viewport;
  private listeners = new Set<ViewportListener>();
  private frame: number | null = null;
  private resolveAnimation: ((completed: boolean) => void) | null = null;

  constructor({ viewport, width, height, bounds }: CameraControllerOptions) {
    this.state = { ...viewport };
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);
    this.bounds = { ...bounds };
    this.viewport = new Viewport(this.state, this.width, this.height);
  }

  get current(): Readonly<ViewportState> {
    return this.state;
  }

  get isAnimating(): boolean {
    return this.frame != null;
  }

  get datasetBounds(): Readonly<DatasetBounds> {
    return this.bounds;
  }

  subscribe(listener: ViewportListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Synchronize a controlled viewport, canvas size, or dataset extent. */
  update(options: Partial<CameraControllerOptions>): void {
    let changed = false;
    if (options.width != null) {
      const width = Math.max(options.width, 1);
      if (width !== this.width) {
        this.width = width;
        changed = true;
      }
    }
    if (options.height != null) {
      const height = Math.max(options.height, 1);
      if (height !== this.height) {
        this.height = height;
        changed = true;
      }
    }
    if (options.bounds != null) {
      const bounds = options.bounds;
      if (
        bounds.xMin !== this.bounds.xMin ||
        bounds.xMax !== this.bounds.xMax ||
        bounds.yMin !== this.bounds.yMin ||
        bounds.yMax !== this.bounds.yMax
      ) {
        this.bounds = { ...bounds };
        changed = true;
      }
    }
    if (options.viewport != null && !sameViewport(this.state, options.viewport)) {
      this.cancel();
      this.state = { ...options.viewport };
      changed = true;
    }
    this.updateMatrix();
    if (changed) this.emit();
  }

  /** Update the camera immediately. This cancels any active fly-to. */
  setViewport(viewport: ViewportState): void {
    if (sameViewport(this.state, viewport)) return;
    this.cancel();
    this.state = { ...viewport, scale: Math.max(viewport.scale, EPSILON) };
    this.updateMatrix();
    this.emit();
  }

  setCenter(x: number, y: number): void {
    this.setViewport({ ...this.state, x, y });
  }

  /** Return the matrix consumed by the WebGPU point and density programs. */
  updateMatrix(): Matrix3 {
    this.viewport.update(this.state, this.width, this.height);
    return this.viewport.matrix();
  }

  /** World-space axis-aligned bounds currently visible in the main canvas. */
  getViewBounds(): Rectangle {
    const a = this.screenToWorld({ x: 0, y: 0 });
    const b = this.screenToWorld({ x: this.width, y: this.height });
    return {
      xMin: Math.min(a.x, b.x),
      yMin: Math.min(a.y, b.y),
      xMax: Math.max(a.x, b.x),
      yMax: Math.max(a.y, b.y),
    };
  }

  screenToWorld(point: Point): Point {
    return this.viewport.coordinateAtPixel(point.x, point.y);
  }

  worldToScreen(point: Point): Point {
    return this.viewport.pixelLocation(point.x, point.y);
  }

  /** Convert a world coordinate to a normalized minimap coordinate in [0, 1]. */
  worldToMinimap(point: Point): Point {
    const width = Math.max(this.bounds.xMax - this.bounds.xMin, EPSILON);
    const height = Math.max(this.bounds.yMax - this.bounds.yMin, EPSILON);
    return {
      x: clamp((point.x - this.bounds.xMin) / width, 0, 1),
      y: clamp((this.bounds.yMax - point.y) / height, 0, 1),
    };
  }

  /** Convert a normalized minimap coordinate in [0, 1] back to world space. */
  minimapToWorld(point: Point): Point {
    return {
      x: this.bounds.xMin + clamp(point.x, 0, 1) * (this.bounds.xMax - this.bounds.xMin),
      y: this.bounds.yMax - clamp(point.y, 0, 1) * (this.bounds.yMax - this.bounds.yMin),
    };
  }

  /**
   * Animate camera position and logarithmic zoom using a cubic ease-in-out curve.
   * Resolves false when cancelled by user input or another camera update.
   */
  flyTo(target: CameraTarget, duration = 1200): Promise<boolean> {
    this.cancel();
    const start = { ...this.state };
    const end = { ...target, scale: Math.max(target.zoom, EPSILON) };
    const startScale = Math.log(Math.max(start.scale, EPSILON));
    const endScale = Math.log(end.scale);
    const startedAt = performance.now();

    return new Promise<boolean>((resolve) => {
      this.resolveAnimation = resolve;
      const tick = (now: number) => {
        const progress = duration <= 0 ? 1 : clamp((now - startedAt) / duration, 0, 1);
        const t = cubicInOut(progress);
        this.state = {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
          scale: Math.exp(startScale + (endScale - startScale) * t),
        };
        this.updateMatrix();
        this.emit();
        if (progress < 1) {
          this.frame = requestAnimationFrame(tick);
          return;
        }
        this.frame = null;
        this.resolveAnimation = null;
        resolve(true);
      };
      this.frame = requestAnimationFrame(tick);
    });
  }

  cancel(): void {
    if (this.frame != null) cancelAnimationFrame(this.frame);
    this.frame = null;
    const resolve = this.resolveAnimation;
    this.resolveAnimation = null;
    resolve?.(false);
  }

  destroy(): void {
    this.cancel();
    this.listeners.clear();
  }

  private emit(): void {
    const state = { ...this.state };
    for (const listener of this.listeners) listener(state);
  }
}
