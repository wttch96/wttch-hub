<!--
  文件说明：管理首页 Widget 的添加、移除、拖动、缩放和固定，并保存和恢复网格布局。
-->

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Grip, Pin, PinOff, Plus, RotateCcw, X } from 'lucide-vue-next';
import { pluginRuntime } from '../plugins/runtime';
import PluginWidgetHost from './PluginWidgetHost.vue';

const columns = 12;
const gap = 12;
/** id 是实例 ID，pluginId 决定加载哪个插件；同一插件可创建多个实例。 */
type WidgetItem = { id: string; pluginId: string; x: number; y: number; w: number; h: number; pinned: boolean };
const widgetPlugins = pluginRuntime.enabledWidgets;
const defaults: WidgetItem[] = widgetPlugins.value.map((plugin, index) => ({
  id: plugin.id,
  pluginId: plugin.id,
  x: (index % 2) * 6,
  y: Math.floor(index / 2) * 2,
  w: plugin.widget?.defaultWidth ?? 6,
  h: plugin.widget?.defaultHeight ?? 2,
  pinned: false,
}));
const items = ref<WidgetItem[]>(defaults.map((item) => ({ ...item })));
const active = ref<{ id: string; mode: 'drag' | 'resize'; startX: number; startY: number; item: WidgetItem } | null>(null);
const grid = ref<HTMLElement>();
const storageKey = 'wttch-hub:home-widgets';
const showLibrary = ref(false);
const widgetsReady = ref(false);
const cellWidth = 88;
const cellHeight = 66;
let deferredWidgets: ReturnType<typeof setTimeout> | undefined;

const pluginFor = (pluginId: string) => widgetPlugins.value.find((plugin) => plugin.id === pluginId);
const minSizeFor = (pluginId: string) => {
  const widget = pluginFor(pluginId)?.widget;
  return { width: widget?.minWidth ?? 3, height: widget?.minHeight ?? 2 };
};
const normalizeItem = (item: WidgetItem): WidgetItem => {
  const minimum = minSizeFor(item.pluginId);
  const width = Math.max(minimum.width, Math.min(columns, item.w));
  return {
    ...item,
    x: Math.max(0, Math.min(columns - width, item.x)),
    w: width,
    h: Math.max(minimum.height, item.h),
    pinned: Boolean(item.pinned),
  };
};
const styleFor = (item: WidgetItem) => ({
  left: `${item.x * (cellWidth + gap)}px`,
  top: `${item.y * (cellHeight + gap)}px`,
  width: `${item.w * cellWidth + (item.w - 1) * gap}px`,
  height: `${item.h * cellHeight + (item.h - 1) * gap}px`,
});
const gridHeight = computed(() => Math.max(1, ...items.value.map((item) => item.y + item.h)));
// 当前每个插件只有一个默认 Widget，因此同一插件只能添加一次。
// 扩展为 widgets[] 后，这里会改为按 pluginId + widgetId 判断。
const availablePlugins = computed(() => widgetPlugins.value.filter((plugin) => !items.value.some((item) => item.pluginId === plugin.id)));
const gridStyle = computed(() => ({
  height: `${gridHeight.value * cellHeight + Math.max(0, gridHeight.value - 1) * gap}px`,
}));

const save = () => localStorage.setItem(storageKey, JSON.stringify(items.value));
const reset = () => { items.value = defaults.map((item) => ({ ...item })); save(); };
const addWidget = (pluginId: string) => {
  const plugin = pluginFor(pluginId);
  if (!plugin?.widget) return;
  const minimum = minSizeFor(pluginId);
  const nextY = Math.max(0, ...items.value.map((item) => item.y + item.h));
  items.value.push({ id: crypto.randomUUID(), pluginId, x: 0, y: nextY, w: Math.max(minimum.width, plugin.widget.defaultWidth), h: Math.max(minimum.height, plugin.widget.defaultHeight), pinned: false });
  save();
  showLibrary.value = false;
};
const overlaps = (first: WidgetItem, second: WidgetItem) => first.x < second.x + second.w
  && first.x + first.w > second.x
  && first.y < second.y + second.h
  && first.y + first.h > second.y;
