<!-- Licensed under the MIT License. See LICENSE in the project root. -->
<script lang="ts">
  import * as SQL from "@uwdata/mosaic-sql";

  import Button from "../widgets/Button.svelte";
  import Input from "../widgets/Input.svelte";
  import Select from "../widgets/Select.svelte";
  import PanelContainer from "./PanelContainer.svelte";

  import { IconDownload } from "../assets/icons.js";
  import { getStoreContext } from "../stores/embedding_atlas_store.js";
  import { kMeansPartitions, manualAnalysisCsv, type AnalysisPoint } from "../stores/manual_analysis_store.js";
  import { downloadBuffer } from "../utils/download.js";

  const store = getStoreContext();
  const { chartContext, manualAnalysis } = store;
  const pointSelection = chartContext.highlight;
  const searchHighlightState = chartContext.embeddingHighlight.state;
  const analysisState = manualAnalysis.state;
  const showMapLabels = manualAnalysis.showMapLabels;

  let source = $state<"selection" | "search">("selection");
  let pointTag = $state("");
  let clusterTag = $state("");
  let clusterCount = $state(3);
  let exportFormat = $state<"json" | "csv">("json");
  let status = $state("");
  let busy = $state(false);

  let sourceIds = $derived(source === "selection" ? ($pointSelection ?? []) : $searchHighlightState.primaryIds);
  let selectedClusters = $derived(
    $analysisState.clusters.filter((cluster) => $analysisState.selectedClusterIds.includes(cluster.id)),
  );

  async function queryPoints(ids: any[]): Promise<AnalysisPoint[]> {
    const projection = store.props.data.projection;
    if (projection == null || ids.length === 0) return [];
    const rows = Array.from(
      await store.coordinator.query(
        SQL.Query.from(chartContext.table)
          .select({
            id: SQL.column(chartContext.id),
            x: SQL.sql`${SQL.column(projection.x)}::DOUBLE`,
            y: SQL.sql`${SQL.column(projection.y)}::DOUBLE`,
          })
          .where(
            SQL.isIn(
              SQL.column(chartContext.id),
              ids.map((id) => SQL.literal(id)),
            ),
          ),
      ),
    ) as AnalysisPoint[];
    return rows.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }

  function tagSourcePoints() {
    manualAnalysis.tagPoints(sourceIds, pointTag);
    status =
      pointTag.trim() && sourceIds.length > 0
        ? `Tagged ${sourceIds.length.toLocaleString()} points.`
        : "Select points and enter a tag.";
    if (sourceIds.length > 0) pointTag = "";
  }

  function createManualCluster() {
    if (sourceIds.length === 0) {
      status = "Select points or use search results first.";
      return;
    }
    manualAnalysis.createClusters([sourceIds], "manual");
    status = `Created a cluster with ${sourceIds.length.toLocaleString()} points.`;
  }

  async function generateClusters() {
    if (sourceIds.length < 2) {
      status = "At least two source points are required.";
      return;
    }
    busy = true;
    status = "Reading point coordinates...";
    try {
      const points = await queryPoints(sourceIds);
      const partitions = kMeansPartitions(points, clusterCount);
      manualAnalysis.createClusters(partitions, "automatic");
      status = `Generated ${partitions.length} editable clusters from ${points.length.toLocaleString()} points.`;
    } catch (error: any) {
      status = `Cluster generation failed: ${error?.message ?? error}`;
    } finally {
      busy = false;
    }
  }

  function tagSelectedClusters() {
    if (!clusterTag.trim() || selectedClusters.length === 0) {
      status = "Select clusters and enter a cluster tag.";
      return;
    }
    selectedClusters.forEach((cluster) => manualAnalysis.tagCluster(cluster.id, clusterTag));
    status = `Tagged ${selectedClusters.length} clusters.`;
    clusterTag = "";
  }

  async function splitSelectedCluster() {
    if (selectedClusters.length !== 1) {
      status = "Select exactly one cluster to split.";
      return;
    }
    busy = true;
    try {
      const cluster = selectedClusters[0];
      const points = await queryPoints(cluster.memberIds);
      const partitions = kMeansPartitions(points, 2);
      if (partitions.length < 2) {
        status = "This cluster cannot be split into two non-empty groups.";
        return;
      }
      manualAnalysis.splitCluster(cluster.id, partitions);
      status = `Split ${cluster.name} into two clusters.`;
    } finally {
      busy = false;
    }
  }

  function exportAnalysis() {
    const snapshot = manualAnalysis.snapshot();
    const content =
      exportFormat === "json"
        ? JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...snapshot }, null, 2)
        : manualAnalysisCsv(snapshot);
    downloadBuffer(new TextEncoder().encode(content), `embedding-atlas-analysis.${exportFormat}`);
    status = `Exported ${exportFormat.toUpperCase()} analysis.`;
  }
</script>

