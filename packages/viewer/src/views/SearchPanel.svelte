<!-- Copyright (c) 2025 Apple Inc. Licensed under MIT License. -->
<script lang="ts">
  import { get } from "svelte/store";
  import Input from "../widgets/Input.svelte";
  import Button from "../widgets/Button.svelte";
  import Select from "../widgets/Select.svelte";
  import Spinner from "../widgets/Spinner.svelte";
  import PanelContainer from "./PanelContainer.svelte";
  import SearchResultList from "./SearchResultList.svelte";
  import { highlightColors } from "../charts/embedding/highlight_resolver.js";

  import { getStoreContext } from "../stores/embedding_atlas_store.js";

  const store = getStoreContext();
  const { search, columns, columnStyles, chartContext } = store;

  const { result, status, query, mode, searchModes, textColumn } = search;
  const { embeddingHighlight } = chartContext;
  const highlightState = embeddingHighlight.state;
  let comparisonCount = $derived.by(() => {
    const pinned = new Set($highlightState.secondaryIds);
    return $highlightState.primaryIds.filter((id) => pinned.has(id)).length;
  });
</script>

<PanelContainer title="Search" class="p-2 flex flex-col gap-2">
  <div class="flex gap-2">
    <Select
      options={[
        { value: "full-text", label: "Full Text" },
        { value: "vector", label: "Vector" },
      ]}
      value={$mode}
      onChange={(v) => ($mode = v)}
    />
    {#if $mode == "full-text"}
      <Select
        class="flex-1"
        options={[
          ...($columns.filter((x) => x.jsType == "string").length == 0 ? [{ value: undefined, label: "(none)" }] : []),
          ...$columns
            .filter((x) => x.jsType == "string")
            .map((c) => ({ value: c.name, label: c.name + " (" + c.type + ")" })),
        ]}
        value={$textColumn}
        onChange={(v) => ($textColumn = v)}
      />
    {/if}
  </div>

  {#if $searchModes.indexOf($mode) >= 0}
    <Input type="search" className="w-full" bind:value={$query} />
  {:else}
    <div class="text-slate-500 dark:text-slate-400">
      {#if $mode == "full-text"}Select a text column to enable search.{/if}
      {#if $mode == "vector"}Vector search is not supported by the backend.{/if}
    </div>
  {/if}

  {#if $status != null}
    <Spinner status={$status} />
  {/if}

  {#if $result != null || $highlightState.secondaryIds.length > 0}
    {@const searchResult = $result}
    <div class="flex flex-wrap gap-2 items-center text-sm">
      <Select
        label="Highlight mode"
        value={$highlightState.mode}
        options={[
          { value: "focus", label: "Focus" },
          { value: "context", label: "Context" },
          { value: "compare", label: "Compare" },
        ]}
        onChange={(value) => embeddingHighlight.setMode(value as "focus" | "context" | "compare")}
      />
      <button
        class="comparison-pin"
        class:pinned={$highlightState.secondaryIds.length > 0}
        aria-pressed={$highlightState.secondaryIds.length > 0}
        disabled={$highlightState.primaryIds.length === 0 || $status != null}
        title={$highlightState.secondaryIds.length > 0
          ? "A is pinned. Click to replace A with the current search result."
          : "Save all current matches as comparison A"}
        onclick={() => embeddingHighlight.pinCurrentAsComparison()}
        >Pin as comparison {$highlightState.secondaryIds.length > 0 ? "✓" : ""}</button
      >
      {#if $highlightState.secondaryIds.length > 0}
        <Button label="Clear comparison" onClick={() => embeddingHighlight.clearComparison()} />
      {/if}
    </div>
    <div
      class="text-xs flex flex-col gap-1 rounded border border-slate-300 dark:border-slate-600 p-2"
      aria-label="Highlight legend"
    >
      <div class="font-medium">Search highlights — separate from category colors</div>
      {#if $highlightState.secondaryIds.length > 0}
        <div class="font-medium">
          ✓ A pinned: {$highlightState.secondaryLabel} · {$highlightState.secondaryIds.length.toLocaleString()} points
        </div>
        {#if $highlightState.secondaryPredicate}<div class="break-all">
            A filter: {$highlightState.secondaryPredicate}
          </div>{/if}
        {#if $highlightState.mode !== "compare"}<div>
            Choose Compare to display pinned A alongside the current search.
          </div>{/if}
      {/if}
      <div>
        B (current): {$highlightState.primaryLabel || "No current search"} · {$highlightState.primaryIds.length.toLocaleString()}
        points
      </div>
      {#if $highlightState.primaryPredicate}<div class="break-all">
          B filter: {$highlightState.primaryPredicate}
        </div>{/if}
      {#if $highlightState.mode === "compare"}
        <div>
          <span class="legend-dot" style:background={highlightColors.secondary}></span>A only · {(
            $highlightState.secondaryIds.length - comparisonCount
          ).toLocaleString()}
        </div>
        <div>
          <span class="legend-dot" style:background={highlightColors.primary}></span>B only · {(
            $highlightState.primaryIds.length - comparisonCount
          ).toLocaleString()}
        </div>
        <div>
          <span class="legend-dot" style:background={highlightColors.intersection}></span>A ∩ B · {comparisonCount.toLocaleString()}
        </div>
        {#if $highlightState.secondaryIds.length === 0}<div>
            Pin a search result as A, then enter the next query as B.
          </div>{/if}
      {:else}
        <div><span class="legend-dot" style:background={highlightColors.primary}></span>All current matches</div>
        {#if $highlightState.mode === "context"}<div>
            <span class="legend-dot" style:background={highlightColors.context}></span>Non-matching points within the
            context radius
          </div>{/if}
      {/if}
      <div>Other points: 14% opacity across the entire map, with no distance limit.</div>
      <div>
        Background shows the full dataset. Current matches update with filters; pinned A keeps its original filter.
      </div>
      {#if searchResult && searchResult.totalCount == null}<div>
          Backend result set only; this search does not report all matching points.
        </div>{/if}
    </div>
    {#if $highlightState.mode === "context"}
      <label class="text-sm flex flex-col gap-1">
        Context radius: {$highlightState.contextRadiusPercent}% of dataset diagonal
        <input
          type="range"
          aria-label="Context radius"
          min="0.05"
          max="10"
          step="0.05"
          value={$highlightState.contextRadiusPercent}
          oninput={(event) => embeddingHighlight.setContextRadiusPercent(Number(event.currentTarget.value))}
        />
      </label>
      <div class="text-xs">
        Uses every matching point, without a neighbor-count cap. Radius is measured in projected 2D space and stays the
        same when zooming. Actual radius and neighbor count appear on the map.
      </div>
    {/if}
    {#if searchResult}
      {#key searchResult}
        <SearchResultList
          items={searchResult.items}
          label={searchResult.label}
          highlight={searchResult.highlight}
          limit={searchResult.limit}
          totalCount={searchResult.totalCount}
          onClick={async (item) => {
            // A second click on the same card should locate it again after the map was moved.
            const selected = get(chartContext.highlight);
            if (selected?.length === 1 && selected[0] === item.id) chartContext.highlight.set([]);
            chartContext.highlight.set([item.id]);
          }}
          onClose={() => {
            search.clear();
            embeddingHighlight.clear();
          }}
          columnStyles={$columnStyles}
        />
      {/key}
    {/if}
  {/if}
</PanelContainer>

<style>
  .comparison-pin {
    border: 1px solid #94a3b8;
    border-radius: 6px;
    padding: 4px 8px;
    background: white;
    color: #334155;
  }
  .comparison-pin.pinned {
    background: #1d4ed8;
    color: white;
    border: 2px solid #1e3a8a;
    font-weight: 600;
  }
  .comparison-pin:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .comparison-pin:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
  .legend-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 6px;
  }
</style>
