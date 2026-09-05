/**
 * 文件说明：验证插件导航默认值、用户覆盖、排序和持久化同步等行为。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reactive } from 'vue';
import { createPluginNavigation, NAVIGATION_STORAGE_KEY, NAVIGATION_LABEL_LIMIT } from '../src/plugins/navigation';
import type { ToolPlugin } from '../src/types/plugin';

const plugin = (id: string, navigation?: ToolPlugin['navigation']): ToolPlugin => ({
  apiVersion: 1, id, path: id, name: `插件 ${id}`, navigation,
  icon: {}, desc: '', tags: [], tint: ['#000000', '#ffffff'],
  component: async () => ({ default: {} }),
});
const plugins = [
  plugin('legacy'), plugin('excluded', false), plugin('todo', { label: '待办', order: 10 }),
  plugin('alarm', { order: 20 }), plugin('monitor', { defaultVisible: false }), plugin('simple', true),
];
const createStorage = (initial: string | null = null) => {
  let value = initial;
  return {
    getItem: (key: string) => { assert.equal(key, NAVIGATION_STORAGE_KEY); return value; },
    setItem: (key: string, next: string) => { assert.equal(key, NAVIGATION_STORAGE_KEY); value = next; },
  };
};

test('仅声明支持导航的插件可配置，默认隐藏项仍出现在设置列表', () => {
  const nav = createPluginNavigation(plugins, () => true, createStorage());
  assert.deepEqual(nav.entries.value.map((entry) => entry.id), ['todo', 'alarm', 'monitor', 'simple']);
  assert.deepEqual(nav.visibleEntries.value.map((entry) => entry.id), ['todo', 'alarm', 'simple']);
  assert.equal(nav.entries.value[0].label, '待办');
  assert.equal(nav.setVisible('excluded', true), false);
  assert.equal(nav.rename('legacy', '无效'), false);
});

test('重命名、隐藏和排序持久化，菜单链接始终保持原插件路由', () => {
  const storage = createStorage();
  const nav = createPluginNavigation(plugins, () => true, storage);
  nav.rename('todo', '  我的任务  ');
  nav.setVisible('alarm', false);
  nav.move('simple', -1);
  nav.move('simple', -1);
  const restored = createPluginNavigation(plugins, () => true, storage);
  assert.deepEqual(restored.entries.value.map((entry) => entry.id), ['todo', 'simple', 'alarm', 'monitor']);
  assert.equal(restored.entries.value[0].label, '我的任务');
  assert.deepEqual(restored.entries.value[0].to, { name: 'tool-todo' });
  assert.equal(plugins[2].name, '插件 todo');
  assert.deepEqual(restored.visibleEntries.value.map((entry) => entry.id), ['todo', 'simple']);
});

test('禁用立即隐藏入口，重启用保留原来的名称、顺序和显隐偏好', () => {
  const enabled = reactive({ todo: true });
  const nav = createPluginNavigation(plugins, (id) => id !== 'todo' || enabled.todo, createStorage());
  nav.rename('todo', '我的任务');
  nav.move('todo', 1);
  enabled.todo = false;
  assert.equal(nav.visibleEntries.value.some((entry) => entry.id === 'todo'), false);
  assert.equal(nav.entries.value.find((entry) => entry.id === 'todo')?.enabled, false);
  enabled.todo = true;
  assert.equal(nav.visibleEntries.value[1].label, '我的任务');
});

test('名称留空恢复默认，长名称截断，恢复默认同时重置顺序与显隐', () => {
  const nav = createPluginNavigation(plugins, () => true, createStorage());
  nav.rename('todo', '长'.repeat(60));
  assert.equal(nav.entries.value[0].label.length, NAVIGATION_LABEL_LIMIT);
  nav.rename('todo', '  ');
  assert.equal(nav.entries.value[0].label, '待办');
  nav.setVisible('monitor', true);
  nav.move('todo', 1);
  nav.reset();
  assert.equal(nav.entries.value[0].id, 'todo');
  assert.equal(nav.visibleEntries.value.some((entry) => entry.id === 'monitor'), false);
});

test('损坏存储、重复排序和未知插件不会破坏导航，新插件仍按默认顺序出现', () => {
  for (const raw of ['null', '[]', '{broken', '42']) {
    const nav = createPluginNavigation(plugins, () => true, createStorage(raw));
    assert.equal(nav.entries.value.length, 4);
  }
  const raw = JSON.stringify({
    order: ['alarm', 'alarm', 'removed', 42],
    items: { todo: { label: 123, visible: 'false' }, alarm: null },
  });
  const nav = createPluginNavigation(plugins, () => true, createStorage(raw));
  assert.deepEqual(nav.entries.value.map((entry) => entry.id), ['alarm', 'todo', 'monitor', 'simple']);
  assert.equal(nav.entries.value[1].label, '待办');
  assert.equal(nav.entries.value[1].visible, true);
});

test('跨窗口同步不写回，后续修改读取最新数据以保留其他窗口的设置', () => {
  const storage = createStorage();
  const first = createPluginNavigation(plugins, () => true, storage);
  const second = createPluginNavigation(plugins, () => true, storage);
  first.rename('todo', '窗口一');
  second.setVisible('monitor', true);
  first.sync(storage.getItem(NAVIGATION_STORAGE_KEY));
  assert.equal(first.entries.value[0].label, '窗口一');
  assert.equal(first.visibleEntries.value.some((entry) => entry.id === 'monitor'), true);
  first.sync(null);
  assert.equal(first.entries.value[0].label, '待办');
});

test('存储失败不改变界面，边界移动不交换到另一端', () => {
  let failures = 0;
  const nav = createPluginNavigation(plugins, () => true, {
    getItem: (): null => null,
    setItem: () => { throw new Error('配额不足'); },
  }, () => { failures += 1; });
  assert.equal(nav.rename('todo', '未保存'), false);
  assert.equal(nav.entries.value[0].label, '待办');
  assert.equal(failures, 1);
  const normal = createPluginNavigation(plugins, () => true, createStorage());
  normal.move('todo', -1);
  normal.move('simple', 1);
  assert.deepEqual(normal.entries.value.map((entry) => entry.id), ['todo', 'alarm', 'monitor', 'simple']);
});
