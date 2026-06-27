<script setup lang="ts">
import { watch } from "vue";
import { useDeltached } from "@deltached/vue";
import { exposeTestHandle } from "../shared/handle";

const { sourceRef, targetRef, enter, leave, controller } = useDeltached();

watch(controller, (instance) => {
  if (instance) exposeTestHandle(instance);
});
</script>

<template>
  <button id="trigger" type="button" :ref="sourceRef" @click="enter()">
    Open
  </button>

  <div id="panel" :ref="targetRef">
    <button data-close type="button" @click="leave()">Close</button>
    <h2>Panel</h2>
  </div>
</template>
