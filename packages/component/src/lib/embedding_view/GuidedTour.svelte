<!-- Copyright (c) 2026 Apple Inc. Licensed under MIT License. -->
<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  import { type CameraController, type GuidedTourStep } from "./cameraController.js";

  interface Props {
    controller: CameraController;
    steps: GuidedTourStep[];
    defaultDuration?: number;
    startDelay?: number;
    onFinish?: (() => void) | null;
  }

  let { controller, steps, defaultDuration = 1200, startDelay = 350, onFinish = null }: Props = $props();
  let activeIndex = $state(0);
  let running = $state(false);
  let dismissed = $state(false);
  let delayTimer: ReturnType<typeof setTimeout> | null = null;
  let visitId = 0;

  async function moveTo(index: number) {
    if (dismissed || index >= steps.length) {
      finish();
      return;
    }
    const thisVisit = ++visitId;
    activeIndex = index;
    running = true;
    const step = steps[index];
    const completed = await controller.flyTo(step, step.duration ?? defaultDuration);
    running = false;
    // A newer `Next` request supersedes this animation. A cancellation made by
    // the canvas or minimap, however, should close the tour immediately.
    if (dismissed || thisVisit !== visitId) return;
    if (!completed) {
      finish();
      return;
    }
    // Stay on the current step after the camera settles. The user explicitly
    // advances the tour with the Next button.
  }

  function next() {
    if (activeIndex >= steps.length - 1) {
      finish();
    } else {
      void moveTo(activeIndex + 1);
    }
  }

  function finish() {
    if (dismissed) return;
    dismissed = true;
    visitId += 1;
    if (delayTimer != null) clearTimeout(delayTimer);
    controller.cancel();
    onFinish?.();
  }

  onMount(() => {
    if (steps.length === 0) {
      finish();
      return;
    }
    delayTimer = setTimeout(() => void moveTo(0), startDelay);
  });

  onDestroy(() => {
    if (delayTimer != null) clearTimeout(delayTimer);
    controller.cancel();
  });
</script>

{#if !dismissed && steps.length > 0}
  {@const step = steps[activeIndex]}
  <section class="guided-tour" aria-live="polite" aria-label="Guided embedding tour">
    <div class="progress" aria-hidden="true">
      {#each steps as _, index}
        <span class:active={index === activeIndex} class:visited={index < activeIndex}></span>
      {/each}
    </div>
    <p class="eyebrow">Tour {activeIndex + 1}/{steps.length}</p>
    <h2>{step.title}</h2>
    {#if step.description}<p class="description">{step.description}</p>{/if}
    <div class="actions">
      <button type="button" class="skip" onclick={finish}>Skip tour</button>
      <button type="button" class="next" onclick={next} disabled={running}>
        {activeIndex === steps.length - 1 ? "Finish" : "Next"}
      </button>
    </div>
  </section>
{/if}

<style>
  .guided-tour {
    position: absolute;
    z-index: 4;
    top: 16px;
    left: 16px;
    box-sizing: border-box;
    width: min(320px, calc(100% - 32px));
    padding: 16px;
    color: #f8fafc;
    background: rgb(15 23 42 / 0.94);
    border: 1px solid rgb(148 163 184 / 0.35);
    border-radius: 10px;
    box-shadow: 0 10px 30px rgb(15 23 42 / 0.28);
    font:
      13px/1.45 system-ui,
      sans-serif;
  }
  .progress {
    display: flex;
    gap: 5px;
    margin-bottom: 12px;
  }
  .progress span {
    flex: 1;
    height: 3px;
    background: #475569;
    border-radius: 99px;
  }
  .progress .active,
  .progress .visited {
    background: #38bdf8;
  }
  .eyebrow {
    margin: 0 0 3px;
    color: #7dd3fc;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0;
    font-size: 15px;
    line-height: 1.3;
  }
  .description {
    margin: 7px 0 0;
    color: #cbd5e1;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 14px;
  }
  button {
    min-height: 30px;
    padding: 0 10px;
    border-radius: 6px;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .skip {
    color: #e2e8f0;
    background: transparent;
    border: 1px solid #64748b;
  }
  .next {
    color: #082f49;
    background: #7dd3fc;
    border: 1px solid #7dd3fc;
  }
  button:disabled {
    cursor: wait;
    opacity: 0.65;
  }
  button:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }
</style>
