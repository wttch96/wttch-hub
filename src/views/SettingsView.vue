<!--
  文件说明：组织通用偏好、桌面数据管理、AI、微信订阅和导航等全局配置；插件配置在各自独立页面中管理。
-->

<script setup lang="ts">
import { ref } from 'vue';
import NavigationSettings from '../components/NavigationSettings.vue';
import AiSettings from '../components/AiSettings.vue';
import DesktopSettings from '../components/DesktopSettings.vue';
import WechatSettings from '../components/WechatSettings.vue';
import { ChevronRight } from 'lucide-vue-next';

// UI 骨架阶段的占位开关，后续再接到真实的持久化配置上。
const startOnHome = ref(true);
const autoCheckUpdate = ref(true);
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
