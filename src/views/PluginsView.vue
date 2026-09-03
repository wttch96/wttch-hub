<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Check, ChevronRight, Package, Puzzle, Settings2 } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { tools } from '../config/tools';
import type { PluginPackageInfo } from '../types/plugin';

const packages = ref<PluginPackageInfo[]>([]);
const packageError = ref(false);

const packageFor = (id: string) => packages.value.find((item) => item.id === id);
const capabilitiesFor = (plugin: typeof tools[number]) => [
  '工具页面',
  ...(plugin.widget ? ['Widget'] : []),
  ...(plugin.statusbar ? ['状态栏'] : []),
  ...(plugin.settings ? ['可配置'] : []),
];

onMounted(async () => {
  try {
    packages.value = await window.toolHost?.pluginPackages() ?? [];
  } catch {
    packageError.value = true;
  }
});
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div class="heading-line">
        <div>
          <h1>插件</h1>
          <p class="sub">统一管理已加载的工具插件与插件包。</p>
        </div>
        <Puzzle class="heading-icon" :size="28" :stroke-width="1.5" />
      </div>
    </header>

    <div class="summary card">
      <div class="summary-item"><strong>{{ tools.length }}</strong><span>已加载插件</span></div>
      <div class="summary-item"><strong>{{ packages.length }}</strong><span>已识别 ZIP 包</span></div>
      <div class="summary-note">
        <Package :size="16" />
        <span>{{ packageError ? '插件包信息暂时不可用' : '插件包目录：工作目录 / plugins' }}</span>
      </div>
    </div>

    <div class="plugin-grid">
      <article v-for="plugin in tools" :key="plugin.id" class="card plugin-card">
        <div class="plugin-head">
          <span class="plugin-icon" :style="{ color: plugin.tint[0], background: plugin.tint[1] }">
            <component :is="plugin.icon" :size="21" />
          </span>
          <div class="plugin-title">
            <h2>{{ plugin.name }}</h2>
            <span>{{ plugin.id }} · API v{{ plugin.apiVersion }}</span>
          </div>
          <span class="loaded"><Check :size="13" /> 已加载</span>
        </div>

        <p class="description">{{ plugin.desc }}</p>
        <div class="capabilities">
          <span v-for="capability in capabilitiesFor(plugin)" :key="capability">{{ capability }}</span>
        </div>

        <div class="package-state">
          <Package :size="14" />
          <span v-if="packageFor(plugin.id)">ZIP 包 {{ packageFor(plugin.id)?.version }} · {{ packageFor(plugin.id)?.file }}</span>
          <span v-else>源码内置插件，未发现对应 ZIP 包</span>
        </div>

        <footer class="plugin-actions">
          <RouterLink class="action primary" :to="`/tools/${plugin.path}`">
            打开工具 <ChevronRight :size="14" />
          </RouterLink>
          <RouterLink class="action" to="/settings#plugins">
            <Settings2 :size="14" /> 插件设置
          </RouterLink>
        </footer>
      </article>
    </div>
  </section>
</template>

<style scoped>
.heading-line { display: flex; align-items: flex-start; justify-content: space-between; }
.heading-icon { color: var(--accent); opacity: .75; }
.summary { display: flex; align-items: center; gap: 28px; margin-bottom: 16px; padding: 14px 16px; }
.summary-item { display: flex; flex-direction: column; gap: 2px; min-width: 90px; }
.summary-item strong { font-size: 20px; font-variant-numeric: tabular-nums; }
.summary-item span, .summary-note { color: var(--text-secondary); font-size: 11px; }
.summary-note { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.plugin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; }
.plugin-card { display: flex; flex-direction: column; min-height: 222px; padding: 16px; }
.plugin-head { display: flex; align-items: center; gap: 10px; }
.plugin-icon { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; }
.plugin-title { display: flex; flex: 1; flex-direction: column; gap: 3px; min-width: 0; }
.plugin-title h2 { margin: 0; font-size: 15px; }
.plugin-title span { overflow: hidden; color: var(--text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.loaded { display: inline-flex; align-items: center; gap: 3px; color: #34a853; font-size: 10px; white-space: nowrap; }
.description { min-height: 38px; margin: 14px 0 10px; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.capabilities { display: flex; flex-wrap: wrap; gap: 6px; }
.capabilities span { padding: 3px 7px; border-radius: 5px; background: rgba(0, 0, 0, .05); color: var(--text-secondary); font-size: 10px; }
.package-state { display: flex; align-items: center; gap: 6px; margin-top: auto; padding-top: 13px; color: var(--text-secondary); font-size: 10px; }
.package-state span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.plugin-actions { display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hairline); }
.action { display: inline-flex; align-items: center; gap: 4px; padding: 6px 8px; border-radius: 6px; color: var(--text-secondary); font-size: 11px; text-decoration: none; }
.action:hover { background: rgba(0, 0, 0, .05); color: var(--text); }
.action.primary { color: var(--accent); }
@media (max-width: 620px) { .summary { flex-wrap: wrap; gap: 14px; } .summary-note { width: 100%; margin-left: 0; } .plugin-grid { grid-template-columns: 1fr; } }
</style>
