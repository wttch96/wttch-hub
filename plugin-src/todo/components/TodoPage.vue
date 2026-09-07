<!--
  文件说明：提供待办事项与分组管理页面，支持任务编辑和状态更新并同步到插件存储。
-->

<script setup lang="ts">
import { computed, inject, nextTick, reactive, ref } from 'vue';
import { CalendarClock, Check, Circle, GripVertical, LayoutDashboard, Pencil, Plus, Trash2, X } from 'lucide-vue-next';
import { PLUGIN_COMPONENT_API_KEY, type PluginComponentApi } from '@wttch-hub/plugin-api';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import {
  addLane, addTodo, clearCompletedTodos, connectTodoStore, moveTodo, removeLane, removeTodo,
  renameLane, todoState, toggleTodo, updateTodo, type TodoItem, type TodoPriority,
} from '../store';

const props = withDefaults(defineProps<{ defaultPriority?: TodoPriority; showCompleted?: boolean }>(), {
  defaultPriority: 'normal', showCompleted: true,
});
const api = inject<PluginComponentApi>(PLUGIN_COMPONENT_API_KEY);
connectTodoStore(api);
const firstActiveLane = () => todoState.lanes.find((lane) => !lane.completed)?.id ?? todoState.lanes[0]?.id ?? '';
const draft = reactive({ title: '', body: '', dueAt: '', priority: props.defaultPriority as TodoPriority, laneId: firstActiveLane() });
const priorities: Array<{ id: TodoPriority; label: string }> = [
  { id: 'low', label: '低' }, { id: 'normal', label: '普通' }, { id: 'high', label: '高' },
];
const pending = computed(() => todoState.items.filter((item) => !item.completed));
const completed = computed(() => todoState.items.filter((item) => item.completed));
const visibleLanes = computed(() => todoState.lanes.filter((lane) => props.showCompleted || !lane.completed));
const laneItems = (laneId: string) => todoState.items.filter((item) => item.laneId === laneId)
  .sort((a, b) => a.order - b.order);
const submit = () => {
  if (!addTodo(draft)) return;
  draft.title = ''; draft.body = ''; draft.dueAt = ''; draft.priority = props.defaultPriority;
  api?.ui.showToast('任务已添加到泳道', 'success');
};
const formatDue = (value?: string) => value ? new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(value)) : '';
const overdue = (value?: string) => Boolean(value && new Date(value).getTime() < Date.now());

const newLaneTitle = ref('');
const submitLane = () => {
  if (!addLane(newLaneTitle.value)) return;
  newLaneTitle.value = '';
  api?.ui.showToast('泳道已创建', 'success');
};
const editingLaneId = ref('');
const editingLaneTitle = ref('');
const startRename = (id: string, title: string) => {
  editingLaneId.value = id; editingLaneTitle.value = title;
  void nextTick(() => document.querySelector<HTMLInputElement>('.lane-title-input')?.select());
};
const finishRename = () => {
  if (editingLaneId.value) renameLane(editingLaneId.value, editingLaneTitle.value);
  editingLaneId.value = ''; editingLaneTitle.value = '';
};
const deleteLane = (id: string) => {
  if (!removeLane(id)) api?.ui.showToast('完成泳道和最后一个工作泳道不能删除', 'error');
};

const quickLaneId = ref('');
const quickTitle = ref('');
const openQuickAdd = (laneId: string) => {
  quickLaneId.value = laneId; quickTitle.value = '';
  void nextTick(() => document.querySelector<HTMLInputElement>('.quick-add input')?.focus());
};
const submitQuick = () => {
  if (!addTodo({ title: quickTitle.value, priority: props.defaultPriority, laneId: quickLaneId.value })) return;
  quickTitle.value = '';
};

const draggedId = ref('');
const dragOverLaneId = ref('');
const dragOverItemId = ref('');
const beginDrag = (event: DragEvent, item: TodoItem) => {
  draggedId.value = item.id;
  event.dataTransfer?.setData('text/plain', item.id);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
};
const markLane = (laneId: string) => { dragOverLaneId.value = laneId; dragOverItemId.value = ''; };
const markCard = (laneId: string, itemId: string) => { dragOverLaneId.value = laneId; dragOverItemId.value = itemId; };
const drop = (laneId: string, beforeId?: string) => {
  if (draggedId.value) moveTodo(draggedId.value, laneId, beforeId);
  endDrag();
};
const endDrag = () => { draggedId.value = ''; dragOverLaneId.value = ''; dragOverItemId.value = ''; };
</script>

