<!-- Copyright (c) 2026 Apple Inc. Licensed under MIT License. -->
<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  import { type CameraController, type DatasetBounds } from "./cameraController.js";
  import type { Point } from "../utils.js";

  interface Props {
    controller: CameraController;
    x: Float32Array<ArrayBuffer>;
    y: Float32Array<ArrayBuffer>;
    bounds: DatasetBounds;
    width?: number;
    height?: number;
    maxPreviewPoints?: number;
  }

  let { controller, x, y, bounds, width = 210, height = 150, maxPreviewPoints = 3000 }: Props = $props();
  let element: SVGSVGElement | null = $state(null);
  let revision = $state(0);
  let dragging = false;
  let unsubscribe: (() => void) | null = null;

  let points = $derived.by(() => {
    revision;
    bounds;
    const count = Math.min(x.length, y.length);
    if (count === 0) return [] as Point[];
    const stride = Math.max(1, Math.ceil(count / Math.max(maxPreviewPoints, 1)));
    const result: Point[] = [];
    for (let index = 0; index < count; index += stride) {
      const point = controller.worldToMinimap({ x: x[index], y: y[index] });
      result.push({ x: point.x * width, y: point.y * height });
    }
    return result;
  });

  let viewportRect = $derived.by(() => {
    revision;
    const view = controller.getViewBounds();
    const topLeft = controller.worldToMinimap({ x: view.xMin, y: view.yMax });
    const bottomRight = controller.worldToMinimap({ x: view.xMax, y: view.yMin });
    return {
      x: topLeft.x * width,
      y: topLeft.y * height,
      width: Math.max((bottomRight.x - topLeft.x) * width, 2),
      height: Math.max((bottomRight.y - topLeft.y) * height, 2),
    };
  });

  function localPoint(event: PointerEvent): Point {
    const rect = element?.getBoundingClientRect() ?? { left: 0, top: 0, width, height };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  function moveCamera(event: PointerEvent) {
    controller.cancel();
    const point = controller.minimapToWorld(localPoint(event));
    controller.setCenter(point.x, point.y);
  }

  function onPointerDown(event: PointerEvent) {
    event.preventDefault();
    dragging = true;
    element?.setPointerCapture(event.pointerId);
    moveCamera(event);
  }

  function onPointerMove(event: PointerEvent) {
    if (dragging) moveCamera(event);
  }

  function onPointerUp(event: PointerEvent) {
    dragging = false;
    if (element?.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
  }

  onMount(() => {
    unsubscribe = controller.subscribe(() => (revision += 1));
  });

  onDestroy(() => unsubscribe?.());
</script>

<div class="minimap" aria-label="Embedding map overview">
  <svg
    bind:this={element}
    width={width}
    height={height}
    viewBox="0 0 {width} {height}"
    role="application"
    aria-label="Minimap. Click or drag to move the main viewport."
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <rect width={width} height={height} class="background" />
    {#each points as point}
      <circle cx={point.x} cy={point.y} r="1.25" class="point" />
    {/each}
    <rect
      x={viewportRect.x}
      y={viewportRect.y}
      width={viewportRect.width}
      height={viewportRect.height}
      class="viewport"
    />
  </svg>
</div>

<style>
  .minimap {
    position: absolute;
    z-index: 3;
    right: 16px;
    bottom: 16px;
    overflow: hidden;
    border: 1px solid rgb(100 116 139 / 0.5);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgb(15 23 42 / 0.2);
    background: rgb(255 255 255 / 0.92);
  }
  svg {
    display: block;
    touch-action: none;
    cursor: grab;
  }
  svg:active {
    cursor: grabbing;
  }
  .background {
    fill: #f8fafc;
  }
  .point {
    fill: #64748b;
    fill-opacity: 0.68;
  }
  .viewport {
    fill: rgb(14 165 233 / 0.16);
    stroke: #0284c7;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }
  @media (prefers-color-scheme: dark) {
    .minimap {
      background: rgb(15 23 42 / 0.92);
    }
    .background {
      fill: #0f172a;
    }
    .point {
      fill: #cbd5e1;
      fill-opacity: 0.45;
    }
  }
</style>
