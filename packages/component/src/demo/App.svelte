<!-- Copyright (c) 2025 Apple Inc. Licensed under MIT License. -->
<script lang="ts">
  import EmbeddingViewDemo from "./EmbeddingViewDemo.svelte";
  import EmbeddingViewMosaicDemo from "./EmbeddingViewMosaicDemo.svelte";
  import EmbeddingAtlasDemo from "./EmbeddingAtlasDemo.svelte";

  let testView: "EmbeddingView" | "EmbeddingViewMosaic" | "EmbeddingAtlas" = $state("EmbeddingView");
</script>

<div class="demo-switcher">
  <label style="display:flex;align-items:center;gap:4px">
    Component:
    <select bind:value={testView}>
      <option value="EmbeddingView">EmbeddingView</option>
      <option value="EmbeddingViewMosaic">EmbeddingViewMosaic</option>
      <option value="EmbeddingAtlas">EmbeddingAtlas dashboard</option>
    </select>
  </label>
</div>

{#if testView == "EmbeddingViewMosaic"}
  <EmbeddingViewMosaicDemo />
{:else if testView == "EmbeddingAtlas"}
  <EmbeddingAtlasDemo />
{:else if testView == "EmbeddingView"}
  <EmbeddingViewDemo />
{/if}

<style>
  .demo-switcher {
    position: fixed;
    z-index: 20;
    top: 0;
    right: 0;
    left: 0;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: 48px;
    padding: 0 12px;
    color: #0f172a;
    background: #f8fafc;
    border-bottom: 1px solid #cbd5e1;
  }

  :global(body) {
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      Oxygen,
      Ubuntu,
      Cantarell,
      "Open Sans",
      "Helvetica Neue",
      sans-serif;
    font-size: 14px;
  }
</style>
