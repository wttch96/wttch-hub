<!-- 文件说明：展示最小插件页面模板，演示组件可通过注入的受控 API 读取插件设置。 -->

<script setup lang="ts">
import { computed, inject } from 'vue';
import { PLUGIN_COMPONENT_API_KEY, type PluginComponentApi } from '@wttch-hub/plugin-api';

const api = inject<PluginComponentApi>(PLUGIN_COMPONENT_API_KEY);
const greeting = computed(() => api?.settings.get('greeting', '你好') ?? '你好');
</script>

<template>
  <section class="hello-plugin"><h1>{{ greeting }}，插件开发者</h1><p>这是本地开发模板，复制后即可独立实现页面和测试。</p></section>
</template>

<style scoped>
.hello-plugin { padding: 28px; }
</style>
