import { reactive, readonly } from 'vue';
import type { Disposable, PluginComponentApi } from '@wttch-hub/plugin-api';

export type TodoPriority = 'low' | 'normal' | 'high';
export type TodoLane = {
  id: string;
  title: string;
  color: string;
  completed: boolean;
  createdAt: string;
};
export type TodoItem = {
  id: string;
  title: string;
  notes: string;
  dueAt?: string;
  priority: TodoPriority;
  completed: boolean;
  laneId: string;
  order: number;
  createdAt: string;
  completedAt?: string;
};

const laneColors = ['#0a84ff', '#ff9f0a', '#30a46c', '#bf5af2', '#ff375f', '#5ac8fa'];
const defaultLanes = (): TodoLane[] => [
  { id: 'todo', title: '待处理', color: '#0a84ff', completed: false, createdAt: new Date().toISOString() },
  { id: 'doing', title: '进行中', color: '#ff9f0a', completed: false, createdAt: new Date().toISOString() },
  { id: 'done', title: '已完成', color: '#30a46c', completed: true, createdAt: new Date().toISOString() },
];
const state = reactive({ lanes: [] as TodoLane[], items: [] as TodoItem[], initialized: false });
let api: PluginComponentApi | undefined;
let subscription: Disposable | undefined;

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const validLanes = (value: unknown): TodoLane[] => Array.isArray(value)
  ? value.filter((lane): lane is TodoLane => Boolean(lane && typeof lane === 'object'
    && typeof (lane as TodoLane).id === 'string' && typeof (lane as TodoLane).title === 'string'))
    .map((lane, index) => ({
      id: lane.id,
      title: lane.title.trim() || `泳道 ${index + 1}`,
      color: /^#[0-9a-f]{6}$/i.test(lane.color) ? lane.color : laneColors[index % laneColors.length],
      completed: lane.completed === true,
      createdAt: lane.createdAt || new Date().toISOString(),
    }))
  : [];
const validItems = (value: unknown, lanes: TodoLane[]): TodoItem[] => {
  if (!Array.isArray(value)) return [];
  const activeLane = lanes.find((lane) => !lane.completed) ?? lanes[0];
  const completedLane = lanes.find((lane) => lane.completed) ?? lanes.at(-1);
  return value.filter((item): item is TodoItem => Boolean(item && typeof item === 'object'
    && typeof (item as TodoItem).id === 'string' && typeof (item as TodoItem).title === 'string'))
    .map((item, index) => {
      const completed = item.completed === true;
      const requestedLane = lanes.find((lane) => lane.id === item.laneId);
      const lane = requestedLane ?? (completed ? completedLane : activeLane);
      return {
        id: item.id,
        title: item.title,
        notes: typeof item.notes === 'string' ? item.notes : '',
        dueAt: typeof item.dueAt === 'string' && item.dueAt ? item.dueAt : undefined,
        priority: ['low', 'normal', 'high'].includes(item.priority) ? item.priority : 'normal',
        completed: lane?.completed ?? completed,
        laneId: lane?.id ?? 'todo',
        order: Number.isFinite(item.order) ? item.order : index,
        createdAt: item.createdAt || new Date().toISOString(),
        completedAt: lane?.completed ? (item.completedAt || new Date().toISOString()) : undefined,
      };
    });
};

export const connectTodoStore = (nextApi?: PluginComponentApi) => {
  if (!nextApi) return;
  api = nextApi;
  if (!state.initialized) {
    const storedLanes = validLanes(api.storage.get<unknown>('lanes', []));
    state.lanes = storedLanes.length ? storedLanes : defaultLanes();
    state.items = validItems(api.storage.get<unknown>('items', []), state.lanes);
    state.initialized = true;
  }
  if (!subscription) subscription = api.storage.onDidChange((key, value) => {
    if (key === 'lanes') {
      const lanes = validLanes(value);
      if (lanes.length) state.lanes = lanes;
    }
    if (key === 'items') state.items = validItems(value, state.lanes);
  });
};
export const disconnectTodoStore = () => { subscription?.dispose(); subscription = undefined; api = undefined; };