<template>
  <section class="todo-page">
    <header class="page-header"><div><span>PRODUCTIVITY BOARD</span><h2><LayoutDashboard :size="24" /> Todo 泳道</h2><p>像 Trello 一样拖动任务，在不同阶段之间流转。</p></div><div class="summary"><strong>{{ pending.length }}</strong><span>进行中</span><i /><strong>{{ completed.length }}</strong><span>已完成</span></div></header>
    <form class="composer card" @submit.prevent="submit">
      <input v-model="draft.title" class="title-input" maxlength="120" placeholder="新任务标题" aria-label="待办标题">
      <textarea v-model="draft.body" maxlength="10000" rows="3" placeholder="Markdown 正文（可选），支持标题、列表、代码和链接" aria-label="Todo Markdown 正文" />
      <div class="composer-row"><label><CalendarClock :size="15" /><input v-model="draft.dueAt" type="datetime-local" aria-label="截止时间"></label><div class="segments lane-picker" aria-label="目标泳道"><button v-for="lane in visibleLanes" :key="lane.id" type="button" :class="{ active: draft.laneId === lane.id }" @click="draft.laneId = lane.id"><i :style="{ background: lane.color }" />{{ lane.title }}</button></div><div class="segments" aria-label="优先级"><button v-for="item in priorities" :key="item.id" type="button" :class="{ active: draft.priority === item.id }" @click="draft.priority = item.id">{{ item.label }}</button></div><button class="primary" type="submit"><Plus :size="15" />添加任务</button></div>
    </form>
    <div class="board-toolbar"><span>拖动卡片可调整顺序或切换泳道</span><button v-if="completed.length" type="button" @click="clearCompletedTodos"><Trash2 :size="13" />清除已完成</button></div>
    <div class="board">
      <section v-for="lane in visibleLanes" :key="lane.id" class="lane" :class="{ 'drag-over': dragOverLaneId === lane.id && !dragOverItemId }" @dragover.prevent="markLane(lane.id)" @drop.prevent="drop(lane.id)">
        <header class="lane-header"><i :style="{ background: lane.color }" /><form v-if="editingLaneId === lane.id" @submit.prevent="finishRename"><input v-model="editingLaneTitle" class="lane-title-input" maxlength="40" @blur="finishRename" @keydown.esc="editingLaneId = ''"></form><strong v-else @dblclick="startRename(lane.id, lane.title)">{{ lane.title }}</strong><span>{{ laneItems(lane.id).length }}</span><button type="button" title="重命名泳道" @click="startRename(lane.id, lane.title)"><Pencil :size="12" /></button><button v-if="!lane.completed" type="button" title="删除泳道" @click="deleteLane(lane.id)"><Trash2 :size="12" /></button></header>
        <div class="lane-cards">
          <article v-for="item in laneItems(lane.id)" :key="item.id" class="task-card" :class="{ dragging: draggedId === item.id, 'insert-before': dragOverItemId === item.id }" draggable="true" @dragstart="beginDrag($event, item)" @dragend="endDrag" @dragover.prevent.stop="markCard(lane.id, item.id)" @drop.prevent.stop="drop(lane.id, item.id)">
            <div class="task-top"><GripVertical class="grip" :size="14" /><strong>{{ item.title }}</strong><span :class="['priority', item.priority]">{{ { low: '低', normal: '普通', high: '高' }[item.priority] }}</span><button type="button" aria-label="删除待办" @click="removeTodo(item.id)"><X :size="13" /></button></div>
            <MarkdownEditor class="task-body" :model-value="item.body" :title="`编辑正文 · ${item.title}`" placeholder="点击添加 Markdown 正文…" compact @save="updateTodo(item.id, { body: $event })" /><div class="task-meta"><time v-if="item.dueAt" :class="{ overdue: overdue(item.dueAt) && !item.completed }"><CalendarClock :size="12" />{{ formatDue(item.dueAt) }}</time><button type="button" :class="{ done: item.completed }" :aria-label="item.completed ? '恢复待办' : '完成待办'" @click="toggleTodo(item.id)"><Check v-if="item.completed" :size="12" /><Circle v-else :size="12" />{{ item.completed ? '已完成' : '完成' }}</button></div>
          </article>
        </div>
        <form v-if="quickLaneId === lane.id" class="quick-add" @submit.prevent="submitQuick"><input v-model="quickTitle" maxlength="120" placeholder="输入任务标题…" @keydown.esc="quickLaneId = ''"><div><button type="submit">添加卡片</button><button type="button" aria-label="取消" @click="quickLaneId = ''"><X :size="15" /></button></div></form><button v-else class="add-card" type="button" @click="openQuickAdd(lane.id)"><Plus :size="14" />添加卡片</button>
      </section>
      <form class="new-lane" @submit.prevent="submitLane"><input v-model="newLaneTitle" maxlength="40" placeholder="新泳道名称…" aria-label="新泳道名称"><button type="submit"><Plus :size="14" />添加泳道</button></form>
    </div>
  </section>
