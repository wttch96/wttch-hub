/** 文件说明：验证插件扩展按 ID 注册、读取、撤销，供跨插件协作能力安全复用。 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createPluginExtensionRegistry } from '../src/plugins/extensions';

test('插件扩展可按 ID 获取，撤销后不可见且拒绝重复注册', () => {
  const registry = createPluginExtensionRegistry();
  const extension = { getColor: (key: string) => key === 'demo.accent' ? '#123456' : undefined };
  const registration = registry.register('theme', extension);
  assert.equal(registry.get<typeof extension>('theme')?.getColor('demo.accent'), '#123456');
  assert.throws(() => registry.register('theme', {}), /已注册/);
  registration.dispose();
  assert.equal(registry.get('theme'), undefined);
});
