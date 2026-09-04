<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted } from 'vue';
import { findTool } from '../config/tools';
import { pluginRuntime } from '../plugins/runtime';

const props = defineProps<{ pluginId: string }>();
const plugin = computed(() => findTool(props.pluginId));
const widgetComponent = computed(() => plugin.value?.widget ? defineAsyncComponent(plugin.value.widget.component) : undefined);
const enabled = computed(() => pluginRuntime.states[props.pluginId]?.enabled ?? false);
const refreshInterval = computed(() => Number(pluginRuntime.values[props.pluginId]?.refreshIntervalMs
  ?? plugin.value?.widget?.refreshIntervalMs
  ?? 2000));
let release: (() => Promise<void>) | undefined;
let disposed = false;
onMounted(async () => {
  const acquired = await pluginRuntime.acquire(props.pluginId, 'widget', '/home');
  if (disposed) await acquired(); else release = acquired;
});
onBeforeUnmount(() => { disposed = true; void release?.(); });
</script>

<template>
  <component
    :is="widgetComponent"
    v-if="widgetComponent && enabled"
    :refresh-interval-ms="refreshInterval"
  />
</template>
