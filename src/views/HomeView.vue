<script setup lang="ts">
import { Settings, Wrench } from 'lucide-vue-next';

const shortcuts = [
  { label: '小工具', desc: '管理常用小工具', path: '/tools', icon: Wrench },
  { label: '设置', desc: '偏好与应用设置', path: '/settings', icon: Settings },
];
</script>

<template>
  <section class="page">
    <header class="page-head">
      <h1>主页</h1>
      <p class="sub">
        欢迎回来 👋 这是 wttch-hub 的概览。
      </p>
    </header>

    <div class="card hero">
      <h2>💖 Welcome to wttch-hub!</h2>
      <p>Electron · Vue 3 · Vite (electron-forge)，mac 风格外壳已经就绪。</p>
    </div>

    <h3 class="section-title">
      快捷入口
    </h3>
    <div class="grid">
      <RouterLink
        v-for="item in shortcuts"
        :key="item.path"
        :to="item.path"
        class="card shortcut"
      >
        <component
          :is="item.icon"
          :size="22"
          :stroke-width="1.7"
        />
        <div class="shortcut-text">
          <span class="shortcut-label">{{ item.label }}</span>
          <span class="shortcut-desc">{{ item.desc }}</span>
        </div>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 20px 22px;
}

.hero h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.hero p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.section-title {
  margin: 26px 0 8px 2px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.03em;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.shortcut {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  color: var(--text);
  text-decoration: none;
  transition:
    border-color 0.12s ease,
    transform 0.12s ease;
}

.shortcut:hover {
  border-color: rgba(10, 132, 255, 0.5);
  transform: translateY(-1px);
}

.shortcut .lucide {
  flex: 0 0 auto;
  color: var(--accent);
}

.shortcut-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shortcut-label {
  font-weight: 600;
}

.shortcut-desc {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
