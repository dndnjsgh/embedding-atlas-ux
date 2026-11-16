<!-- Copyright (c) 2025 Apple Inc. Licensed under MIT License. -->
<script>
  import { onMount } from "svelte";

  // Keep the package's Svelte entry point usable in Vite dev mode before the
  // distributable bundle has been generated.
  import { EmbeddingViewMosaic as Component } from "../src/lib/index.ts";

  /** @type import("../src/lib/index.ts").EmbeddingViewMosaicProps */
  let props = $props();

  /** @type {HTMLElement} */
  let container;

  onMount(() => {
    let component = new Component(container, props);

    $effect(() => {
      component.update(props);
    });

    return () => {
      component.destroy();
    };
  });
</script>

<div bind:this={container} style:display="flex"></div>
