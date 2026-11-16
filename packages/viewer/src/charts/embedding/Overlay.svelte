<!-- Copyright (c) 2025 Apple Inc. Licensed under MIT License. -->
<script lang="ts">
  import type { DataPoint, OverlayProxy } from "@embedding-atlas/component";
  import { highlightColors } from "./highlight_resolver.js";
  import type { ManualClusterLabel } from "./manual_cluster_labels.js";
  import type { ManualClusterLayer } from "./manual_cluster_layers.js";
  import { placeManualLabels } from "./manual_label_placement.js";

  interface Props {
    nodes?: Array<DataPoint & { highlightKind?: "primary" | "secondary" | "intersection" | "context" }>;
    edges?: { start: DataPoint; end: DataPoint }[];
    clusterLabels?: ManualClusterLabel[];
    clusterPointCoordinates?: { x: number; y: number }[];
    clusterLayers?: ManualClusterLayer[];
    darkMode?: boolean;
    proxy: OverlayProxy;
  }

  let { nodes = [], edges = [], clusterLabels = [], clusterPointCoordinates = [], clusterLayers = [], darkMode = false, proxy }: Props = $props();
  let canvas: HTMLCanvasElement;
  let visibleClusterLabels = $derived(placeManualLabels(clusterLabels, clusterPointCoordinates, proxy));
  let clusterPointCount = $derived(clusterLayers.reduce((count, layer) => count + layer.points.length, 0));

  // Draw all matches without creating one SVG DOM element per result.
  $effect(() => {
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(proxy.width * ratio));
    canvas.height = Math.max(1, Math.round(proxy.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, proxy.width, proxy.height);
    ctx.strokeStyle = highlightColors.primary;
    ctx.beginPath();
    for (const edge of edges) {
      const a = proxy.location(edge.start.x, edge.start.y),
        b = proxy.location(edge.end.x, edge.end.y);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    for (const kind of ["context", "secondary", "primary", "intersection"] as const) {
      ctx.fillStyle = highlightColors[kind];
      ctx.beginPath();
      let count = 0;
      const radius = kind === "context" ? 1.4 : 1.8;
      for (const point of nodes) {
        if ((point.highlightKind ?? "primary") !== kind) continue;
        const p = proxy.location(point.x, point.y);
        if (
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          p.x < -radius ||
          p.y < -radius ||
          p.x > proxy.width + radius ||
          p.y > proxy.height + radius
        )
          continue;
        ctx.moveTo(p.x + radius, p.y);
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        if (++count % 2048 === 0) {
          ctx.fill();
          ctx.beginPath();
        }
      }
      ctx.fill();
    }
    // Selected manual clusters take their own swatch colors even when a search is active.
    const radius = 2.2;
    for (const layer of clusterLayers) {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      let count = 0;
      for (const point of layer.points) {
        const p = proxy.location(point.x, point.y);
        if (
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          p.x < -radius ||
          p.y < -radius ||
          p.x > proxy.width + radius ||
          p.y > proxy.height + radius
        ) continue;
        ctx.moveTo(p.x + radius, p.y);
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        if (++count % 2048 === 0) {
          ctx.fill();
          ctx.beginPath();
        }
      }
      ctx.fill();
    }
  });
</script>

<div class="overlay-root" style:width="{proxy.width}px" style:height="{proxy.height}px">
  <canvas
    bind:this={canvas}
    style:width="{proxy.width}px"
    style:height="{proxy.height}px"
    aria-label="Search highlights: {nodes.length.toLocaleString()} points; selected manual clusters: {clusterPointCount.toLocaleString()} points"
    data-highlight-count={nodes.length}
    data-cluster-highlight-count={clusterPointCount}
  ></canvas>
  <svg class="label-connectors" width={proxy.width} height={proxy.height} aria-hidden="true">
    {#each visibleClusterLabels as label (label.id)}
      <line
        x1={label.anchorX}
        y1={label.anchorY}
        x2={label.screenX}
        y2={label.screenY}
        stroke={label.color}
        stroke-width="1"
        stroke-opacity="0.55"
        stroke-dasharray="2 3"
      ></line>
    {/each}
  </svg>
  {#each visibleClusterLabels as label (label.id)}
    <div
      class="cluster-label"
      class:dark={darkMode}
      style:left="{label.screenX}px"
      style:top="{label.screenY}px"
      style:border-color={label.color}
      title={label.name}
      data-cluster-label-id={label.id}
    >
      <span class="cluster-dot" style:background={label.color}></span>
      <span class="cluster-name">{label.name}</span>
    </div>
  {/each}
</div>

<style>
  .overlay-root {
    position: relative;
    pointer-events: none;
  }
  canvas {
    position: absolute;
    inset: 0;
  }
  .label-connectors {
    position: absolute;
    inset: 0;
  }
  .cluster-label {
    position: absolute;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 5px;
    max-width: 160px;
    padding: 3px 7px;
    transform: translate(-50%, -50%);
    border: 2px solid;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 1px 5px rgba(15, 23, 42, 0.24);
    color: #0f172a;
    font-size: 12px;
    font-weight: 600;
    line-height: 16px;
    white-space: nowrap;
  }
  .cluster-label.dark {
    background: rgba(15, 23, 42, 0.94);
    color: #f8fafc;
  }
  .cluster-dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
  }
  .cluster-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
