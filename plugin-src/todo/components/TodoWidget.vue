<!--
  文件说明：在首页 Widget 中展示待办摘要和快捷操作，复用待办插件状态与显示设置。
-->

<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { Check, Circle, ListTodo, Plus } from 'lucide-vue-next';
import { PLUGIN_COMPONENT_API_KEY, type PluginComponentApi } from '@wttch-hub/plugin-api';
import { addTodo, connectTodoStore, todoState, toggleTodo, type TodoPriority } from '../store';

const props = withDefaults(defineProps<{ defaultPriority?: TodoPriority; widgetLimit?: number }>(), { defaultPriority: 'normal', widgetLimit: 4 });
const api = inject<PluginComponentApi>(PLUGIN_COMPONENT_API_KEY); connectTodoStore(api);
const draft = ref('');
const items = computed(() => todoState.items.filter((item) => !item.completed)
  .sort((a, b) => todoState.lanes.findIndex((lane) => lane.id === a.laneId) - todoState.lanes.findIndex((lane) => lane.id === b.laneId) || a.order - b.order)
  .slice(0, Math.max(2, props.widgetLimit)));
const laneTitle = (laneId: string) => todoState.lanes.find((lane) => lane.id === laneId)?.title ?? '待处理';
const submit = () => { if (addTodo({ title: draft.value, priority: props.defaultPriority })) draft.value = ''; };
</script>

<template>
  <section class="todo-widget"><header><span><ListTodo :size="15" />待办泳道</span><strong>{{ items.length }}</strong></header><form @submit.prevent="submit"><input v-model="draft" maxlength="120" placeholder="快速添加到待处理…" aria-label="快速添加待办"><button type="submit" aria-label="添加"><Plus :size="14" /></button></form><div v-if="items.length" class="items"><button v-for="item in items" :key="item.id" type="button" @click="toggleTodo(item.id)"><Circle :size="14" /><span><b>{{ item.title }}</b><small>{{ laneTitle(item.laneId) }}</small></span><i :class="item.priority" /></button></div><div v-else class="empty"><Check :size="20" /><span>全部完成</span></div></section>
</template>

<style scoped>
.todo-widget { height: 100%; padding: 14px 16px; color: var(--text); } header, header span, form, .items button, .empty { display: flex; align-items: center; } header { justify-content: space-between; padding-right: 76px; } header span { gap: 6px; color: var(--text-secondary); font-size: 11px; font-weight: 600; } header svg { color: var(--success); } header strong { color: var(--success); }
form { gap: 5px; margin-top: 10px; } form input { min-width: 0; flex: 1; padding: 6px 8px; border: 1px solid var(--border); border-radius: 7px; outline: 0; background: var(--content-bg); color: var(--text); font-size: 11px; } form button { display: inline-flex; padding: 6px; border: 0; border-radius: 6px; background: var(--success); color: #fff; cursor: pointer; }
.items { margin-top: 7px; } .items button { width: 100%; gap: 6px; padding: 3px 0; border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; } .items button:hover { color: var(--text); } .items span { display: flex; min-width: 0; flex: 1; align-items: center; gap: 6px; } .items b { min-width: 0; overflow: hidden; color: inherit; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; font-weight: 500; } .items small { flex: 0 0 auto; padding: 1px 4px; border-radius: 4px; background: var(--accent-weak); color: var(--accent); font-size: 7px; } .items i { width: 5px; height: 5px; margin-left: auto; border-radius: 50%; background: var(--text-secondary); } .items i.high { background: var(--danger); } .items i.low { background: var(--success); } .empty { justify-content: center; gap: 7px; height: 70px; color: var(--text-secondary); font-size: 11px; } .empty svg { color: var(--success); }
</style>
