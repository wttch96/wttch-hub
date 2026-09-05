/**
 * 文件说明：验证同一插件生命周期任务的串行顺序与错误后的队列恢复。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLifecycleQueue } from '../src/plugins/lifecycleQueue';

test('同插件等待激活完成再卸载，不同插件独立执行', async () => {
  const enqueue = createLifecycleQueue();
  const events: string[] = [];
  let finish!: () => void;
  const barrier = new Promise<void>((resolve) => { finish = resolve; });
  const activation = enqueue('alarm', async () => {
    events.push('activating');
    await barrier;
    events.push('active');
  });
  const unload = enqueue('alarm', async () => { events.push('unload'); });
  await enqueue('todo', async () => { events.push('todo'); });
  assert.deepEqual(events, ['activating', 'todo']);
  finish();
  await Promise.all([activation, unload]);
  assert.deepEqual(events, ['activating', 'todo', 'active', 'unload']);
});

test('失败传播给调用方，但不阻塞后续清理和重启', async () => {
  const enqueue = createLifecycleQueue();
  const failed = enqueue('alarm', async () => { throw new Error('激活失败'); });
  const cleanup = enqueue('alarm', async () => 'cleaned');
  await assert.rejects(failed, /激活失败/);
  assert.equal(await cleanup, 'cleaned');
  assert.equal(await enqueue('alarm', async () => 'restarted'), 'restarted');
});
