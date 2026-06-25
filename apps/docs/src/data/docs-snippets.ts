/**
 * Code samples for the docs page, kept out of the page markup so the prose
 * stays readable. The quick-start group shows the canonical wiring per
 * framework: JavaScript and Angular drive the vanilla controller directly,
 * while React, Vue, and Svelte use their official wrapper (`useDeltached`),
 * which creates and destroys the controller and toggles the target's
 * visibility for you. Every variant does the same thing — grow a target out of
 * a source and play it back on close — so the differences read as framework
 * idiom, not behavior.
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
import { useDeltached } from "@deltached/react";

export function MorphPanel() {
  const { sourceRef, targetRef, enter, leave } = useDeltached();

  return (
    <>
      <button ref={sourceRef} onClick={() => enter()}>
        Open panel
      </button>
      <div ref={targetRef}>
        <button onClick={() => leave()}>Close</button>
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
import { useDeltached } from "@deltached/vue";

const { sourceRef, targetRef, enter, leave } = useDeltached();
</script>

<template>
  <button :ref="sourceRef" @click="enter()">Open panel</button>
  <div :ref="targetRef">
    <button @click="leave()">Close</button>
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
  import { useDeltached } from "@deltached/svelte";

  const d = useDeltached();
</script>

<button {@attach d.source} onclick={() => d.enter()}>Open panel</button>
<div {@attach d.target}>
  <button onclick={() => d.leave()}>Close</button>
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
