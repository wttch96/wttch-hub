<!--
  文件说明：加载首页插件 Widget，注入宿主 API，并按挂载状态管理插件作用域及刷新周期。
-->

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, provide } from 'vue';
import { findTool } from '../config/tools';
import { pluginRuntime } from '../plugins/runtime';
import { PLUGIN_COMPONENT_API_KEY } from '../types/plugin';

const props = defineProps<{ pluginId: string }>();
const plugin = computed(() => findTool(props.pluginId));
const widgetComponent = computed(() => plugin.value?.widget ? defineAsyncComponent(plugin.value.widget.component) : undefined);
const enabled = computed(() => pluginRuntime.states[props.pluginId]?.enabled ?? false);
const settings = computed(() => pluginRuntime.values[props.pluginId] ?? {});
const refreshInterval = computed(() => Number(pluginRuntime.values[props.pluginId]?.refreshIntervalMs
  ?? plugin.value?.widget?.refreshIntervalMs
  ?? 2000));
const pluginApi = pluginRuntime.componentApi(props.pluginId);
provide(PLUGIN_COMPONENT_API_KEY, pluginApi);
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
    v-bind="settings"
    :refresh-interval-ms="refreshInterval"
  />
</template>
