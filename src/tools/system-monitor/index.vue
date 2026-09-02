<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Activity, Cpu, HardDrive, MemoryStick, Wifi } from 'lucide-vue-next';

type SystemStats = {
  cpu: number;
  memory: number;
  readBytes: number;
  writeBytes: number;
  downloadBytes: number;
  uploadBytes: number;
};

const stats = ref<SystemStats>({ cpu: 0, memory: 0, readBytes: 0, writeBytes: 0, downloadBytes: 0, uploadBytes: 0 });
let timer: ReturnType<typeof setInterval> | undefined;

const props = withDefaults(defineProps<{ refreshIntervalMs?: number }>(), {
  refreshIntervalMs: 2000,
});

const formatRate = (value: number) => {
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB/s`;
  return `${(value / 1024 / 1024).toFixed(1)} MB/s`;
};

const readRate = computed(() => formatRate(stats.value.readBytes));
const writeRate = computed(() => formatRate(stats.value.writeBytes));

const refresh = async () => {
  const next = await window.systemMonitor?.stats();
  if (!next) return;
  stats.value = {
    cpu: next.cpu,
    memory: next.memory,
    readBytes: next.readBytes,
    writeBytes: next.writeBytes,
    downloadBytes: next.downloadBytes,
    uploadBytes: next.uploadBytes,
  };
};
const downloadRate = computed(() => formatRate(stats.value.downloadBytes));
const uploadRate = computed(() => formatRate(stats.value.uploadBytes));

onMounted(() => {
  void refresh();
  timer = setInterval(() => void refresh(), props.refreshIntervalMs);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <section class="monitor">
    <header class="monitor-head">
      <div>
        <p class="eyebrow">SYSTEM MONITOR</p>
        <h2>设备状态</h2>
      </div>
      <Activity :size="18" />
    </header>

    <div class="metrics">
      <div class="metric">
        <Cpu :size="16" />
        <span>CPU</span>
        <strong>{{ stats.cpu.toFixed(0) }}%</strong>
        <div class="meter"><i :style="{ width: `${stats.cpu}%` }" /></div>
      </div>
      <div class="metric">
        <MemoryStick :size="16" />
        <span>内存</span>
        <strong>{{ stats.memory.toFixed(0) }}%</strong>
        <div class="meter"><i :style="{ width: `${stats.memory}%` }" /></div>
      </div>
      <div class="metric io">
        <HardDrive :size="16" />
        <span>磁盘 IO</span>
        <strong>↓ {{ readRate }}</strong>
        <small>↑ {{ writeRate }}</small>
      </div>
      <div class="metric io">
        <Wifi :size="16" />
        <span>网络</span>
        <strong>↓ {{ downloadRate }}</strong>
        <small>↑ {{ uploadRate }}</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.monitor { height: 100%; padding: 18px; color: var(--text); }
.monitor-head { display: flex; align-items: flex-start; justify-content: space-between; color: #ff375f; }
.eyebrow { margin: 0 0 4px; color: var(--text-secondary); font-size: 10px; letter-spacing: .08em; }
h2 { margin: 0; font-size: 17px; }
.metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }
.metric { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 6px; min-width: 0; color: var(--text-secondary); font-size: 12px; }
.metric svg { color: #ff375f; }
.metric strong { color: var(--text); font-size: 15px; }
.meter { grid-column: 1 / -1; height: 5px; overflow: hidden; border-radius: 3px; background: rgba(0, 0, 0, .08); }
.meter i { display: block; height: 100%; border-radius: inherit; background: #ff375f; transition: width .3s ease; }
.io { grid-template-columns: auto 1fr; }
.io strong, .io small { grid-column: 2; }
.io small { color: var(--text-secondary); }
@media (max-width: 620px) { .metrics { grid-template-columns: 1fr; } }
</style>
