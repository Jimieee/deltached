<script lang="ts">
  import { useDeltached } from "@deltached/svelte";
  import { exposeTestHandle } from "../shared/handle";

  const d = useDeltached();

  $effect(() => {
    if (d.controller) exposeTestHandle(d.controller);
  });
</script>

<button id="trigger" type="button" {@attach d.source} onclick={() => d.enter()}>
  Open
</button>

<div id="panel" {@attach d.target}>
  <button data-close type="button" onclick={() => d.leave()}>Close</button>
  <h2>Panel</h2>
</div>
