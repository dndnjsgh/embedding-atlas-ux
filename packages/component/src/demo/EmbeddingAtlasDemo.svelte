<script lang="ts">
  // The full dashboard is implemented by the Viewer package. This source
  // downloads the Wine Reviews data and its pre-computed embedding projection.
  import "../../../viewer/src/app.css";
  import WineReviewsDataViewer from "../../../viewer/src/app/WineReviewsDataViewer.svelte";

  const embeddingViewConfig = {
    // The optional density-clustering WASM package is not required for this
    // dashboard demo; the new navigation UI remains fully available.
    autoLabelEnabled: false,
    guidedTour: true,
    minimap: { maxPreviewPoints: 3500 },
  };
</script>

<!-- Licensed under the MIT License. See LICENSE in the project root. -->

<main class="dashboard-demo" aria-label="Embedding Atlas dashboard demo">
  <WineReviewsDataViewer {embeddingViewConfig} />
</main>

<style>
  :global(html),
  :global(body),
  :global(#app) {
    width: 100%;
    height: 100%;
    margin: 0;
    overflow: hidden;
  }

  .dashboard-demo {
    position: fixed;
    inset: 48px 0 0;
    display: flex;
    overflow: hidden;
    background: #e2e8f0;
  }

  /* Viewer owns a full-screen `.fixed` root. Constrain it to this demo's
     content region so the component switcher remains visible above it. */
  :global(.dashboard-demo .fixed) {
    position: absolute;
    inset: 0;
  }
</style>
