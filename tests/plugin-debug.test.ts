/** 文件说明：验证插件调试宿主的内存隔离、数据快照和可观察副作用，保障插件开发测试环境可用。 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createPluginDebugHost } from '../packages/plugin-debug/src';

test('插件调试宿主隔离存储并记录可观察副作用', async () => {
  const host = createPluginDebugHost({ pluginId: 'demo', settings: { greeting: '你好' } });
  assert.equal(host.api.settings.get('greeting'), '你好');
  host.api.storage.update('count', 1);
  assert.deepEqual(host.api.data.export().data, { count: 1 });
  await host.api.host.showNotification({ title: '完成' });
  await host.api.services.publish('done', { id: '1', title: '完成', text: '任务完成' });
  assert.equal(host.events.notifications[0].title, '完成');
  assert.equal(host.events.published[0].serviceId, 'done');
});
