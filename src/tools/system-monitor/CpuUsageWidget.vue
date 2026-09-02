<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Cpu } from 'lucide-vue-next';

const props = withDefaults(defineProps<{ refreshIntervalMs?: number }>(), {
  refreshIntervalMs: 2000,
});
const usage = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

const refresh = async () => {
  const stats = await window.systemMonitor?.stats();
  if (stats) usage.value = stats.cpu;
};

onMounted(() => {
  void refresh();
  timer = setInterval(() => void refresh(), props.refreshIntervalMs);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <section class="cpu-widget">
    <header>
      <span class="label"><Cpu :size="16" /> CPU 使用率</span>
      <strong>{{ usage.toFixed(0) }}%</strong>
    </header>
    <div class="meter"><i :style="{ width: `${usage}%` }" /></div>
    <p>每 2 秒更新</p>
  </section>
</template>

<style scoped>
.cpu-widget { height: 100%; padding: 18px; color: var(--text); }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.label { display: inline-flex; align-items: center; gap: 7px; color: var(--text-secondary); font-size: 13px; }
.label svg { color: #ff375f; }
strong { color: var(--text); font-size: 25px; font-variant-numeric: tabular-nums; }
.meter { height: 8px; margin-top: 22px; overflow: hidden; border-radius: 4px; background: rgba(0, 0, 0, .08); }
.meter i { display: block; height: 100%; border-radius: inherit; background: #ff375f; transition: width .3s ease; }
p { margin: 10px 0 0; color: var(--text-secondary); font-size: 11px; }
</style>