const hasCollision = (item: WidgetItem) => items.value.some((other) => other.id !== item.id && overlaps(item, other));
const begin = (event: PointerEvent, item: WidgetItem, mode: 'drag' | 'resize') => {
  if (!grid.value || item.pinned) return;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  active.value = { id: item.id, mode, startX: event.clientX, startY: event.clientY, item: { ...item } };
};
const move = (event: PointerEvent) => {
  if (!active.value || !grid.value) return;
  const dx = Math.round((event.clientX - active.value.startX) / (cellWidth + gap));
  const dy = Math.round((event.clientY - active.value.startY) / (cellHeight + gap));
  const item = items.value.find((entry) => entry.id === active.value?.id);
  if (!item) return;
  if (active.value.mode === 'drag') {
    item.x = Math.max(0, Math.min(columns - item.w, active.value.item.x + dx));
    item.y = Math.max(0, active.value.item.y + dy);
  } else {
    const minimum = minSizeFor(item.pluginId);
    item.w = Math.max(minimum.width, Math.min(columns - item.x, active.value.item.w + dx));
    item.h = Math.max(minimum.height, active.value.item.h + dy);
  }
};
const end = () => {
  if (active.value) {
    const item = items.value.find((entry) => entry.id === active.value?.id);
    if (item && hasCollision(item)) Object.assign(item, active.value.item);
    save();
  }
  active.value = null;
};
const togglePin = (item: WidgetItem) => {
  item.pinned = !item.pinned;
  save();
};
const removeWidget = (id: string) => { items.value = items.value.filter((item) => item.id !== id); save(); };

onMounted(() => {
  const stored = localStorage.getItem(storageKey);
  if (stored) try {
    const parsed = JSON.parse(stored) as WidgetItem[];
    if (Array.isArray(parsed) && parsed.every((item) => item.id && item.w && item.h)) {
      items.value = parsed
        .map((item) => ({ ...item, pluginId: item.pluginId ?? item.id, id: item.pluginId ? item.id : crypto.randomUUID() }))
        .filter((item) => pluginFor(item.pluginId))
        .filter((item, index, list) => list.findIndex((other) => other.pluginId === item.pluginId) === index)
        .map(normalizeItem);
    }
  } catch { /* Ignore an invalid local layout. */ }
  // Let the shell and its first meaningful paint settle before async widget
  // chunks, timers and IPC sampling begin.
  deferredWidgets = setTimeout(() => { widgetsReady.value = true; }, 400);
});
onBeforeUnmount(() => clearTimeout(deferredWidgets));
</script>

