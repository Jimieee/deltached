/**
 * Code samples for the docs page, kept out of the page markup so the prose
 * stays readable. The quick-start group is the canonical wiring shown once in
 * every supported framework; the rest are focused single snippets referenced
 * inline. Every framework variant does the SAME three things — construct a
 * transition against a target + source, drive it on click, and DESTROY it on
 * teardown — so the differences read as framework idiom, not behavior.
 */
import type { CodeLang } from "../lib/shiki";

export interface CodeTab {
  label: string;
  lang: CodeLang;
  title?: string;
  code: string;
}

/** Markup both halves of the quick start share. */
export const quickStartHtml = `
<!-- The source: any element the panel should grow out of. -->
<button id="trigger">Open panel</button>

<!-- The target: also the surface that morphs. Starts hidden. -->
<div id="panel" hidden>
  <button data-close>Close</button>
  <h2>Now you see me</h2>
  <p>This box grew out of the button — same controller, in reverse, on close.</p>
</div>
`;

export const quickStart: CodeTab[] = [
  {
    label: "JavaScript",
    lang: "ts",
    title: "morph.ts",
    code: `
import { createDeltachedTransition } from "deltached";

const trigger = document.querySelector<HTMLElement>("#trigger")!;
const panel = document.querySelector<HTMLElement>("#panel")!;

const transition = createDeltachedTransition({
  target: panel,    // destination + the surface that morphs
  source: trigger,  // where it grows from
  hooks: {
    // Make the panel measurable before the read phase…
    beforeEnter: () => (panel.hidden = false),
    // …and hide it again once it has fully left.
    afterLeave: () => (panel.hidden = true),
  },
});

trigger.addEventListener("click", () => transition.enter());
panel
  .querySelector("[data-close]")!
  .addEventListener("click", () => transition.leave());
`,
  },
  {
    label: "React",
    lang: "tsx",
    title: "MorphPanel.tsx",
    code: `
import { useEffect, useRef } from "react";
import { createDeltachedTransition, type DeltachedTransition } from "deltached";

export function MorphPanel() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tx = useRef<DeltachedTransition | null>(null);

  useEffect(() => {
    const panel = panelRef.current!;
    tx.current = createDeltachedTransition({
      target: panel,
      source: triggerRef.current,
      hooks: {
        beforeEnter: () => (panel.hidden = false),
        afterLeave: () => (panel.hidden = true),
      },
    });
    // Revert every style and listener the controller owns on unmount.
    return () => tx.current?.destroy();
  }, []);

  return (
    <>
      <button ref={triggerRef} onClick={() => tx.current?.enter()}>
        Open panel
      </button>
      <div ref={panelRef} hidden>
        <button onClick={() => tx.current?.leave()}>Close</button>
        <h2>Now you see me</h2>
      </div>
    </>
  );
}
`,
  },
  {
    label: "Vue",
    lang: "vue",
    title: "MorphPanel.vue",
    code: `
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { createDeltachedTransition, type DeltachedTransition } from "deltached";

const trigger = ref<HTMLButtonElement>();
const panel = ref<HTMLDivElement>();
let tx: DeltachedTransition;

onMounted(() => {
  tx = createDeltachedTransition({
    target: panel.value!,
    source: trigger.value,
    hooks: {
      beforeEnter: () => (panel.value!.hidden = false),
      afterLeave: () => (panel.value!.hidden = true),
    },
  });
});

onUnmounted(() => tx.destroy());
</script>

<template>
  <button ref="trigger" @click="tx.enter()">Open panel</button>
  <div ref="panel" hidden>
    <button @click="tx.leave()">Close</button>
    <h2>Now you see me</h2>
  </div>
</template>
`,
  },
  {
    label: "Angular",
    lang: "ts",
    title: "morph-panel.component.ts",
    code: `
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from "@angular/core";
import { createDeltachedTransition, type DeltachedTransition } from "deltached";

@Component({
  selector: "app-morph-panel",
  standalone: true,
  template: \`
    <button #trigger (click)="tx.enter()">Open panel</button>
    <div #panel hidden>
      <button (click)="tx.leave()">Close</button>
      <h2>Now you see me</h2>
    </div>
  \`,
})
export class MorphPanelComponent implements AfterViewInit, OnDestroy {
  @ViewChild("trigger") trigger!: ElementRef<HTMLButtonElement>;
  @ViewChild("panel") panel!: ElementRef<HTMLDivElement>;
  tx!: DeltachedTransition;

  ngAfterViewInit() {
    const panel = this.panel.nativeElement;
    this.tx = createDeltachedTransition({
      target: panel,
      source: this.trigger.nativeElement,
      hooks: {
        beforeEnter: () => (panel.hidden = false),
        afterLeave: () => (panel.hidden = true),
      },
    });
  }

  ngOnDestroy() {
    this.tx.destroy();
  }
}
`,
  },
  {
    label: "Svelte",
    lang: "svelte",
    title: "MorphPanel.svelte",
    code: `
<script lang="ts">
  import { onMount } from "svelte";
  import { createDeltachedTransition, type DeltachedTransition } from "deltached";

  let trigger: HTMLButtonElement;
  let panel: HTMLDivElement;
  let tx: DeltachedTransition;

  onMount(() => {
    tx = createDeltachedTransition({
      target: panel,
      source: trigger,
      hooks: {
        beforeEnter: () => (panel.hidden = false),
        afterLeave: () => (panel.hidden = true),
      },
    });
    // onMount's return runs on destroy — revert everything here.
    return () => tx.destroy();
  });
</script>

<button bind:this={trigger} on:click={() => tx.enter()}>Open panel</button>
<div bind:this={panel} hidden>
  <button on:click={() => tx.leave()}>Close</button>
  <h2>Now you see me</h2>
</div>
`,
  },
];

/** Package-manager install commands, one segment each. */
export const install: CodeTab[] = [
  { label: "npm", lang: "bash", code: "npm install deltached gsap" },
  { label: "pnpm", lang: "bash", code: "pnpm add deltached gsap" },
  { label: "yarn", lang: "bash", code: "yarn add deltached gsap" },
  { label: "bun", lang: "bash", code: "bun add deltached gsap" },
];
