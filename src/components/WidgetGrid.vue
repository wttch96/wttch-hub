<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Grip, Plus, RotateCcw } from 'lucide-vue-next';
import { widgetPlugins } from '../config/tools';

const columns = 12;
const gap = 12;
type WidgetItem = { id: string; x: number; y: number; w: number; h: number };
const defaults: WidgetItem[] = widgetPlugins.map((plugin, index) => ({
  id: plugin.id,
  x: index * 6,
  y: 0,
  w: plugin.widget?.defaultWidth ?? 6,
  h: plugin.widget?.defaultHeight ?? 2,
}));
const items = ref<WidgetItem[]>(defaults.map((item) => ({ ...item })));
const active = ref<{ id: string; mode: 'drag' | 'resize'; startX: number; startY: number; item: WidgetItem } | null>(null);
const grid = ref<HTMLElement>();
const storageKey = 'wttch-hub:home-widgets';
const showLibrary = ref(false);
const cellWidth = 88;
const cellHeight = 66;

const pluginFor = (id: string) => widgetPlugins.find((plugin) => plugin.id === id);
const minSizeFor = (id: string) => {
  const widget = pluginFor(id)?.widget;
  return { width: widget?.minWidth ?? 3, height: widget?.minHeight ?? 2 };
};
const styleFor = (item: WidgetItem) => ({
  left: `${item.x * (cellWidth + gap)}px`,
  top: `${item.y * (cellHeight + gap)}px`,
  width: `${item.w * cellWidth + (item.w - 1) * gap}px`,
  height: `${item.h * cellHeight + (item.h - 1) * gap}px`,
});
const gridHeight = computed(() => Math.max(1, ...items.value.map((item) => item.y + item.h)));
const availablePlugins = computed(() => widgetPlugins.filter((plugin) => !items.value.some((item) => item.id === plugin.id)));
const gridStyle = computed(() => ({
  height: `${gridHeight.value * cellHeight + Math.max(0, gridHeight.value - 1) * gap}px`,
}));

const save = () => localStorage.setItem(storageKey, JSON.stringify(items.value));
const reset = () => { items.value = defaults.map((item) => ({ ...item })); save(); };
const addWidget = (id: string) => {
  const plugin = pluginFor(id);
  if (!plugin?.widget) return;
  const minimum = minSizeFor(id);
  const nextY = Math.max(0, ...items.value.map((item) => item.y + item.h));
  items.value.push({ id, x: 0, y: nextY, w: Math.max(minimum.width, plugin.widget.defaultWidth), h: Math.max(minimum.height, plugin.widget.defaultHeight) });
  save();
  showLibrary.value = false;
};
const overlaps = (first: WidgetItem, second: WidgetItem) => first.x < second.x + second.w
  && first.x + first.w > second.x
  && first.y < second.y + second.h
  && first.y + first.h > second.y;
const hasCollision = (item: WidgetItem) => items.value.some((other) => other.id !== item.id && overlaps(item, other));
const begin = (event: PointerEvent, item: WidgetItem, mode: 'drag' | 'resize') => {
  if (!grid.value) return;
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
    const minimum = minSizeFor(item.id);
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

onMounted(() => {
  const stored = localStorage.getItem(storageKey);
  if (stored) try {
    const parsed = JSON.parse(stored) as WidgetItem[];
    if (Array.isArray(parsed) && parsed.every((item) => item.id && item.w && item.h)) {
      items.value = parsed
        .filter((item) => pluginFor(item.id))
        .map((item) => {
          const minimum = minSizeFor(item.id);
          return {
            ...item,
            x: Math.max(0, Math.min(columns - minimum.width, item.x)),
            w: Math.max(minimum.width, Math.min(columns - item.x, item.w)),
            h: Math.max(minimum.height, item.h),
          };
        });
    }
  } catch { /* Ignore an invalid local layout. */ }
});
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
    <div v-if="showLibrary" class="library card">
      <button v-for="plugin in availablePlugins" :key="plugin.id" type="button" class="library-item" @click="addWidget(plugin.id)">
        <component :is="plugin.icon" :size="16" :style="{ color: plugin.tint[0] }" />
        <span>{{ plugin.name }}</span>
        <Plus :size="14" />
      </button>
      <span v-if="!availablePlugins.length" class="empty">所有 Widget 已添加</span>
    </div>
    <div
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
        <div class="widget-drag" title="拖动 Widget" @pointerdown="begin($event, item, 'drag')"><Grip :size="15" /></div>
        <component
          :is="pluginFor(item.id)?.widget?.component"
          :refresh-interval-ms="pluginFor(item.id)?.widget?.refreshIntervalMs"
        />
        <span
          v-if="active?.id === item.id && active.mode === 'resize'"
          class="size-indicator"
        >{{ item.w }} × {{ item.h }}</span>
        <button class="resize" title="调整大小" type="button" @pointerdown="begin($event, item, 'resize')" />
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
.widget-drag { position: absolute; z-index: 2; top: 8px; right: 8px; padding: 3px; color: var(--text-secondary); cursor: grab; touch-action: none; }
.widget-drag:active { cursor: grabbing; }
.resize { position: absolute; z-index: 2; right: 0; bottom: 0; width: 18px; height: 18px; border: 0; background: linear-gradient(135deg, transparent 50%, var(--accent) 50%); cursor: nwse-resize; touch-action: none; }
.size-indicator { position: absolute; z-index: 3; right: 10px; bottom: 10px; padding: 4px 7px; border: 1px solid rgba(255, 255, 255, .7); border-radius: 5px; background: rgba(29, 29, 31, .78); color: #fff; font-size: 12px; font-variant-numeric: tabular-nums; pointer-events: none; }
</style>
