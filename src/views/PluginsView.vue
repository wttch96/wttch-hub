<!--
  文件说明：展示插件运行状态与安装包信息，提供插件启用、禁用、加载和移除等管理操作。
-->

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { Check, ChevronRight, Package, Settings2, Power, PowerOff, Trash2, Upload } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { allTools as tools } from '../config/tools';
import type { PluginPackageInfo } from '@wttch-hub/plugin-api';
import { pluginRuntime } from '../plugins/runtime';
import { useToast } from '../composables/useToast';

const packages = ref<PluginPackageInfo[]>([]);
const packageError = ref(false);
const busy = ref(false);
const toast = useToast();
// Vue 模板中的标识符会按组件上下文解析，不能直接写 window.toolHost。
const hostAvailable = Boolean(window.toolHost);

const packageFor = (id: string) => packages.value.find((item) => item.id === id);
const packageOnly = computed(() => packages.value.filter((item) => !tools.some((tool) => tool.id === item.id)));
const capabilitiesFor = (plugin: typeof tools[number]) => [
  ...(plugin.capabilities?.ai ? ['AI'] : []),
  '工具页面',
  ...(plugin.widget ? ['Widget'] : []),
  ...(plugin.statusbar ? ['状态栏'] : []),
  ...(plugin.settings ? ['可配置'] : []),
];

const refreshPackages = async () => {
  try {
    packages.value = await window.toolHost?.pluginPackages() ?? [];
    packageError.value = false;
  } catch {
    packageError.value = true;
  }
};
const install = async () => {
  if (!window.toolHost || busy.value) return;
  busy.value = true;
  try {
    const result = await window.toolHost.installPluginPackage();
    if (!result.cancelled) {
      await refreshPackages();
      toast.success(`已加载 ${result.installed.length} 个插件定义`);
    }
  } catch (error) { toast.error(error instanceof Error ? error.message : String(error)); }
  finally { busy.value = false; }
};
const removePackage = async (pkg: PluginPackageInfo) => {
  if (!pkg.removable || !window.toolHost || !window.confirm(`确定删除插件包“${pkg.file}”吗？`)) return;
  busy.value = true;
  const removedIds = packages.value
    .filter((item) => item.file === pkg.file && item.source === pkg.source && item.removable)
    .map((item) => item.id)
    .filter((id) => tools.some((tool) => tool.id === id));
  const previouslyEnabled = removedIds.filter((id) => pluginRuntime.states[id]?.enabled);
  try {
    await Promise.all(removedIds.map((id) => pluginRuntime.setEnabled(id, false)));
    await nextTick();
    packages.value = await window.toolHost.removePluginPackage({ file: pkg.file, source: pkg.source });
    toast.success('插件包已删除');
  } catch (error) {
    await Promise.all(previouslyEnabled.map((id) => pluginRuntime.setEnabled(id, true)));
    toast.error(error instanceof Error ? error.message : String(error));
  }
  finally { busy.value = false; }
};
const toggle = (id: string) => pluginRuntime.setEnabled(id, !pluginRuntime.states[id]?.enabled);
const statusLabel = (id: string) => ({ disabled: '已禁用', loading: '加载中', ready: '已加载', activating: '激活中', active: '运行中', error: '错误' }[pluginRuntime.states[id]?.status ?? 'disabled']);

