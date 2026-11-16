<script lang="ts">
  import type { SearchMatch } from "../search/search_evidence.js";
  import type { ColumnStyle } from "../renderers/types.js";
  let { match, columnStyles = {} }: { match: SearchMatch; columnStyles?: Record<string, ColumnStyle> } = $props();
  const labels = {
    exact: "Exact text match",
    partial: "Partial text match",
    semantic: "Semantic match",
    filter: "Filter match",
    index: "Text index match",
    raw: "Supplied results",
  };
  const confidenceLabels = {
    high: "High",
    medium: "Medium",
    low: "Low — review recommended",
    unavailable: "Unavailable",
  };
</script>

<section class="text-sm flex flex-col gap-2" aria-label="Search evidence">
  <div>{labels[match.type]}{match.predicate ? " + filter" : ""}</div>
  <div title={match.confidenceExplanation}>Confidence: {confidenceLabels[match.confidence]}</div>
  {#if match.similarity != null}<div>Cosine similarity: {match.similarity.toFixed(4)} (−1 to 1)</div>{/if}
  {#if match.distance != null}<div>
      {match.metric === "cosine-similarity" ? "Original score" : "Original distance"}: {match.distance.toFixed(5)} · {match.metric ??
        "metric unspecified"}
    </div>{/if}
  <p>{match.explanation}</p>
  <details>
    <summary>Score meaning and filter</summary>
    <p>{match.confidenceExplanation}</p>
    {#if match.predicate}<pre class="whitespace-pre-wrap break-all">{match.predicate}</pre>{/if}
  </details>
  {#each match.evidence.filter((e) => !e.field.startsWith("__") && columnStyles[e.field]?.display !== "hidden") as evidence}
    <div class="rounded border border-slate-300 dark:border-slate-600 p-2">
      <div class="text-xs">{evidence.field} · characters {evidence.start + 1}–{evidence.end}</div>
      <p class="whitespace-pre-wrap break-words">{evidence.before}<mark>{evidence.match}</mark>{evidence.after}</p>
    </div>
  {/each}
</section>