</template>

<style scoped>
.todo-page { min-width: 0; padding: 24px 26px 48px; color: var(--text); }
.page-header, .page-header h2, .summary, .composer-row, .composer-row label, .board-toolbar, .board-toolbar button, .lane-header, .task-top, .task-meta, .task-meta button, .add-card, .new-lane button { display: flex; align-items: center; }
.page-header { justify-content: space-between; gap: 20px; } .page-header > div:first-child > span { color: var(--text-secondary); font-size: 9px; font-weight: 700; letter-spacing: .12em; } .page-header h2 { gap: 8px; margin: 4px 0 0; font-size: 24px; } .page-header h2 svg { color: var(--accent); } .page-header p { margin: 5px 0 0; color: var(--text-secondary); font-size: 12px; }
.summary { gap: 7px; padding: 10px 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel); } .summary strong { font-size: 18px; } .summary span { color: var(--text-secondary); font-size: 10px; } .summary i { width: 1px; height: 24px; margin: 0 4px; background: var(--border); }
.composer { margin-top: 18px; padding: 13px; } input, textarea, button { font: inherit; } .title-input, textarea { box-sizing: border-box; width: 100%; border: 0; outline: 0; background: transparent; color: var(--text); } .title-input { font-size: 16px; font-weight: 600; } textarea { margin-top: 7px; resize: vertical; color: var(--text-secondary); font-size: 11px; } .composer-row { flex-wrap: wrap; gap: 8px; margin-top: 9px; } .composer-row label { gap: 5px; color: var(--text-secondary); } input[type="datetime-local"] { padding: 6px 8px; border: 1px solid var(--border); border-radius: 7px; background: var(--content-bg); color: var(--text); font-size: 10px; }
.segments { display: inline-flex; padding: 2px; border: 1px solid var(--border); border-radius: 8px; background: var(--content-bg); } .segments button { display: inline-flex; align-items: center; gap: 4px; padding: 5px 8px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); font-size: 10px; cursor: pointer; } .segments button.active { background: var(--panel); color: var(--accent); box-shadow: 0 1px 4px var(--hairline); } .lane-picker { max-width: 420px; overflow-x: auto; } .lane-picker i { width: 6px; height: 6px; flex: 0 0 auto; border-radius: 50%; }
.primary { gap: 5px; margin-left: auto; padding: 7px 11px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; font-weight: 600; cursor: pointer; }
.board-toolbar { justify-content: space-between; margin: 15px 2px 8px; color: var(--text-secondary); font-size: 10px; } .board-toolbar button { gap: 4px; border: 0; background: transparent; color: var(--text-secondary); font-size: 10px; cursor: pointer; } .board-toolbar button:hover { color: var(--danger); }
.board { display: flex; align-items: flex-start; gap: 12px; min-height: 380px; padding: 2px 2px 16px; overflow-x: auto; }
.lane { width: 286px; max-height: calc(100vh - 335px); min-height: 160px; flex: 0 0 286px; padding: 10px; overflow-y: auto; border: 1px solid var(--border); border-radius: 13px; background: color-mix(in srgb, var(--content-bg) 82%, var(--panel)); transition: border-color .15s, background .15s; } .lane.drag-over { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--content-bg)); }
.lane-header { position: sticky; z-index: 2; top: -10px; gap: 6px; padding: 3px 1px 9px; background: inherit; } .lane-header > i { width: 8px; height: 8px; flex: 0 0 auto; border-radius: 50%; } .lane-header strong { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; cursor: text; } .lane-header > span { padding: 2px 6px; border-radius: 8px; background: var(--panel); color: var(--text-secondary); font-size: 9px; } .lane-header button { display: inline-flex; padding: 3px; border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; } .lane-header button:hover { color: var(--accent); } .lane-header form { min-width: 0; flex: 1; } .lane-title-input { width: 100%; padding: 2px 5px; border: 1px solid var(--accent); border-radius: 5px; outline: 0; background: var(--panel); color: var(--text); font-size: 11px; }
.lane-cards { display: grid; gap: 7px; min-height: 8px; } .task-card { padding: 10px; border: 1px solid var(--hairline); border-radius: 9px; background: var(--panel); box-shadow: 0 2px 7px color-mix(in srgb, var(--text) 5%, transparent); cursor: grab; transition: opacity .15s, transform .15s; } .task-card:active { cursor: grabbing; } .task-card.dragging { opacity: .35; } .task-card.insert-before { box-shadow: 0 -3px 0 var(--accent), 0 2px 7px color-mix(in srgb, var(--text) 5%, transparent); } .task-top { gap: 5px; } .task-top .grip { flex: 0 0 auto; color: var(--text-secondary); } .task-top strong { min-width: 0; flex: 1; font-size: 11px; line-height: 1.35; } .task-top > button { display: inline-flex; padding: 2px; border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; } .task-top > button:hover { color: var(--danger); } .priority { padding: 2px 5px; border-radius: 5px; background: color-mix(in srgb, var(--todo-priority-normal, var(--accent)) 14%, transparent); color: var(--todo-priority-normal, var(--accent)); font-size: 8px; } .priority.high { background: color-mix(in srgb, var(--todo-priority-high, var(--danger)) 14%, transparent); color: var(--todo-priority-high, var(--danger)); } .priority.low { color: var(--todo-priority-low, var(--success)); } .task-body { margin-top: 6px; cursor: pointer; } .task-meta { justify-content: space-between; gap: 7px; margin-top: 7px; } .task-meta time { display: flex; align-items: center; gap: 3px; color: var(--text-secondary); font-size: 9px; } .task-meta time.overdue { color: var(--danger); } .task-meta button { gap: 3px; margin-left: auto; border: 0; background: transparent; color: var(--text-secondary); font-size: 9px; cursor: pointer; } .task-meta button.done, .task-meta button:hover { color: var(--success); }
.add-card { width: 100%; gap: 5px; margin-top: 7px; padding: 7px; border: 0; border-radius: 7px; background: transparent; color: var(--text-secondary); font-size: 10px; cursor: pointer; } .add-card:hover { background: var(--accent-weak); color: var(--accent); } .quick-add { margin-top: 7px; } .quick-add input { width: 100%; padding: 8px; border: 1px solid var(--accent); border-radius: 7px; outline: 0; background: var(--panel); color: var(--text); font-size: 10px; } .quick-add div { display: flex; gap: 5px; margin-top: 5px; } .quick-add button { padding: 5px 8px; border: 0; border-radius: 6px; background: var(--accent); color: #fff; font-size: 9px; cursor: pointer; } .quick-add button:last-child { display: inline-flex; padding: 5px; background: transparent; color: var(--text-secondary); }
.new-lane { width: 240px; flex: 0 0 240px; padding: 10px; border: 1px dashed var(--border); border-radius: 11px; } .new-lane input { width: 100%; padding: 7px 8px; border: 1px solid var(--border); border-radius: 7px; outline: 0; background: var(--panel); color: var(--text); font-size: 10px; } .new-lane button { gap: 4px; margin-top: 7px; padding: 6px 8px; border: 0; border-radius: 6px; background: var(--accent); color: #fff; font-size: 9px; cursor: pointer; }
@media (max-width: 760px) { .page-header { align-items: flex-start; flex-direction: column; } .composer-row { align-items: stretch; flex-direction: column; } .primary { justify-content: center; margin-left: 0; } .lane { max-height: none; } }
</style>
