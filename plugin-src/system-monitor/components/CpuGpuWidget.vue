<!--
  文件说明：在首页 Widget 中展示 CPU 和 GPU 使用率，使用宿主统计接口获取系统数据。
-->

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Cpu, Monitor } from 'lucide-vue-next';
import type { SystemStats } from '@wttch-hub/plugin-api';

const props = withDefaults(defineProps<{ refreshIntervalMs?: number }>(), { refreshIntervalMs: 2000 });
const stats = ref<SystemStats>({ cpu: 0, memory: 0, gpu: 0, readBytes: 0, writeBytes: 0, downloadBytes: 0, uploadBytes: 0 });
let timer: ReturnType<typeof setInterval> | undefined;
const refresh = async () => {
  const next = await window.toolHost?.systemStats();
  if (next) stats.value = next;
};
const startSampling = () => {
  clearInterval(timer);
  void refresh();
  timer = setInterval(() => void refresh(), Math.max(250, props.refreshIntervalMs));
};
onMounted(startSampling);
watch(() => props.refreshIntervalMs, startSampling);
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <section class="widget-monitor">
    <div class="widget-head"><span>实时负载</span><span class="live">LIVE</span></div>
    <div class="load"><div><Cpu :size="15" /><span>CPU</span><strong>{{ stats.cpu.toFixed(0) }}%</strong></div><i><b :style="{ width: `${stats.cpu}%` }" /></i></div>
    <div class="load"><div><Monitor :size="15" /><span>显卡</span><strong>{{ stats.gpu.toFixed(0) }}%</strong></div><i><b :style="{ width: `${stats.gpu}%` }" /></i></div>
  </section>
</template>

<style scoped>
.widget-monitor { height: 100%; padding: 16px; color: var(--text); }
.widget-head, .load > div { display: flex; align-items: center; }
.widget-head { justify-content: space-between; color: var(--text-secondary); font-size: 12px; font-weight: 600; }
.live { color: #ff375f; font-size: 9px; letter-spacing: .08em; }
.load { margin-top: 16px; }
.load > div { gap: 6px; color: var(--text-secondary); font-size: 12px; }
.load svg { color: #ff375f; }
.load strong { margin-left: auto; color: var(--text); font-size: 15px; }
.load i { display: block; height: 5px; margin-top: 7px; overflow: hidden; border-radius: 3px; background: rgba(0, 0, 0, .08); }
.load b { display: block; height: 100%; border-radius: inherit; background: #ff375f; transition: width .3s ease; }
</style>
