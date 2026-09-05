<!--
  文件说明：提供插件导航名称、显示开关与顺序的编辑界面，并支持恢复默认导航配置。
-->

<script setup lang="ts">
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-vue-next';
import { pluginNavigation } from '../composables/usePluginNavigation';
import { NAVIGATION_LABEL_LIMIT } from '../plugins/navigation';

const { entries, setVisible, rename, move, reset } = pluginNavigation;
const changeVisibility = (id: string, event: Event) => {
  const input = event.target as HTMLInputElement;
  setVisible(id, input.checked);
  // 保存失败时立即回显已保存的值，避免原生输入状态与响应式状态不一致。
  input.checked = entries.value.find((entry) => entry.id === id)?.visible ?? false;
};
const changeLabel = (id: string, event: Event) => {
  const input = event.target as HTMLInputElement;
  rename(id, input.value);
  // 统一回显去空白后的名称；空名称恢复插件默认名，菜单始终有可读文本。
  input.value = entries.value.find((entry) => entry.id === id)?.label ?? '';
};
const finishEditing = (event: KeyboardEvent) => (event.target as HTMLInputElement).blur();
</script>

<template>
  <section
    id="navigation"
    class="group navigation-settings"
    aria-labelledby="navigation-title"
  >
    <div class="navigation-heading">
      <h3
        id="navigation-title"
        class="group-title"
      >
        导航菜单
      </h3>
      <button
        v-if="entries.length"
        type="button"
        class="navigation-reset"
        @click="reset()"
      >
        <RotateCcw :size="13" />
        恢复默认
      </button>
    </div>
    <p class="navigation-description">
      为支持导航的插件设置菜单名称、显示状态和顺序，修改后自动保存。名称留空可恢复默认名称。
    </p>
    <ol
      v-if="entries.length"
      class="card navigation-list"
    >
      <li
        v-for="(entry, index) in entries"
        :key="entry.id"
        class="navigation-row"
      >
        <component
          :is="entry.plugin.icon"
          class="navigation-icon"
          :size="18"
          :style="{ color: entry.plugin.tint[0] }"
          aria-hidden="true"
        />
        <div class="navigation-details">
          <label :for="`nav-label-${entry.id}`">
            {{ entry.plugin.name }}
            <span v-if="!entry.enabled"> · 已禁用，启用后按设置显示</span>
          </label>
          <input
            :id="`nav-label-${entry.id}`"
            class="navigation-name"
            type="text"
            :value="entry.label"
            :maxlength="NAVIGATION_LABEL_LIMIT"
            :aria-label="`${entry.plugin.name}的菜单名称`"
            @change="changeLabel(entry.id, $event)"
            @keydown.enter="finishEditing"
          >
        </div>
        <label class="navigation-visible">
          <input
            type="checkbox"
            :checked="entry.visible"
            :aria-label="`在导航中显示${entry.plugin.name}`"
            @change="changeVisibility(entry.id, $event)"
          >
          显示
        </label>
        <div class="navigation-actions">
          <button
            type="button"
            :disabled="index === 0"
            :aria-label="`上移${entry.label}`"
            title="上移"
            @click="move(entry.id, -1)"
          >
            <ArrowUp :size="15" />
          </button>
          <button
            type="button"
            :disabled="index === entries.length - 1"
            :aria-label="`下移${entry.label}`"
            title="下移"
            @click="move(entry.id, 1)"
          >
            <ArrowDown :size="15" />
          </button>
        </div>
      </li>
    </ol>
    <p
      v-else
      class="card navigation-empty"
    >
      暂无支持导航菜单的插件。
    </p>
  </section>
</template>

<style scoped>
.navigation-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.navigation-heading .group-title { margin-bottom: 0; }
.navigation-description, .navigation-empty {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}
.navigation-description { margin: 8px 0 12px; }
.navigation-list { margin: 0; padding: 0; list-style: none; }
.navigation-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
.navigation-row + .navigation-row { border-top: 1px solid var(--hairline); }
.navigation-icon { flex-shrink: 0; }
.navigation-details { display: grid; flex: 1; min-width: 0; gap: 6px; }
.navigation-details label { color: var(--text-secondary); font-size: 11px; }
.navigation-name {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid var(--hairline);
  border-radius: 5px;
  background: var(--content-bg);
  color: var(--text);
  font: inherit;
  font-size: 13px;
}
.navigation-visible { display: flex; align-items: center; gap: 5px; font-size: 12px; white-space: nowrap; }
.navigation-visible input { accent-color: var(--accent); }
.navigation-actions { display: flex; gap: 4px; }
.navigation-actions button, .navigation-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--hairline);
  border-radius: 5px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.navigation-actions button:disabled { opacity: 0.35; cursor: default; }
.navigation-actions button:not(:disabled):hover, .navigation-reset:hover { color: var(--accent); background: var(--accent-weak); }
.navigation-name:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.navigation-empty { padding: 16px; }
@media (max-width: 700px) {
  .navigation-row { flex-wrap: wrap; gap: 10px; padding: 12px; }
  .navigation-details { flex-basis: calc(100% - 32px); }
  .navigation-visible { margin-left: 28px; }
  .navigation-actions { margin-left: auto; }
}
</style>
