<!--
  文件说明：渲染工作台主导航与插件导航，展示当前页面入口并提供侧栏折叠和 AI 聊天操作。
-->

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAiChat } from '../composables/useAiChat';
import { pluginNavigation } from '../composables/usePluginNavigation';
import type { Component } from 'vue';
import {
  Bot,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  Settings,
  Wrench,
} from 'lucide-vue-next';

interface NavItem {
  label: string;
  path: string;
  icon: Component;
}

const primaryItems: NavItem[] = [
  { label: '主页', path: '/home', icon: Home },
  { label: '小工具', path: '/tools', icon: Wrench },
];
const utilityItems: NavItem[] = [
  { label: '插件', path: '/plugins', icon: Puzzle },
  { label: '设置', path: '/settings', icon: Settings },
];

// 插件菜单位于工具库与管理入口之间，保留主页、插件管理和设置的固定位置。
const navItems = computed(() => [
  ...primaryItems.map((item) => ({ ...item, id: item.path, to: item.path })),
  ...pluginNavigation.visibleEntries.value.map((entry) => ({
    id: entry.id, label: entry.label, icon: entry.plugin.icon, to: entry.to,
  })),
  ...utilityItems.map((item) => ({ ...item, id: item.path, to: item.path })),
]);
const collapsed = ref(false);
const { open: openAiChat, opened: aiChatOpened } = useAiChat();
</script>

<template>
  <aside
    class="sidebar"
    :class="{ collapsed }"
  >
    <nav
      class="nav"
      aria-label="主导航"
    >
      <RouterLink
        v-for="item in navItems"
        :key="item.id"
        :to="item.to"
        active-class=""
        exact-active-class="is-active"
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
        title="AI 聊天"
        :aria-expanded="aiChatOpened"
        aria-haspopup="dialog"
        @click="openAiChat"
      >
        <Bot :size="18" />
        <span
          v-show="!collapsed"
          class="collapse-label"
        >AI 聊天</span>
      </button>
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
  min-height: 0;
  overflow-y: auto;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 30px;
  flex-shrink: 0;
  padding: 0 10px;
  border-radius: 7px;
  color: var(--text-secondary);
  text-decoration: none;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}

.nav-item:hover {
  background: var(--accent-weak);
  color: var(--text);
}

/* 精确匹配防止插件页与其父路由“小工具”同时高亮。 */
.nav-item.is-active {
  background: var(--accent-weak);
  color: var(--accent);
}

.nav-icon {
  flex: 0 0 auto;
}

.nav-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
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
  flex-shrink: 0;
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
  background: var(--accent-weak);
  color: var(--text);
}

.collapse-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
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
