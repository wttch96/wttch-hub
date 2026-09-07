/**
 * 文件说明：声明待办清单插件的页面入口、能力、生命周期及设置，将插件实现接入工作台运行时。
 */

import { ListTodo } from 'lucide-vue-next';
import { defineToolPlugin, type PluginComponentApi } from '@wttch-hub/plugin-api';
import { connectTodoStore, disconnectTodoStore } from './store';

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
  capabilities: { toast: true },
  events: {
    load(context) { connectTodoStore(context as PluginComponentApi); return disconnectTodoStore; },
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
