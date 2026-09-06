<!--
  文件说明：加载独立浮动窗口中的插件组件，为浮动 Widget 注入宿主 API 和插件设置。
-->

<script setup lang="ts">
import { computed, defineAsyncComponent, provide } from 'vue';
import { findTool } from '../config/tools';
import { pluginRuntime } from '../plugins/runtime';
import { PLUGIN_COMPONENT_API_KEY } from '@wttch-hub/plugin-api';

const props = defineProps<{ pluginId: string }>();
const plugin = findTool(props.pluginId);
const floatingComponent = plugin?.floatingWidget ? defineAsyncComponent(plugin.floatingWidget.component) : undefined;
const settings = computed(() => pluginRuntime.values[props.pluginId] ?? {});
provide(PLUGIN_COMPONENT_API_KEY, plugin ? pluginRuntime.componentApi(plugin.id) : undefined);
</script>

<template>
  <component
    :is="floatingComponent"
    v-if="floatingComponent"
    v-bind="settings"
  />
  <div v-else class="missing-floating-widget">浮动 Widget 不存在。</div>
</template>

<style scoped>
.missing-floating-widget { height: 100%; padding: 20px; border-radius: 24px; background: var(--panel); color: var(--danger); }
</style>
