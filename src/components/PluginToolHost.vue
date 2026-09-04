<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { findTool } from '../config/tools';
import { pluginRuntime } from '../plugins/runtime';

const props = defineProps<{ pluginId: string }>();
const plugin = findTool(props.pluginId);
const toolComponent = plugin ? defineAsyncComponent(plugin.component) : undefined;
const settings = computed(() => pluginRuntime.values[props.pluginId] ?? {});
</script>

<template>
  <component :is="toolComponent" v-if="toolComponent" v-bind="settings" />
  <p v-else class="missing-plugin">插件入口不存在。</p>
</template>

<style scoped>
.missing-plugin { padding: 24px; color: var(--text-secondary); }
</style>
