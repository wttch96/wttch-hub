/**
 * 文件说明：声明待办清单插件的页面入口、能力、生命周期及设置，将插件实现接入工作台运行时。
 */

import { ListTodo } from 'lucide-vue-next';
import { defineToolPlugin, type PluginComponentApi } from '@wttch-hub/plugin-api';
import { connectTodoStore, disconnectTodoStore } from './store';
import { addTodo, moveTodo, removeTodo, todoState } from './store';

type ThemeExtension = {
  registerColor(key: string, defaultValue: string, description?: string): { dispose(): void };
  getColor(key: string): string | undefined;
  onDidChange(listener: () => void): { dispose(): void };
};

const applyPriorityColors = (theme: ThemeExtension) => {
  const root = document.documentElement;
  root.style.setProperty('--todo-priority-low', theme.getColor('todo.priority-low') ?? '#168A45');
  root.style.setProperty('--todo-priority-normal', theme.getColor('todo.priority-normal') ?? '#0A84FF');
  root.style.setProperty('--todo-priority-high', theme.getColor('todo.priority-high') ?? '#E5484D');
};

export default defineToolPlugin({
  apiVersion: 1,
  id: 'todo',
  path: 'todo',
  navigation: { label: '待办清单', order: 10 },
  name: 'Todo 清单',
  icon: ListTodo,
  desc: '使用可拖拽泳道管理带 Markdown 正文的任务、优先级、截止时间与完成状态。',
  tags: ['Todo', 'Markdown', '看板', '泳道'],
  tint: ['#30a46c', 'rgba(48, 164, 108, 0.12)'],
  component: () => import('./components/TodoPage.vue'),
  capabilities: { toast: true, ai: true },
  events: {
    load(context) {
      connectTodoStore(context as PluginComponentApi);
      const aiTools = [
        context.ai.registerTool({
          name: 'todo_add', description: '新增一条待办。laneId 省略时放入待处理泳道。',
          parameters: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, dueAt: { type: 'string' }, priority: { type: 'string', enum: ['low', 'normal', 'high'] }, laneId: { type: 'string' } }, required: ['title'], additionalProperties: false },
          invoke: (args) => {
            if (typeof args.title !== 'string') throw new Error('title 必须是文本');
            const added = addTodo({ title: args.title, body: typeof args.body === 'string' ? args.body : undefined, dueAt: typeof args.dueAt === 'string' ? args.dueAt : undefined, priority: args.priority === 'low' || args.priority === 'high' || args.priority === 'normal' ? args.priority : undefined, laneId: typeof args.laneId === 'string' ? args.laneId : undefined });
            if (!added) throw new Error('无法新增待办，请检查标题和泳道 ID');
            return todoState.items.at(-1);
          },
        }),
        context.ai.registerTool({
          name: 'todo_list', description: '查看当前待办和泳道，用于确认可操作的待办 ID、泳道 ID 与状态。',
          parameters: { type: 'object', properties: {}, additionalProperties: false },
          invoke: () => ({ lanes: todoState.lanes, items: todoState.items }),
        }),
        context.ai.registerTool({
          name: 'todo_delete', description: '按待办 ID 删除一条待办。',
          parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
          invoke: (args) => {
            if (typeof args.id !== 'string' || !todoState.items.some(item => item.id === args.id)) throw new Error('找不到该待办');
            removeTodo(args.id); return { deleted: args.id };
          },
        }),
        context.ai.registerTool({
          name: 'todo_move', description: '把待办移动到指定泳道；可选 beforeId 将它放到另一待办之前。',
          parameters: { type: 'object', properties: { id: { type: 'string' }, laneId: { type: 'string' }, beforeId: { type: 'string' } }, required: ['id', 'laneId'], additionalProperties: false },
          invoke: (args) => {
            if (typeof args.id !== 'string' || typeof args.laneId !== 'string' || !moveTodo(args.id, args.laneId, typeof args.beforeId === 'string' ? args.beforeId : undefined)) throw new Error('无法移动待办，请检查待办和泳道 ID');
            return todoState.items.find(item => item.id === args.id);
          },
        }),
      ];
      const theme = context.extensions.getExtension<ThemeExtension>('theme');
      if (!theme) return () => { aiTools.reverse().forEach(tool => tool.dispose()); disconnectTodoStore(); };
      const registrations = [
        theme.registerColor('todo.priority-low', '#168A45', 'Todo 低优先级颜色'),
        theme.registerColor('todo.priority-normal', '#0A84FF', 'Todo 普通优先级颜色'),
        theme.registerColor('todo.priority-high', '#E5484D', 'Todo 高优先级颜色'),
        theme.onDidChange(() => applyPriorityColors(theme)),
      ];
      applyPriorityColors(theme);
      return () => { aiTools.reverse().forEach(tool => tool.dispose()); registrations.reverse().forEach(item => item.dispose()); disconnectTodoStore(); };
    },
    activate() { return { dispose() { /* 页面与 Widget 不持有额外资源。 */ } }; },
    deactivate() { /* 数据由插件私有存储持续保存。 */ },
    unload() { /* 存储订阅由宿主统一释放。 */ },
  },
  statusbar: { label: 'Todo 清单', color: '#30a46c' },
  settings: {
    description: '配置 Todo 页面与 Widget 的默认显示方式。',
    fields: [
      { key: 'defaultPriority', label: '默认优先级', type: 'select', defaultValue: 'normal', options: [
        { label: '低', value: 'low' }, { label: '普通', value: 'normal' }, { label: '高', value: 'high' },
      ] },
      { key: 'showCompleted', label: '显示已完成项目', type: 'boolean', defaultValue: true },
      { key: 'widgetLimit', label: 'Widget 显示数量', type: 'number', defaultValue: 4, min: 2, max: 8, step: 1 },
    ],
  },
  widget: {
    component: () => import('./components/TodoWidget.vue'),
    defaultWidth: 6,
    defaultHeight: 2,
    minWidth: 4,
    minHeight: 2,
    refreshIntervalMs: 60000,
  },
});
