<!-- Copyright (c) 2025 Apple Inc. Licensed under MIT License. -->
<script lang="ts">
  import SearchEvidence from "./SearchEvidence.svelte";
  import { sortSearchResults, type SearchSort } from "../search/search_evidence.js";

  import Paginator from "../widgets/Paginator.svelte";
  import TooltipContent from "./TooltipContent.svelte";

  import { IconClose } from "../assets/icons.js";
  import type { ColumnStyle } from "../renderers/types.js";
  import type { SearchResultItem } from "../search/search.js";

  interface Props {
    items: SearchResultItem[];
    label?: string;
    highlight: string;
    limit?: number;
    totalCount?: number;
    columnStyles?: Record<string, ColumnStyle>;
    onClick?: (item: SearchResultItem) => void;
    onClose?: () => void;
  }

  let { items, label, highlight, limit = 100, totalCount, columnStyles, onClick, onClose }: Props = $props();

  // Shared scorer so every result item coalesces into one batched match call.
  let sort = $state<SearchSort>("rank");
  let sortedItems = $derived(sortSearchResults(items, sort));
  let feedback = $state(new Map<any, "relevant" | "irrelevant">());
  function recordFeedback(id: any, value: "relevant" | "irrelevant") {
    const next = new Map(feedback);
    if (next.get(id) === value) next.delete(id);
    else next.set(id, value);
    feedback = next;
  }

  const matchLabels = {
    exact: "Text match",
    partial: "Partial match",
    semantic: "Semantic match",
    filter: "Filter match",
    index: "Index match",
    raw: "Result",
  } as const;

  function visibleField(item: SearchResultItem, styles: Record<string, ColumnStyle> | undefined, names: string[]) {
    for (const name of names) {
      if (styles?.[name]?.display === "hidden") continue;
      const value = item.fields[name];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  }

  let resultCountText = $derived(
    totalCount != null
      ? `${totalCount.toLocaleString()} matches highlighted · ${items.length.toLocaleString()} detail records loaded.`
      : items.length == 0
        ? "No result found."
        : items.length == 1
          ? `${items.length.toLocaleString()} result.`
          : items.length >= limit
            ? `Showing up to ${limit.toLocaleString()} results; total count is unknown.`
            : `${items.length.toLocaleString()} results.`,
  );
</script>

<div class="flex-1 flex flex-col gap-2 w-full overflow-y-hidden">
  <div class="flex items-start">
    <div class="flex-1 flex flex-col">
      <div class="text-base font-semibold text-slate-800 dark:text-slate-100">
        Results for “{label}”
      </div>
      <div class="text-sm text-slate-600 dark:text-slate-300">
        {resultCountText}
      </div>
    </div>
    <div class="flex-none">
      <button
        class="block hover:text-slate-500 dark:hover:text-slate-400"
        onclick={() => {
          onClose?.();
        }}
      >
        <IconClose />
      </button>
    </div>
  </div>

  <label class="flex items-center gap-2 text-sm"
    ><span class="shrink-0">Sort</span>
    <select bind:value={sort} class="min-w-0 flex-1 rounded border p-1 bg-white dark:bg-black">
      <option value="rank">Original search rank</option>
      <option value="exact">Exact matches first</option>
      <option value="similarity">Similarity</option>
      <option value="confidence">Confidence</option>
    </select>
  </label>
  <details class="text-sm text-slate-600 dark:text-slate-300">
    <summary class="cursor-pointer">About these results</summary>
    <p>Sorting applies to loaded cards only. Relevance feedback stays in this result view.</p>
  </details>
  <Paginator count={items.length}>
    {#snippet children({ start, end })}
      <div class="flex flex-col gap-2 overflow-x-hidden overflow-y-auto">
        {#each sortedItems.slice(start, end) as item (item)}
          {@const title = visibleField(item, columnStyles, ["title", "name"])}
          {@const heading = title ?? `Result #${item.id}`}
          {@const evidence = item.match?.evidence.find((entry) => columnStyles?.[entry.field]?.display !== "hidden")}
          {@const preview = visibleField(item, columnStyles, ["description", "text"])}
          <article
            class="min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-blue-400 dark:border-slate-700 dark:bg-black"
          >
            <button
              type="button"
              class="block w-full cursor-pointer rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              aria-label={`Show ${heading} on map`}
              onclick={() => onClick?.(item)}
            >
              <span class="flex items-start justify-between gap-2">
                <span class="result-title min-w-0 text-base font-semibold leading-5 text-slate-900 dark:text-slate-100" title={heading}>
                  {heading}
                </span>
                {#if title}<span class="shrink-0 text-xs text-slate-500 dark:text-slate-400">#{item.id}</span>{/if}
              </span>
              <span class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                {#if item.match}<span>{matchLabels[item.match.type]}</span>{/if}
                {#if item.match?.similarity != null}<span>Similarity {item.match.similarity.toFixed(3)}</span>{/if}
                {#if feedback.get(item.id)}<span>✓ {feedback.get(item.id) === "relevant" ? "Relevant" : "Not relevant"}</span>{/if}
              </span>
              {#if evidence}
                <span class="result-preview mt-2 block text-base leading-6 text-slate-700 dark:text-slate-200">
                  {evidence.before}<mark class="rounded bg-amber-200 px-0.5 dark:bg-amber-700">{evidence.match}</mark>{evidence.after}
                </span>
              {:else if preview}
                <span class="result-preview mt-2 block text-base leading-6 text-slate-700 dark:text-slate-200">{preview}</span>
              {:else if item.match}
                <span class="result-preview mt-2 block text-sm text-slate-600 dark:text-slate-300">{item.match.explanation}</span>
              {/if}
            </button>
            <details class="mt-2 border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
              <summary class="cursor-pointer font-medium text-slate-700 dark:text-slate-200">Details & feedback</summary>
              <div class="mt-3 flex flex-col gap-3">
                {#if item.match}
                  <SearchEvidence match={item.match} columnStyles={columnStyles ?? {}} />
                {:else if item.distance != null}
                  <div>Distance: {item.distance.toFixed(5)}</div>
                {/if}
                <details>
                  <summary class="cursor-pointer">Original fields</summary>
                  <TooltipContent values={item.fields} columnStyles={columnStyles ?? {}} />
                </details>
                <div class="flex flex-wrap gap-3" aria-label="Relevance feedback">
                  <button
                    class="underline"
                    aria-pressed={feedback.get(item.id) === "relevant"}
                    onclick={() => recordFeedback(item.id, "relevant")}
                    >Relevant {feedback.get(item.id) === "relevant" ? "✓" : ""}</button
                  >
                  <button
                    class="underline"
                    aria-pressed={feedback.get(item.id) === "irrelevant"}
                    onclick={() => recordFeedback(item.id, "irrelevant")}
                    >Not relevant {feedback.get(item.id) === "irrelevant" ? "✓" : ""}</button
                  >
                </div>
              </div>
            </details>
          </article>
        {/each}
      </div>
    {/snippet}
  </Paginator>
</div>

<style>
  .result-title,
  .result-preview {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .result-title {
    line-clamp: 2;
    -webkit-line-clamp: 2;
  }
  .result-preview {
    line-clamp: 2;
    -webkit-line-clamp: 2;
  }
</style>