const persistItems = () => api?.storage.update('items', state.items.map((item) => ({ ...item })));
const persistLanes = () => api?.storage.update('lanes', state.lanes.map((lane) => ({ ...lane })));
const laneFor = (id?: string) => state.lanes.find((lane) => lane.id === id) ?? state.lanes.find((lane) => !lane.completed) ?? state.lanes[0];
const normalizeLaneOrder = (laneId: string) => state.items.filter((item) => item.laneId === laneId)
  .sort((a, b) => a.order - b.order)
  .forEach((item, index) => { item.order = index; });

export const todoState = readonly(state);
export const addLane = (title: string) => {
  const normalized = title.trim();
  if (!normalized) return false;
  state.lanes.splice(Math.max(0, state.lanes.length - 1), 0, {
    id: makeId(), title: normalized, color: laneColors[state.lanes.length % laneColors.length], completed: false, createdAt: new Date().toISOString(),
  });
  persistLanes();
  return true;
};
export const renameLane = (id: string, title: string) => {
  const lane = state.lanes.find((entry) => entry.id === id);
  const normalized = title.trim();
  if (!lane || !normalized) return false;
  lane.title = normalized;
  persistLanes();
  return true;
};
export const removeLane = (id: string) => {
  const lane = state.lanes.find((entry) => entry.id === id);
  if (!lane || lane.completed || state.lanes.length <= 2) return false;
  const fallback = state.lanes.find((entry) => entry.id !== id && !entry.completed) ?? state.lanes.find((entry) => entry.id !== id);
  if (!fallback) return false;
  state.items.filter((item) => item.laneId === id).forEach((item) => {
    item.laneId = fallback.id; item.completed = fallback.completed; item.completedAt = fallback.completed ? new Date().toISOString() : undefined;
  });
  state.lanes = state.lanes.filter((entry) => entry.id !== id);
  normalizeLaneOrder(fallback.id);
  persistLanes(); persistItems();
  return true;
};
export const addTodo = (input: { title: string; notes?: string; dueAt?: string; priority?: TodoPriority; laneId?: string }) => {
  const title = input.title.trim();
  const lane = laneFor(input.laneId);
  if (!title || !lane) return false;
  const order = state.items.filter((item) => item.laneId === lane.id).length;
  state.items.push({
    id: makeId(), title, notes: input.notes?.trim() ?? '', dueAt: input.dueAt || undefined,
    priority: input.priority ?? 'normal', completed: lane.completed, laneId: lane.id, order,
    createdAt: new Date().toISOString(), completedAt: lane.completed ? new Date().toISOString() : undefined,
  });
  persistItems();
  return true;
};
export const moveTodo = (id: string, targetLaneId: string, beforeId?: string) => {
  const item = state.items.find((entry) => entry.id === id);
  const lane = state.lanes.find((entry) => entry.id === targetLaneId);
  if (!item || !lane || beforeId === id) return false;
  const sourceLaneId = item.laneId;
  item.laneId = lane.id;
  item.completed = lane.completed;
  item.completedAt = lane.completed ? (item.completedAt || new Date().toISOString()) : undefined;
  const targetItems = state.items.filter((entry) => entry.laneId === lane.id && entry.id !== id).sort((a, b) => a.order - b.order);
  const targetIndex = beforeId ? targetItems.findIndex((entry) => entry.id === beforeId) : -1;
  targetItems.splice(targetIndex < 0 ? targetItems.length : targetIndex, 0, item);
  targetItems.forEach((entry, index) => { entry.order = index; });
  if (sourceLaneId !== lane.id) normalizeLaneOrder(sourceLaneId);
  persistItems();
  return true;
};
export const toggleTodo = (id: string) => {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  const target = item.completed
    ? state.lanes.find((lane) => !lane.completed)
    : state.lanes.find((lane) => lane.completed);
  if (target) moveTodo(id, target.id);
};
export const removeTodo = (id: string) => {
  const laneId = state.items.find((item) => item.id === id)?.laneId;
  state.items = state.items.filter((item) => item.id !== id);
  if (laneId) normalizeLaneOrder(laneId);
  persistItems();
};
export const clearCompletedTodos = () => { state.items = state.items.filter((item) => !item.completed); persistItems(); };
