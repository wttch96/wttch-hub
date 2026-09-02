<script setup lang="ts">
import { ref } from 'vue';
import type { Component } from 'vue';
import {
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Wrench,
} from 'lucide-vue-next';

interface NavItem {
  label: string;
  path: string;
  icon: Component;
}

const navItems: NavItem[] = [
  { label: '主页', path: '/home', icon: Home },
  { label: '小工具', path: '/tools', icon: Wrench },
  { label: '设置', path: '/settings', icon: Settings },
];

const collapsed = ref(false);
</script>

<template>
  <aside
    class="sidebar"
    :class="{ collapsed }"
  >
    <nav class="nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :title="item.label"
      >
        <component
          :is="item.icon"
          class="nav-icon"
          :size="19"
          :stroke-width="1.7"
        />
        <span
          v-show="!collapsed"
          class="nav-label"
        >{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="footer">
      <button
        type="button"
        class="collapse-btn"
        :title="collapsed ? '展开侧栏' : '折叠侧栏'"
        :aria-expanded="!collapsed"
        @click="collapsed = !collapsed"
      >
        <component
          :is="collapsed ? PanelLeftOpen : PanelLeftClose"
          :size="17"
          :stroke-width="1.7"
        />
        <span
          v-show="!collapsed"
          class="collapse-label"
        >折叠侧栏</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 4px;
  width: 212px;
  padding: 10px 8px;
  overflow: hidden;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--hairline);
  transition: width 0.18s ease;
}

.sidebar.collapsed {
  width: 60px;
}

.nav {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 30px;
  padding: 0 10px;
  border-radius: 7px;
  color: var(--text-secondary);
  text-decoration: none;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}

.nav-item:hover {
  background: rgba(0, 0, 0, 0.055);
  color: var(--text);
}

/* vue-router's active class: macOS-style tinted pill. */
.nav-item.router-link-active {
  background: rgba(10, 132, 255, 0.16);
  color: #0060c0;
}

.nav-icon {
  flex: 0 0 auto;
}

.nav-label {
  font-size: 13px;
  white-space: nowrap;
}

.footer {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--hairline);
}

.collapse-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}

.collapse-btn:hover {
  background: rgba(0, 0, 0, 0.055);
  color: var(--text);
}

.collapse-label {
  font-size: 13px;
  white-space: nowrap;
}

/* Collapsed: center the icons, drop the labels. */
.sidebar.collapsed .nav-item,
.sidebar.collapsed .collapse-btn {
  justify-content: center;
  padding: 0;
}
</style>
