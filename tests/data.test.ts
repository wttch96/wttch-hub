/**
 * 文件说明：验证备份白名单与格式校验、恢复回滚、插件数据隔离以及关闭偏好的持久化。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { captureEntries, DATA_KEYS, restoreEntries, validateBackup } from '../src/data/backup';
import { createPluginDataApi } from '../src/data/pluginApi';
import { createPreferences, shouldHideOnClose } from '../src/desktop/preferences';

const backup = (entries: Record<string, string> = {}) => ({ format: 'wttch-hub-backup', version: 1, createdAt: '2026-09-05', closeBehavior: 'tray', entries });
test('备份仅收集登记的数据，拒绝未知版本、非法结构和危险属性', () => {
  const raw = new Map([[DATA_KEYS[0], JSON.stringify({ storage: { todo: { items: [] } } })], ['api-key', 'secret']]);
  const entries = captureEntries({ getItem: key => raw.get(key) ?? null });
  assert.equal(Object.keys(entries).length, 1);
  assert.equal(validateBackup(backup(entries)).closeBehavior, 'tray');
  assert.throws(() => validateBackup({ ...backup(), version: 2 }));
  assert.throws(() => validateBackup(backup({ 'ai-config.json': '{}' })));
  assert.throws(() => validateBackup(backup({ [DATA_KEYS[0]]: '{"storage":{"todo":[]}}' })));
  assert.throws(() => validateBackup(backup({ [DATA_KEYS[0]]: '{"storage":{"__proto__":{}}}' })));
  assert.throws(() => validateBackup(backup({ [DATA_KEYS[0]]: '{broken' })));
});
test('恢复替换业务数据、保留其他键，写入失败时回滚', () => {
  const raw = new Map<string, string>([[DATA_KEYS[0], 'old'], [DATA_KEYS[1], 'legacy'], ['outside', 'keep']]);
  const storage = {
    getItem: (key: string) => raw.get(key) ?? null,
    removeItem: (key: string) => { raw.delete(key); },
    setItem: (key: string, value: string) => { if (value === 'fail') throw new Error('quota'); raw.set(key, value); },
  };
  assert.throws(() => restoreEntries(storage, { [DATA_KEYS[0]]: 'new', [DATA_KEYS[1]]: 'fail' }));
  assert.equal(raw.get(DATA_KEYS[0]), 'old');
  assert.equal(raw.get(DATA_KEYS[1]), 'legacy');
  restoreEntries(storage, { [DATA_KEYS[0]]: 'new' });
  assert.equal(raw.get(DATA_KEYS[0]), 'new');
  assert.equal(raw.has(DATA_KEYS[1]), false);
  assert.equal(raw.get('outside'), 'keep');
});
test('插件快照隔离、拷贝、导入与清空', () => {
  let own: Record<string, unknown> = { tasks: ['工作台'] };
  const other = { tasks: ['另一个插件'] };
  const api = createPluginDataApi('todo', () => own, next => { own = next; });
  const snapshot = api.export();
  (snapshot.data.tasks as string[]).push('仅修改快照');
  assert.deepEqual(own.tasks, ['工作台']);
  assert.equal(api.getUsage().keys, 1);
  assert.ok(api.getUsage().bytes > JSON.stringify(own).length);
  assert.throws(() => api.import({ ...snapshot, pluginId: 'alarm' }));
  assert.deepEqual(api.keys(), ['tasks']);
  api.import(snapshot);
  assert.equal((own.tasks as string[]).length, 2);
  api.clear();
  assert.deepEqual(own, {});
  assert.deepEqual(other.tasks, ['另一个插件']);
});
test('关闭偏好持久化且真正退出、无托盘时不拦截退出', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-preferences-'));
  try {
    const store = createPreferences(directory);
    assert.equal(store.get(), 'quit');
    store.set('tray');
    assert.equal(createPreferences(directory).get(), 'tray');
    assert.throws(() => store.set('unknown'));
    assert.equal(store.get(), 'tray');
    assert.equal(shouldHideOnClose('tray', false, true), true);
    assert.equal(shouldHideOnClose('tray', true, true), false);
    assert.equal(shouldHideOnClose('tray', false, false), false);
    assert.equal(shouldHideOnClose('quit', false, true), false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
