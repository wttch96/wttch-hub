<!--
  文件说明：组织通用偏好、桌面数据管理、AI、微信订阅、导航和插件设置等配置界面。
-->

<script setup lang="ts">
import { ref } from 'vue';
import NavigationSettings from '../components/NavigationSettings.vue';
import AiSettings from '../components/AiSettings.vue';
import DesktopSettings from '../components/DesktopSettings.vue';
import WechatSettings from '../components/WechatSettings.vue';
import { ChevronRight } from 'lucide-vue-next';
import { allTools as tools } from '../config/tools';
import { pluginRuntime } from '../plugins/runtime';

// UI 骨架阶段的占位开关，后续再接到真实的持久化配置上。
const startOnHome = ref(true);
const autoCheckUpdate = ref(true);
const changeEnabled = (id: string, event: Event) => pluginRuntime.setEnabled(id, (event.target as HTMLInputElement).checked);
const changeSetting = (id: string, key: string, event: Event, type: string) => {
  const input = event.target as HTMLInputElement | HTMLSelectElement;
  const value = type === 'boolean' ? (input as HTMLInputElement).checked : type === 'number' ? Number(input.value) : input.value;
  pluginRuntime.updateSetting(id, key, value);
};

const appVersion = '0.1.0';
</script>

<template>
  <section class="page">
    <header class="page-head">
      <h1>设置</h1>
      <p class="sub">
        偏好与应用设置。
      </p>
    </header>

    <div class="group">
      <h3 class="group-title">
        通用
      </h3>
      <div class="card">
        <div class="row">
          <span class="row-label">启动时打开主页</span>
          <label class="switch">
            <input
              v-model="startOnHome"
              type="checkbox"
            >
            <span class="track" />
            <span class="knob" />
          </label>
        </div>
        <div class="row">
          <span class="row-label">自动检查更新</span>
          <label class="switch">
            <input
              v-model="autoCheckUpdate"
              type="checkbox"
            >
            <span class="track" />
            <span class="knob" />
          </label>
        </div>
      </div>
    </div>

    <DesktopSettings />
    <AiSettings />
    <WechatSettings />
    <NavigationSettings />

    <div id="plugins" class="group plugin-settings">
      <h3 class="group-title">插件配置</h3>
      <div class="plugin-list">
        <article
          v-for="plugin in tools"
          :key="plugin.id"
          class="card plugin-card"
        >
          <div class="plugin-heading">
            <span class="plugin-icon" :style="{ color: plugin.tint[0], background: plugin.tint[1] }">
              <component :is="plugin.icon" :size="17" />
            </span>
            <div class="plugin-info">
              <strong>{{ plugin.name }}</strong>
              <small>{{ plugin.id }} · API v{{ plugin.apiVersion }}</small>
            </div>
            <label class="switch">
              <input :checked="pluginRuntime.states[plugin.id]?.enabled" type="checkbox" @change="changeEnabled(plugin.id, $event)">
              <span class="track" />
              <span class="knob" />
            </label>
          </div>
          <p v-if="plugin.settings?.description" class="plugin-description">{{ plugin.settings.description }}</p>
          <div v-for="field in plugin.settings?.fields ?? []" :key="field.key" class="row plugin-field">
            <span class="row-label">{{ field.label }}</span>
            <select
              v-if="field.type === 'select'"
              class="text-input"
              :value="pluginRuntime.values[plugin.id]?.[field.key]"
              @change="changeSetting(plugin.id, field.key, $event, field.type)"
            >
              <option v-for="option in field.options ?? []" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <input
              v-else-if="field.type !== 'boolean'"
              class="text-input"
              :type="field.type"
              :value="pluginRuntime.values[plugin.id]?.[field.key]"
              :min="field.min"
              :max="field.max"
              :step="field.step"
              @change="changeSetting(plugin.id, field.key, $event, field.type)"
            >
            <label v-else class="switch">
              <input :checked="Boolean(pluginRuntime.values[plugin.id]?.[field.key])" type="checkbox" @change="changeSetting(plugin.id, field.key, $event, field.type)">
              <span class="track" />
              <span class="knob" />
            </label>
          </div>
        </article>
      </div>
    </div>

    <div class="group">
      <h3 class="group-title">
        偏好
      </h3>
      <div class="card">
        <div class="row">
          <span class="row-label">外观</span>
          <span class="row-value">跟随系统</span>
          <ChevronRight
            class="chevron"
            :size="15"
          />
        </div>
        <div class="row">
          <span class="row-label">语言</span>
          <span class="row-value">简体中文</span>
          <ChevronRight
            class="chevron"
            :size="15"
          />
        </div>
      </div>
    </div>

    <div class="group">
      <h3 class="group-title">
        关于
      </h3>
      <div class="card">
        <div class="row">
          <span class="row-label">版本</span>
          <span class="row-value">{{ appVersion }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.row-label {
  flex: 1;
  font-size: 13px;
}

.row-value {
  color: var(--text-secondary);
  font-size: 13px;
}

.plugin-list { display: grid; gap: 10px; }
.plugin-card { padding: 14px 16px; }
.plugin-heading { display: flex; align-items: center; gap: 10px; }
.plugin-icon { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; }
.plugin-info { display: flex; flex: 1; flex-direction: column; gap: 3px; min-width: 0; }
.plugin-info strong { font-size: 13px; }
.plugin-info small, .plugin-description { color: var(--text-secondary); font-size: 11px; }
.plugin-description { margin: 10px 0 0 42px; }
.plugin-field { margin-top: 9px; padding-top: 9px; border-top: 1px solid var(--hairline); }
.text-input { width: 110px; padding: 4px 7px; border: 1px solid var(--hairline); border-radius: 5px; background: transparent; color: var(--text); text-align: right; }
.text-input[type='color'] { width: 42px; height: 28px; padding: 2px; cursor: pointer; }

.chevron {
  color: rgba(0, 0, 0, 0.28);
}

/* macOS-style switch. */
.switch {
  position: relative;
  display: inline-block;
  flex: 0 0 auto;
  width: 40px;
  height: 24px;
  cursor: pointer;
}

.switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.track {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.16);
  transition: background 0.18s ease;
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.2),
    0 0 0 0.5px rgba(0, 0, 0, 0.06);
  transition: transform 0.18s ease;
}

.switch input:checked + .track {
  background: var(--accent);
}

.switch input:checked ~ .knob {
  transform: translateX(16px);
}
</style>
