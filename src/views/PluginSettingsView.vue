<!--
  文件说明：渲染单个插件的独立设置页面，管理该插件的启用状态和声明式配置字段，不混入其他插件的配置。
-->

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowLeft, Settings2 } from 'lucide-vue-next';
import { RouterLink, useRouter } from 'vue-router';
import { findTool } from '../config/tools';
import { pluginRuntime } from '../plugins/runtime';

const props = defineProps<{ pluginId: string }>();
const router = useRouter();
const plugin = computed(() => findTool(props.pluginId));
const state = computed(() => pluginRuntime.states[props.pluginId]);
const values = computed(() => pluginRuntime.values[props.pluginId] ?? {});
const changingEnabled = ref(false);

/**
 * 配置页面不阻止禁用插件的访问：用户可以先查看说明、修改参数，再自行重新启用。
 * 真正的生命周期切换仍交给运行时队列，避免重复点击产生并发 load/unload。
 */
const changeEnabled = async (event: Event) => {
  const next = (event.target as HTMLInputElement).checked;
  changingEnabled.value = true;
  try { await pluginRuntime.setEnabled(props.pluginId, next); }
  finally { changingEnabled.value = false; }
};

const changeSetting = (key: string, event: Event, type: string) => {
  const input = event.target as HTMLInputElement | HTMLSelectElement;
  const value = type === 'boolean' ? (input as HTMLInputElement).checked : type === 'number' ? Number(input.value) : input.value;
  pluginRuntime.updateSetting(props.pluginId, key, value);
};

const returnToPlugins = () => { void router.push('/plugins'); };
</script>

<template>
  <section v-if="plugin" class="page">
    <header class="page-head">
      <RouterLink class="back-link" to="/plugins"><ArrowLeft :size="15" /> 返回插件</RouterLink>
      <div class="plugin-heading">
        <span class="plugin-icon" :style="{ color: plugin.tint[0], background: plugin.tint[1] }">
          <component :is="plugin.icon" :size="22" />
        </span>
        <div>
          <h1>{{ plugin.name }}设置</h1>
          <p class="sub">{{ plugin.id }} · API v{{ plugin.apiVersion }}</p>
        </div>
      </div>
    </header>

    <div class="group">
      <h3 class="group-title">插件状态</h3>
      <div class="card">
        <div class="row">
          <div>
            <strong>启用插件</strong>
            <p>关闭后会停止该插件的页面、Widget、服务和后台任务。</p>
          </div>
          <label class="switch">
            <input
              :checked="Boolean(state?.enabled)"
              :disabled="changingEnabled"
              type="checkbox"
              @change="changeEnabled"
            >
            <span class="track" />
            <span class="knob" />
          </label>
        </div>
        <p class="runtime-status">当前状态：{{ state?.status === 'active' ? '运行中' : state?.status === 'ready' ? '已加载' : state?.status === 'error' ? `错误：${state.error}` : '已禁用' }}</p>
      </div>
    </div>

    <div class="group">
      <h3 class="group-title">插件配置</h3>
      <div class="card settings-card">
        <div class="settings-intro">
          <Settings2 :size="18" />
          <p>{{ plugin.settings?.description || '这个插件暂时没有可配置的选项。' }}</p>
        </div>
        <div v-for="field in plugin.settings?.fields ?? []" :key="field.key" class="row setting-row">
          <div class="field-copy">
            <strong>{{ field.label }}</strong>
            <p v-if="field.description">{{ field.description }}</p>
          </div>
          <select
            v-if="field.type === 'select'"
            class="control"
            :value="values[field.key]"
            @change="changeSetting(field.key, $event, field.type)"
          >
            <option v-for="option in field.options ?? []" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <input
            v-else-if="field.type !== 'boolean'"
            class="control"
            :type="field.type"
            :value="values[field.key]"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            @change="changeSetting(field.key, $event, field.type)"
          >
          <label v-else class="switch">
            <input :checked="Boolean(values[field.key])" type="checkbox" @change="changeSetting(field.key, $event, field.type)">
            <span class="track" />
            <span class="knob" />
          </label>
        </div>
      </div>
    </div>
  </section>

  <section v-else class="page missing-plugin">
    <Settings2 :size="28" />
    <h1>插件不存在</h1>
    <p class="sub">该插件可能已被移除，或当前版本尚未包含它。</p>
    <button type="button" @click="returnToPlugins"><ArrowLeft :size="15" /> 返回插件</button>
  </section>
</template>

<style scoped>
.back-link { display: inline-flex; align-items: center; gap: 5px; margin-bottom: 14px; color: var(--text-secondary); font-size: 12px; text-decoration: none; }
.back-link:hover { color: var(--accent); }
.plugin-heading { display: flex; align-items: center; gap: 12px; }
.plugin-heading h1 { margin: 0; }
.plugin-heading .sub { margin: 4px 0 0; }
.plugin-icon { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 11px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.row strong { font-size: 13px; }
p { margin: 4px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 1.55; }
.runtime-status { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hairline); }
.settings-card { padding: 0 16px; }
.settings-intro { display: flex; align-items: flex-start; gap: 9px; padding: 14px 0; color: var(--accent); }
.settings-intro p { margin: 0; color: var(--text-secondary); }
.setting-row { min-height: 60px; padding: 12px 0; border-top: 1px solid var(--hairline); }
.field-copy { min-width: 0; }
.control { width: 140px; padding: 5px 8px; border: 1px solid var(--hairline); border-radius: 6px; background: transparent; color: var(--text); text-align: right; }
.control[type='color'] { width: 44px; height: 30px; padding: 2px; cursor: pointer; }
.switch { position: relative; display: inline-block; flex: 0 0 auto; width: 40px; height: 24px; cursor: pointer; }
.switch input { position: absolute; opacity: 0; pointer-events: none; }
.switch input:disabled + .track { opacity: .5; }
.track { position: absolute; inset: 0; border-radius: 12px; background: rgba(0, 0, 0, .16); transition: background .18s ease; }
.knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, .2); transition: transform .18s ease; }
.switch input:checked + .track { background: var(--accent); }
.switch input:checked ~ .knob { transform: translateX(16px); }
.missing-plugin { display: grid; justify-items: start; gap: 10px; }
.missing-plugin h1 { margin: 0; }
.missing-plugin button { display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px; border: 1px solid var(--hairline); border-radius: 7px; background: transparent; color: var(--text); cursor: pointer; }
@media (max-width: 560px) { .setting-row { align-items: flex-start; flex-direction: column; } .control { width: 100%; text-align: left; } }
</style>
