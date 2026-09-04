<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ChevronRight, Sparkles } from 'lucide-vue-next';
import { pluginRuntime } from '../plugins/runtime';

const tools = pluginRuntime.enabledTools;
</script>

<template>
  <section class="page">
    <header class="page-head">
      <h1>小工具</h1>
      <p class="sub">
        来自 wttch-labs 的一组小工具，点击卡片即可打开。
      </p>
    </header>

    <div class="grid">
      <RouterLink
        v-for="tool in tools"
        :key="tool.id"
        :to="`/tools/${tool.path}`"
        class="card tool-card"
      >
        <span
          class="tool-icon"
          :style="{ color: tool.tint[0], background: tool.tint[1] }"
        >
          <component
            :is="tool.icon"
            :size="22"
            :stroke-width="1.8"
          />
        </span>

        <span class="tool-meta">
          <span class="tool-name">{{ tool.name }}</span>
          <span class="tool-desc">{{ tool.desc }}</span>
          <span class="tool-tags">
            <span
              v-for="tag in tool.tags"
              :key="tag"
              class="tag"
            >{{ tag }}</span>
          </span>
        </span>

        <ChevronRight
          class="tool-chevron"
          :size="18"
          :stroke-width="2"
        />
      </RouterLink>
    </div>

    <p class="more-hint">
      <Sparkles
        :size="14"
        :stroke-width="1.8"
      />
      更多小工具正在规划中，敬请期待。
    </p>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}

.tool-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 16px;
  color: inherit;
  text-decoration: none;
  transition:
    transform 0.14s ease,
    box-shadow 0.14s ease,
    border-color 0.14s ease;
}

.tool-card:hover {
  transform: translateY(-1px);
  border-color: rgba(0, 0, 0, 0.16);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
}

.tool-icon {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 11px;
}

.tool-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 5px;
}

.tool-name {
  font-size: 15px;
  font-weight: 600;
}

.tool-desc {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.tool-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.tag {
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
}

.tool-chevron {
  flex: 0 0 auto;
  align-self: center;
  margin-left: auto;
  color: rgba(0, 0, 0, 0.22);
  transition: color 0.14s ease;
}

.tool-card:hover .tool-chevron {
  color: var(--accent);
}

.more-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 34px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
