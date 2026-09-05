<!--
  文件说明：加载插件工具页面并注入宿主 API，将插件设置和更新操作传递给实际工具组件。
-->

<script setup lang="ts">
import { computed, defineAsyncComponent, provide } from 'vue';
import { findTool } from '../config/tools';
import { pluginRuntime } from '../plugins/runtime';
import { PLUGIN_COMPONENT_API_KEY } from '../types/plugin';

const props = defineProps<{ pluginId: string }>();
const plugin = findTool(props.pluginId);
const toolComponent = plugin ? defineAsyncComponent(plugin.component) : undefined;
const settings = computed(() => pluginRuntime.values[props.pluginId] ?? {});
const pluginApi = plugin ? pluginRuntime.componentApi(plugin.id) : undefined;
provide(PLUGIN_COMPONENT_API_KEY, pluginApi);
const updateSetting = (key: string, value: boolean | number | string) => pluginRuntime.updateSetting(props.pluginId, key, value);
</script>

<template>
  <component
    :is="toolComponent"
    v-if="toolComponent"
    v-bind="settings"
    @update-setting="updateSetting"
  />
  <p v-else class="missing-plugin">插件入口不存在。</p>
</template>

<style scoped>
.missing-plugin { padding: 24px; color: var(--text-secondary); }
</style>