<template>
  <section class="widget-section">
    <div class="section-title-row">
      <h3 class="section-title">主页 Widget</h3>
      <div class="widget-actions">
        <button class="add" type="button" title="从 Widget 库添加" @click="showLibrary = !showLibrary"><Plus :size="14" /> 添加 Widget</button>
        <button class="reset" type="button" title="恢复默认布局" @click="reset"><RotateCcw :size="14" /> 重置</button>
      </div>
    </div>
    <div v-if="widgetsReady && showLibrary" class="library card">
      <button v-for="plugin in availablePlugins" :key="plugin.id" type="button" class="library-item" @click="addWidget(plugin.id)">
        <component :is="plugin.icon" :size="16" :style="{ color: plugin.tint[0] }" />
        <span>{{ plugin.name }}</span>
        <Plus :size="14" />
      </button>
      <span v-if="!availablePlugins.length" class="empty">所有 Widget 已添加</span>
    </div>
    <div
      v-if="widgetsReady"
      ref="grid"
      class="widget-grid"
      :style="gridStyle"
      @pointermove="move"
      @pointerup="end"
      @pointercancel="end"
    >
      <article
        v-for="item in items"
        :key="item.id"
        class="widget card"
        :style="styleFor(item)"
      >
        <div v-if="!item.pinned" class="widget-drag" title="拖动 Widget" @pointerdown="begin($event, item, 'drag')"><Grip :size="15" /></div>
        <PluginWidgetHost :plugin-id="item.pluginId" :instance-id="item.id" />
        <span
          v-if="active?.id === item.id && active.mode === 'resize'"
          class="size-indicator"
        >{{ item.w }} × {{ item.h }}</span>
        <button
          class="pin"
          :class="{ 'is-pinned': item.pinned }"
          :title="item.pinned ? '取消固定' : '固定当前位置'"
          type="button"
          @pointerdown.stop
          @click="togglePin(item)"
        >
          <PinOff v-if="item.pinned" :size="14" />
          <Pin v-else :size="14" />
        </button>
        <button class="remove" type="button" title="移除 Widget" @pointerdown.stop @click="removeWidget(item.id)"><X :size="14" /></button>
        <button v-if="!item.pinned" class="resize" title="调整大小" type="button" @pointerdown="begin($event, item, 'resize')" />
      </article>
    </div>
  </section>
</template>

<style scoped>
.widget-section { margin-top: 26px; overflow-x: auto; }
.section-title-row { display: flex; align-items: center; justify-content: space-between; margin: 0 0 8px 2px; }
.section-title { margin: 0; color: var(--text-secondary); font-size: 12px; font-weight: 600; letter-spacing: .03em; }
.reset { display: inline-flex; align-items: center; gap: 5px; border: 0; background: transparent; color: var(--text-secondary); font-size: 12px; cursor: pointer; }
.reset:hover { color: var(--accent); }
.widget-actions { display: flex; align-items: center; gap: 10px; }
.add, .reset { display: inline-flex; align-items: center; gap: 5px; border: 0; background: transparent; color: var(--text-secondary); font-size: 12px; cursor: pointer; }
.add:hover, .reset:hover { color: var(--accent); }
.library { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; padding: 10px; }
.library-item { display: inline-flex; align-items: center; gap: 7px; padding: 7px 9px; border: 1px solid var(--hairline); border-radius: 7px; background: transparent; color: var(--text); font-size: 12px; cursor: pointer; }
.library-item:hover { border-color: var(--accent); background: rgba(10, 132, 255, .06); }
.empty { padding: 5px; color: var(--text-secondary); font-size: 12px; }
.widget-grid { position: relative; min-width: 1188px; }
.widget { position: absolute; overflow: hidden; }
.widget-drag { position: absolute; z-index: 2; top: 8px; right: 60px; padding: 3px; color: var(--text-secondary); cursor: grab; touch-action: none; }
.widget-drag:active { cursor: grabbing; }
.pin { position: absolute; z-index: 2; top: 8px; right: 34px; display: inline-flex; padding: 4px; border: 0; border-radius: 5px; background: var(--card-bg); color: var(--text-secondary); cursor: pointer; }
.pin.is-pinned { right: 34px; }
.pin:hover { color: var(--accent); }
.remove { position: absolute; z-index: 2; top: 8px; right: 8px; display: inline-flex; padding: 4px; border: 0; border-radius: 5px; background: var(--card-bg); color: var(--text-secondary); cursor: pointer; }
.remove:hover { color: var(--danger); }
.resize { position: absolute; z-index: 2; right: 0; bottom: 0; width: 18px; height: 18px; border: 0; background: linear-gradient(135deg, transparent 50%, var(--accent) 50%); cursor: nwse-resize; touch-action: none; }
.size-indicator { position: absolute; z-index: 3; right: 10px; bottom: 10px; padding: 4px 7px; border: 1px solid rgba(255, 255, 255, .7); border-radius: 5px; background: rgba(29, 29, 31, .78); color: #fff; font-size: 12px; font-variant-numeric: tabular-nums; pointer-events: none; }
</style>
