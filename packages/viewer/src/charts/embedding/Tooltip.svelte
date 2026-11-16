<!-- Copyright (c) 2025 Apple Inc. Licensed under MIT License. -->
<script lang="ts">
  import type { DataPoint } from "@embedding-atlas/component";

  import TooltipContent from "../../views/TooltipContent.svelte";
  import SearchEvidence from "../../views/SearchEvidence.svelte";

  import { IconSearch } from "../../assets/icons.js";
  import { highlight as highlightText } from "../../highlight/action.js";
  import type { ColumnStyle } from "../../renderers/types.js";
  import type { ManualAnalysisState } from "../../stores/manual_analysis_store.js";
  import type { ChartContext } from "../chart.js";

  interface Props {
    context: ChartContext;
    tooltip: DataPoint;
    columnStyles?: Record<string, ColumnStyle>;
    colorScheme: "light" | "dark";
    onNearestNeighborSearch?: (id: any) => void;
  }

  let { context, tooltip, columnStyles, colorScheme, onNearestNeighborSearch }: Props = $props();

  let { textHighlight, highlightScorer, searchResults, manualAnalysis } = $derived(context);
  let searchMatch = $derived($searchResults.get(tooltip.identifier)?.match);
  let analysisState = $state.raw<ManualAnalysisState>({ pointTags: [], clusters: [], selectedClusterIds: [] });
  $effect.pre(() => manualAnalysis.state.subscribe((value) => (analysisState = value)));
  let pointTags = $derived(analysisState.pointTags.find((entry) => entry.id === tooltip.identifier)?.tags ?? []);
  let clusterNames = $derived(
    analysisState.clusters
      .filter((cluster) => cluster.memberIds.includes(tooltip.identifier))
      .map((cluster) => cluster.name),
  );
</script>

<div class="embedding-atlas-root">
  <div
    class="p-2 border flex flex-col gap-2 border-slate-300 dark:border-slate-600 shadow-md text-slate-700 dark:text-slate-300 rounded-md text-ellipsis overflow-x-hidden overflow-y-scroll bg-white/75 dark:bg-slate-800/75 backdrop-blur-sm"
    class:dark={colorScheme == "dark"}
    style:max-width="400px"
    style:max-height="300px"
    use:highlightText={{
      query: $textHighlight ?? undefined,
      scorer: $highlightScorer,
      include: "[data-highlight]",
    }}
  >
    <TooltipContent values={tooltip.fields ?? {}} columnStyles={columnStyles ?? {}} />
    {#if pointTags.length > 0 || clusterNames.length > 0}
      <section
        class="text-xs flex flex-col gap-1 border-t border-slate-200 dark:border-slate-700 pt-2"
        aria-label="Manual analysis"
      >
        {#if pointTags.length > 0}<div><strong>Tags:</strong> {pointTags.join(", ")}</div>{/if}
        {#if clusterNames.length > 0}<div><strong>Clusters:</strong> {clusterNames.join(", ")}</div>{/if}
      </section>
    {/if}
    {#if searchMatch}<SearchEvidence match={searchMatch} columnStyles={columnStyles ?? {}} />{/if}
    {#if onNearestNeighborSearch}
      <div>
        <button
          class="text-sm flex gap-0.5 items-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300"
          onclick={() => {
            onNearestNeighborSearch?.(tooltip.identifier);
          }}
        >
          <IconSearch /> Nearest Neighbors
        </button>
      </div>
    {/if}
  </div>
</div>
