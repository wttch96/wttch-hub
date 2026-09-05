/**
 * 文件说明：验证闹钟与待办存储的损坏数据过滤、重复连接和卸载重连行为。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PluginComponentApi, PluginStorageApi } from '../src/types/plugin';
import { addAlarm, alarmState, startAlarmScheduler } from '../src/plugins/alarm/store';
import { connectTodoStore, disconnectTodoStore, todoState } from '../src/plugins/todo/store';

/** 模拟宿主存储，保留真实订阅广播行为；直接改 data 模拟插件卸载期间的外部写入。 */
const createHost = () => {
  const data: Record<string, unknown> = {};
  const listeners = new Set<(key: string, value: unknown) => void>();
  const storage: PluginStorageApi = {
    get: <T>(key: string, fallback?: T) => (data[key] as T | undefined) ?? fallback,
    update(key, value) { data[key] = value; listeners.forEach((listener) => listener(key, value)); },
    delete(key) { delete data[key]; listeners.forEach((listener) => listener(key, undefined)); },
    onDidChange(listener) { listeners.add(listener); return { dispose() { listeners.delete(listener); } }; },
  };
  return { data, listeners, api: { storage } as PluginComponentApi };
};

test('闹钟过滤损坏记录，重复连接不新增订阅，重连读取最新数据', () => {
  const host = createHost();
  host.data.alarms = [{ id: 'broken', label: '缺少时间' }];
  const stop = startAlarmScheduler(host.api, false);
  assert.equal(alarmState.alarms.length, 0);
  assert.equal(addAlarm({ label: '', repeat: 'daily', time: '25:99' }), false);
  assert.equal(addAlarm({ label: '有效', repeat: 'daily', time: '09:30' }), true);
  assert.equal(alarmState.alarms.length, 1);
  stop();
  assert.equal(host.listeners.size, 0);
  host.data.alarms = [];
  const stopAgain = startAlarmScheduler(host.api, false);
  assert.equal(alarmState.alarms.length, 0);
  stopAgain();
});

test('待办重连读取卸载期间写入的数据，页面重复连接共用订阅', () => {
  const host = createHost();
  connectTodoStore(host.api);
  connectTodoStore(host.api);
  assert.equal(host.listeners.size, 1);
  disconnectTodoStore();
  host.data.items = [{ id: 'external', title: '外部任务', laneId: 'todo' }];
  connectTodoStore(host.api);
  assert.equal(todoState.items[0]?.title, '外部任务');
  disconnectTodoStore();
  assert.equal(host.listeners.size, 0);
});