<PanelContainer title="Manual analysis" class="p-2 flex flex-col gap-3 overflow-y-auto">
  <section class="flex flex-col gap-2 text-sm">
    <h3 class="font-medium">Analysis source</h3>
    <Select
      value={source}
      onChange={(value) => (source = value as typeof source)}
      options={[
        { value: "selection", label: `Selected points (${$pointSelection?.length ?? 0})` },
        { value: "search", label: `Search results (${$searchHighlightState.primaryIds.length})` },
      ]}
    />
    <div class="text-xs text-slate-500">{sourceIds.length.toLocaleString()} points will be used.</div>
  </section>

  <section class="flex flex-col gap-2 text-sm border-t border-slate-300 dark:border-slate-700 pt-3">
    <h3 class="font-medium">Point tags</h3>
    <div class="flex gap-2">
      <Input
        bind:value={pointTag}
        placeholder="e.g. review, outlier"
        className="flex-1 min-w-0"
        onEnter={tagSourcePoints}
      />
      <Button label="Apply" onClick={tagSourcePoints} disabled={sourceIds.length === 0 || !pointTag.trim()} />
    </div>
    {#if $analysisState.pointTags.length > 0}
      <details>
        <summary>{$analysisState.pointTags.length.toLocaleString()} tagged points</summary>
        <div class="max-h-36 overflow-y-auto flex flex-col gap-1 mt-1">
          {#each $analysisState.pointTags.slice(0, 100) as entry}
            <div class="flex gap-1 flex-wrap items-center">
              <span class="text-slate-500">#{entry.id}</span>
              {#each entry.tags as tag}
                <button
                  class="rounded bg-slate-200 dark:bg-slate-700 px-1"
                  title="Remove tag"
                  onclick={() => manualAnalysis.removePointTag(entry.id, tag)}>{tag} ×</button
                >
              {/each}
            </div>
          {/each}
        </div>
      </details>
    {/if}
  </section>

  <section class="flex flex-col gap-2 text-sm border-t border-slate-300 dark:border-slate-700 pt-3">
    <h3 class="font-medium">Clusters</h3>
    <p class="text-xs text-slate-500 dark:text-slate-400">
      Check clusters to show their points in the dot color. Other points stay faint; uncheck all to restore the normal map.
    </p>
    <label class="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={$showMapLabels}
        onchange={(event) => showMapLabels.set(event.currentTarget.checked)}
      />
      Show cluster names on map
    </label>
    <div class="flex gap-2 items-center">
      <label class="flex items-center gap-1"
        >Count <input
          class="form-input rounded w-16 py-1 bg-white dark:bg-slate-900"
          type="number"
          min="2"
          max="12"
          bind:value={clusterCount}
        /></label
      >
      <Button label="Auto-generate" onClick={generateClusters} disabled={busy || sourceIds.length < 2} />
      <Button label="One cluster" onClick={createManualCluster} disabled={sourceIds.length === 0} />
    </div>

    {#if $analysisState.clusters.length === 0}
      <div class="text-slate-500">No manual clusters yet.</div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each $analysisState.clusters as cluster (cluster.id)}
          <article class="border border-slate-300 dark:border-slate-700 rounded p-2 flex flex-col gap-2">
            <div class="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={$analysisState.selectedClusterIds.includes(cluster.id)}
                onchange={() => manualAnalysis.toggleClusterSelection(cluster.id)}
                aria-label={`Select and show ${cluster.name} on map`}
              />
              <span class="w-3 h-3 rounded-full" style:background={cluster.color}></span>
              <input
                class="form-input rounded py-0.5 px-1 flex-1 min-w-0 bg-white dark:bg-slate-900"
                value={cluster.name}
                oninput={(event) => manualAnalysis.renameCluster(cluster.id, event.currentTarget.value)}
                aria-label="Cluster name"
              />
            </div>
            <div class="text-xs text-slate-500">
              {cluster.memberIds.length.toLocaleString()} points · {cluster.source}
            </div>
            {#if cluster.tags.length > 0}<div class="text-xs">Tags: {cluster.tags.join(", ")}</div>{/if}
            <div class="flex gap-2">
              <button class="underline" onclick={() => chartContext.highlight.set(cluster.memberIds)}>Show</button>
              <button class="underline text-red-600" onclick={() => manualAnalysis.deleteCluster(cluster.id)}
                >Delete</button
              >
            </div>
          </article>
        {/each}
      </div>
      <div class="flex gap-2 flex-wrap">
        <Button
          label="Merge selected"
          onClick={() => manualAnalysis.mergeSelected()}
          disabled={selectedClusters.length < 2}
        />
        <Button
          label="Split selected"
          onClick={splitSelectedCluster}
          disabled={busy || selectedClusters.length !== 1}
        />
      </div>
      <div class="flex gap-2">
        <Input
          bind:value={clusterTag}
          placeholder="Cluster tag"
          className="flex-1 min-w-0"
          onEnter={tagSelectedClusters}
        />
        <Button
          label="Tag clusters"
          onClick={tagSelectedClusters}
          disabled={selectedClusters.length === 0 || !clusterTag.trim()}
        />
      </div>
    {/if}
  </section>

  <section class="flex flex-col gap-2 text-sm border-t border-slate-300 dark:border-slate-700 pt-3">
    <h3 class="font-medium">Export</h3>
    <div class="flex gap-2">
      <Button icon={IconDownload} label="Export analysis" onClick={exportAnalysis} />
      <Select
        label="Format"
        value={exportFormat}
        onChange={(value) => (exportFormat = value as typeof exportFormat)}
        options={[
          { value: "json", label: "JSON" },
          { value: "csv", label: "CSV" },
        ]}
      />
    </div>
    <Button
      label="Clear analysis"
      onClick={() => manualAnalysis.clear()}
      disabled={$analysisState.pointTags.length === 0 && $analysisState.clusters.length === 0}
    />
  </section>

  {#if status}<div class="text-xs text-slate-500" role="status">{status}</div>{/if}
</PanelContainer>
