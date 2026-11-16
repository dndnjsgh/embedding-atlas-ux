<!-- Copyright (c) 2025 Apple Inc. Licensed under MIT License. -->
<script lang="ts">
  import { onMount } from "svelte";

  import type { DataPoint, Rectangle, ViewportState } from "../lib/index.js";
  import { generateSampleDataset } from "./sample_datasets.js";
  import EmbeddingView from "../lib/embedding_view/EmbeddingView.svelte";

  const numPoints = 2000000;
  const categoryInfo = [
    { name: "Research", color: "#2563eb", count: 666667 },
    { name: "Products", color: "#f97316", count: 666667 },
    { name: "Support", color: "#16a34a", count: 666666 },
  ];

  const dataset = generateSampleDataset({ numPoints, numCategories: 3, numSubClusters: 32 });
  const data = {
    x: new Float32Array(dataset.map((row) => row.x)),
    y: new Float32Array(dataset.map((row) => row.y)),
    category: new Uint8Array(dataset.map((row) => row.category)),
  };
  const previewRows = dataset.slice(0, 30);

  let tooltip: DataPoint | null = $state.raw(null);
  let selection: DataPoint[] | null = $state.raw([]);
  let rangeSelection: Rectangle | null = $state.raw(null);
  let viewportState: ViewportState | null = $state.raw(null);
  let mode: "points" | "density" = $state.raw("density");
  let minimumDensity = $state.raw(1 / 16);
  let activeCategory: number | null = $state.raw(null);
  let searchQuery = $state("");
  let chartFrame: HTMLDivElement | null = $state(null);
  let chartWidth = $state(940);
  let chartHeight = $state(520);
  let tourVersion = $state(0);

  let categoryColors = $derived(
    categoryInfo.map((category, index) =>
      activeCategory == null || activeCategory === index ? category.color : "#cbd5e1",
    ),
  );
  let visibleRows = $derived(
    previewRows
      .filter((row) => activeCategory == null || row.category === activeCategory)
      .filter((row) => row.text.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      .slice(0, 6),
  );
  let selectedCount = $derived(selection?.length ?? 0);

  async function querySelection(x: number, y: number, unitDistance: number): Promise<DataPoint | null> {
    let minDistance2: number | null = null;
    let minIndex: number | null = null;
    for (let index = 0; index < data.x.length; index++) {
      const distance2 = (data.x[index] - x) ** 2 + (data.y[index] - y) ** 2;
      if (minDistance2 == null || distance2 < minDistance2) {
        minDistance2 = distance2;
        minIndex = index;
      }
    }
    if (minIndex == null || minDistance2 == null || Math.sqrt(minDistance2) > unitDistance * 10) return null;
    return {
      x: data.x[minIndex],
      y: data.y[minIndex],
      category: data.category[minIndex],
      text: dataset[minIndex].text,
      fields: {},
    };
  }

  async function queryClusterLabels(clusters: Rectangle[][]): Promise<(string | null)[]> {
    return clusters.map(() => "label");
  }

  function selectCategory(index: number) {
    activeCategory = activeCategory === index ? null : index;
  }

  onMount(() => {
    if (!chartFrame) return;
    const resize = () => {
      const rect = chartFrame?.getBoundingClientRect();
      if (!rect) return;
      chartWidth = Math.max(360, Math.floor(rect.width));
      chartHeight = Math.max(280, Math.floor(rect.height));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(chartFrame);
    resize();
    return () => observer.disconnect();
  });
</script>

<main class="dashboard">
  <header class="toolbar">
    <div class="toolbar-group">
      <span class="eyebrow">Embedding Atlas</span>
      <strong>Customer knowledge map</strong>
      <span class="muted">{numPoints.toLocaleString()} points</span>
    </div>
    <div class="toolbar-group controls">
      <label
        >View <select bind:value={mode} aria-label="Embedding render mode"
          ><option value="density">Density</option><option value="points">Points</option></select
        ></label
      >
      <label
        >Density <input
          type="range"
          bind:value={minimumDensity}
          min={0.01}
          max={0.2}
          step={0.005}
          aria-label="Minimum density"
        /></label
      >
      <button type="button" class="secondary" onclick={() => (tourVersion += 1)}>Replay tour</button>
    </div>
  </header>

  <section class="workspace">
    <section class="map-panel" aria-label="Embedding map">
      <div class="map-header">
        <div>
          <span class="section-label">Color</span><strong
            >{activeCategory == null ? "All categories" : categoryInfo[activeCategory].name}</strong
          >
        </div>
        <div class="map-help">Scroll to zoom · Drag to pan · Click a point to inspect</div>
      </div>
      <div class="map-frame" bind:this={chartFrame}>
        {#key tourVersion}
          <EmbeddingView
            data={data}
            width={chartWidth}
            height={chartHeight}
            categoryColors={categoryColors}
            config={{
              mode,
              minimumDensity,
              downsampleMaxPoints: numPoints,
              autoLabelEnabled: false,
              guidedTour: { startDelay: 500, duration: 1000 },
              minimap: { width: 168, height: 116, maxPreviewPoints: 1800 },
            }}
            tooltip={tooltip}
            onTooltip={(value) => (tooltip = value)}
            selection={selection}
            onSelection={(value) => (selection = value)}
            rangeSelection={rangeSelection}
            onRangeSelection={(value) => (rangeSelection = value as Rectangle | null)}
            viewportState={viewportState}
            onViewportState={(value) => (viewportState = value)}
            queryClusterLabels={queryClusterLabels}
            querySelection={querySelection}
          />
        {/key}
      </div>
    </section>

    <aside class="insights-panel" aria-label="Filters and distribution charts">
      <section class="panel-block">
        <label class="search-label" for="point-search">Search metadata</label><input
          id="point-search"
          bind:value={searchQuery}
          placeholder="Search sample points"
        />
      </section>
      <section class="panel-block">
        <div class="panel-title"><span>Categories</span><span class="muted">{selectedCount} selected</span></div>
        <div class="legend-list">
          {#each categoryInfo as category, index}
            <button class:active={activeCategory === index} type="button" onclick={() => selectCategory(index)}
              ><i style:background={category.color}></i><span>{category.name}</span><small
                >{category.count.toLocaleString()}</small
              ></button
            >
          {/each}
        </div>
      </section>
      <section class="panel-block chart-block">
        <div class="panel-title"><span>Similarity distribution</span><span class="muted">Score</span></div>
        <div class="histogram" aria-label="Similarity distribution chart">
          {#each [28, 42, 58, 76, 92, 82, 64, 44, 25, 14] as height}<span style:height="{height}%"></span>{/each}
        </div>
        <div class="axis"><span>Low</span><span>High</span></div>
      </section>
      <section class="panel-block chart-block">
        <div class="panel-title"><span>Points by category</span><span class="muted">Count</span></div>
        <div class="bar-chart">
          {#each categoryInfo as category}<div class="bar-row">
              <span>{category.name}</span>
              <div><i style:width="{(category.count / 666667) * 100}%;background={category.color}"></i></div>
            </div>{/each}
        </div>
      </section>
    </aside>
  </section>

  <section class="records-panel" aria-label="Metadata records">
    <div class="records-header">
      <div><span class="section-label">Metadata</span><strong>Representative points</strong></div>
      <span class="muted">Showing {visibleRows.length} sample records</span>
    </div>
    <div class="record-grid">
      {#each visibleRows as row}
        <button
          type="button"
          class="record"
          onclick={() => {
            selection = [{ x: row.x, y: row.y, category: row.category, text: row.text, fields: {} }];
            tooltip = selection[0];
          }}
        >
          <span class="record-category" style:color={categoryInfo[row.category].color}
            >{categoryInfo[row.category].name}</span
          ><strong>{row.text}</strong><span class="record-meta"
            >Point #{row.identifier.toLocaleString()} · cluster {row.category + 1}</span
          >
        </button>
      {:else}<p class="empty-state">No sample records match this search.</p>{/each}
    </div>
  </section>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    background: #e8edf5;
    color: #172033;
  }
  .dashboard {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) minmax(190px, 0.38fr);
    gap: 8px;
    height: calc(100vh - 48px);
    min-height: 680px;
    padding: 56px 8px 8px;
    font:
      13px/1.4 system-ui,
      sans-serif;
  }
  .toolbar,
  .map-panel,
  .insights-panel,
  .records-panel {
    background: #fff;
    border: 1px solid #dbe3ef;
    border-radius: 9px;
    box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 54px;
    padding: 9px 14px;
  }
  .toolbar-group,
  .controls,
  .map-header,
  .records-header,
  .panel-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .toolbar strong,
  .map-header strong,
  .records-header strong {
    font-size: 14px;
  }
  .eyebrow,
  .section-label {
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .muted {
    color: #8190a8;
    font-size: 12px;
  }
  .controls {
    margin-left: auto;
  }
  .controls label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #536176;
    font-weight: 600;
  }
  select,
  input {
    color: #26334a;
    background: #fff;
    border: 1px solid #ccd7e5;
    border-radius: 6px;
    font: inherit;
  }
  select {
    min-height: 30px;
    padding: 0 8px;
  }
  input[type="range"] {
    accent-color: #2563eb;
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  .secondary {
    min-height: 30px;
    padding: 0 10px;
    color: #1d4ed8;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    font-weight: 700;
  }
  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 310px;
    gap: 8px;
    min-height: 0;
  }
  .map-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-width: 0;
    overflow: hidden;
  }
  .map-header {
    justify-content: space-between;
    min-height: 48px;
    padding: 8px 14px;
    border-bottom: 1px solid #e5ebf3;
  }
  .map-header > div:first-child,
  .records-header > div {
    display: grid;
    gap: 1px;
  }
  .map-help {
    color: #8895a9;
    font-size: 12px;
  }
  .map-frame {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: #fcfdff;
  }
  .insights-panel {
    min-height: 0;
    padding: 8px;
    overflow: auto;
  }
  .panel-block {
    padding: 11px 8px 14px;
    border-bottom: 1px solid #e5ebf3;
  }
  .panel-block:last-child {
    border-bottom: 0;
  }
  .search-label {
    display: block;
    margin-bottom: 6px;
    color: #536176;
    font-size: 12px;
    font-weight: 700;
  }
  .search-label + input {
    width: 100%;
    min-height: 34px;
    padding: 0 9px;
  }
  .panel-title {
    justify-content: space-between;
    margin-bottom: 10px;
    color: #25324a;
    font-size: 13px;
    font-weight: 750;
  }
  .legend-list {
    display: grid;
    gap: 3px;
  }
  .legend-list button {
    display: grid;
    grid-template-columns: 13px 1fr auto;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px;
    color: #40506a;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
  }
  .legend-list button:hover,
  .legend-list button.active {
    background: #f0f7ff;
    border-color: #bfdbfe;
  }
  .legend-list i {
    width: 11px;
    height: 11px;
    border-radius: 50%;
  }
  .legend-list small {
    color: #8b99ad;
  }
  .histogram {
    display: flex;
    align-items: end;
    gap: 5px;
    height: 96px;
    padding: 8px;
    border-bottom: 1px solid #cbd5e1;
    background: repeating-linear-gradient(to bottom, #f8fafc 0, #f8fafc 23px, #e8edf5 24px);
  }
  .histogram span {
    flex: 1;
    min-width: 6px;
    background: #5b7ee5;
    border-radius: 2px 2px 0 0;
  }
  .axis {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    color: #94a3b8;
    font-size: 11px;
  }
  .bar-chart {
    display: grid;
    gap: 10px;
  }
  .bar-row {
    display: grid;
    grid-template-columns: 62px 1fr;
    align-items: center;
    gap: 8px;
    color: #66758b;
    font-size: 11px;
  }
  .bar-row > div {
    height: 12px;
    overflow: hidden;
    background: #edf2f7;
    border-radius: 3px;
  }
  .bar-row i {
    display: block;
    height: 100%;
    border-radius: inherit;
  }
  .records-panel {
    min-height: 0;
    padding: 10px;
    overflow: hidden;
  }
  .records-header {
    justify-content: space-between;
    margin: 0 4px 9px;
  }
  .record-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    height: calc(100% - 43px);
    overflow: auto;
  }
  .record {
    display: grid;
    align-content: start;
    gap: 6px;
    min-height: 112px;
    padding: 11px;
    overflow: hidden;
    color: #34435b;
    text-align: left;
    background: #fff;
    border: 1px solid #dce5f0;
    border-radius: 7px;
  }
  .record:hover {
    border-color: #93c5fd;
    box-shadow: 0 2px 8px rgb(37 99 235 / 0.1);
  }
  .record strong {
    color: #172033;
    font-size: 13px;
    line-height: 1.35;
  }
  .record-category {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .record-meta {
    color: #8b99ad;
    font-size: 11px;
  }
  .empty-state {
    grid-column: 1 / -1;
    margin: 18px;
    color: #64748b;
  }
  @media (max-width: 900px) {
    .dashboard {
      height: auto;
      min-height: calc(100vh - 48px);
    }
    .workspace {
      grid-template-columns: 1fr;
    }
    .map-panel {
      min-height: 480px;
    }
    .insights-panel {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
    }
    .records-panel {
      min-height: 260px;
    }
  }
  @media (max-width: 640px) {
    .dashboard {
      padding: 56px 4px 4px;
    }
    .toolbar,
    .map-header {
      align-items: flex-start;
      flex-direction: column;
    }
    .controls {
      width: 100%;
      margin-left: 0;
      flex-wrap: wrap;
    }
    .map-help {
      display: none;
    }
    .insights-panel {
      grid-template-columns: 1fr;
    }
    .record-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