onMounted(refreshPackages);
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div class="heading-line">
        <div>
          <h1>插件</h1>
          <p class="sub">统一管理已加载的工具插件与插件包。</p>
        </div>
        <button class="load-button" type="button" :disabled="busy || !hostAvailable" @click="install"><Upload :size="15" /> 加载插件包</button>
      </div>
    </header>

    <div class="summary card">
      <div class="summary-item"><strong>{{ tools.length }}</strong><span>已加载插件</span></div>
      <div class="summary-item"><strong>{{ packages.length }}</strong><span>已识别 ZIP 包</span></div>
      <div class="summary-note">
        <Package :size="16" />
        <span>{{ packageError ? '插件包信息暂时不可用' : '插件包仓库：应用数据目录 / sandbox / 工作区' }}</span>
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
          <span class="loaded" :class="[`is-${pluginRuntime.states[plugin.id]?.status}`]">
            <Check v-if="pluginRuntime.states[plugin.id]?.enabled" :size="13" />
            <PowerOff v-else :size="13" /> {{ statusLabel(plugin.id) }}
          </span>
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
          <RouterLink v-if="pluginRuntime.states[plugin.id]?.enabled" class="action primary" :to="`/tools/${plugin.path}`">
            打开工具 <ChevronRight :size="14" />
          </RouterLink>
          <RouterLink class="action" :to="`/plugins/${plugin.id}/settings`">
            <Settings2 :size="14" /> 插件设置
          </RouterLink>
          <button class="action" type="button" @click="toggle(plugin.id)">
            <PowerOff v-if="pluginRuntime.states[plugin.id]?.enabled" :size="14" />
            <Power v-else :size="14" />
            {{ pluginRuntime.states[plugin.id]?.enabled ? '禁用' : '启用' }}
          </button>
          <button v-if="packageFor(plugin.id)?.removable" class="action danger" type="button" :disabled="busy" @click="removePackage(packageFor(plugin.id)!)"><Trash2 :size="14" /> 删除</button>
        </footer>
      </article>
      <article v-for="pkg in packageOnly" :key="`${pkg.file}:${pkg.id}`" class="card plugin-card">
        <div class="plugin-head">
          <span class="plugin-icon package-icon"><Package :size="21" /></span>
          <div class="plugin-title"><h2>{{ pkg.name }}</h2><span>{{ pkg.id }} · v{{ pkg.version }}</span></div>
          <span class="loaded is-disabled">待编译</span>
        </div>
        <p class="description">插件包已进入应用仓库，但当前构建未包含它的 Vue/TypeScript 入口。将包放入项目 plugins 目录、运行安装脚本并重新构建后即可启用。</p>
        <div class="package-state"><Package :size="14" /><span>{{ pkg.file }} · {{ pkg.source === 'managed' ? '应用插件仓库' : pkg.source === 'sandbox' ? '开发沙盒' : '工作区' }}</span></div>
        <footer class="plugin-actions">
          <button v-if="pkg.removable" class="action danger" type="button" :disabled="busy" @click="removePackage(pkg)"><Trash2 :size="14" /> 删除插件包</button>
        </footer>
      </article>
    </div>
  </section>
</template>

<style scoped>
.heading-line { display: flex; align-items: flex-start; justify-content: space-between; }
.heading-icon { color: var(--accent); opacity: .75; }
.load-button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border: 1px solid var(--hairline); border-radius: 7px; background: var(--card-bg); color: var(--accent); font-size: 12px; cursor: pointer; }
.load-button:disabled { opacity: .45; cursor: default; }
.summary { display: flex; align-items: center; gap: 28px; margin-bottom: 16px; padding: 14px 16px; }
.summary-item { display: flex; flex-direction: column; gap: 2px; min-width: 90px; }
.summary-item strong { font-size: 20px; font-variant-numeric: tabular-nums; }
.summary-item span, .summary-note { color: var(--text-secondary); font-size: 11px; }
.summary-note { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.plugin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; }
.plugin-card { display: flex; flex-direction: column; min-height: 222px; padding: 16px; }
.plugin-head { display: flex; align-items: center; gap: 10px; }
.plugin-icon { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; }
.package-icon { background: rgba(10, 132, 255, .1); color: var(--accent); }
.plugin-title { display: flex; flex: 1; flex-direction: column; gap: 3px; min-width: 0; }
.plugin-title h2 { margin: 0; font-size: 15px; }
.plugin-title span { overflow: hidden; color: var(--text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.loaded { display: inline-flex; align-items: center; gap: 3px; color: #34a853; font-size: 10px; white-space: nowrap; }
.loaded.is-disabled { color: var(--text-secondary); }
.loaded.is-error { color: #ff375f; }
.description { min-height: 38px; margin: 14px 0 10px; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.capabilities { display: flex; flex-wrap: wrap; gap: 6px; }
.capabilities span { padding: 3px 7px; border-radius: 5px; background: rgba(0, 0, 0, .05); color: var(--text-secondary); font-size: 10px; }
.package-state { display: flex; align-items: center; gap: 6px; margin-top: auto; padding-top: 13px; color: var(--text-secondary); font-size: 10px; }
.package-state span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.plugin-actions { display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hairline); }
.action { display: inline-flex; align-items: center; gap: 4px; padding: 6px 8px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); font: inherit; font-size: 11px; text-decoration: none; cursor: pointer; }
.action:hover { background: rgba(0, 0, 0, .05); color: var(--text); }
.action.primary { color: var(--accent); }
.action.danger { margin-left: auto; color: #ff375f; }
@media (max-width: 620px) { .summary { flex-wrap: wrap; gap: 14px; } .summary-note { width: 100%; margin-left: 0; } .plugin-grid { grid-template-columns: 1fr; } }
</style>
