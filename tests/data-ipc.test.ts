/**
 * 文件说明：模拟主窗口和原生对话框，验证数据接口权限、取消操作、恢复前备份与恢复确认。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as backup from '../src/data/backup';
import * as preferences from '../src/desktop/preferences';
import type { registerDataIpc } from '../src/data/main';

test('数据 IPC 验证来源、取消无写入、恢复前备份及重新加载后确认', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-data-ipc-'));
  try {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    let cancelled = true;
    let confirmation = 0;
    let reloaded = 0;
    let widgetsClosed = 0;
    const file = path.join(directory, 'import.json');
    fs.writeFileSync(file, JSON.stringify({ format: 'wttch-hub-backup', version: 1, createdAt: '2026-09-05', closeBehavior: 'tray', entries: { [backup.DATA_KEYS[0]]: '{"storage":{"todo":{"items":[]}}}' } }));
    const latest = { [backup.DATA_KEYS[0]]: '{"storage":{"todo":{"items":["latest"]}}}' };
    const exports: { registerDataIpc?: typeof registerDataIpc } = {};
    const dependencies: Record<string, unknown> = {
      electron: {
        app: { getPath: () => directory },
        BrowserWindow: { fromWebContents: () => ({ isDestroyed: () => false, webContents: { getURL: () => 'app://renderer/#/settings', executeJavaScript: async () => latest, reload: () => { reloaded++; } } }) },
        ipcMain: { handle: (name: string, handler: (...args: unknown[]) => unknown) => handlers.set(name, handler) },
        shell: { openPath: async () => '' },
        dialog: {
          showOpenDialog: async () => ({ canceled: cancelled, filePaths: [file] }),
          showMessageBox: async () => ({ response: confirmation }),
        },
      },
      'node:fs': fs, 'node:path': path, './backup': backup, '../desktop/preferences': preferences,
    };
    const source = ts.transpileModule(fs.readFileSync('src/data/main.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    runInNewContext(source, { exports, require: (id: string) => dependencies[id], URL });
    const store = preferences.createPreferences(directory);
    exports.registerDataIpc!(url => url.startsWith('app://renderer/'), store, () => true, () => { widgetsClosed++; });
    const event = (url = 'app://renderer/#/settings', subframe = false) => {
      const frame = { url }; return { sender: { mainFrame: frame }, senderFrame: subframe ? { url } : frame };
    };
    const call = async (name: string, e = event(), input?: unknown) => await handlers.get(`desktop:${name}`)!(e, input);
    await assert.rejects(call('info', event('https://external.example/')));
    await assert.rejects(call('info', event('app://renderer/', true)));
    await assert.rejects(call('import', event('app://renderer/#/floating/todo'), {}));
    const previous = { [backup.DATA_KEYS[0]]: '{"storage":{"todo":{"items":["original"]}}}' };
    assert.equal(await call('import', event(), previous), false);
    cancelled = false;
    assert.equal(await call('import', event(), previous), false);
    assert.equal(fs.existsSync(path.join(directory, 'backups')), false);
    confirmation = 1;
    assert.equal(await call('import', event(), previous), true);
    assert.equal(reloaded, 1); assert.equal(widgetsClosed, 1);
    const recovery = fs.readdirSync(path.join(directory, 'backups'))[0];
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'backups', recovery), 'utf8')).entries, latest);
    assert.equal(store.get(), 'quit'); // 等渲染器成功落盘后才修改关闭行为。
    assert.ok(await call('pending'));
    await call('finish');
    assert.equal(store.get(), 'tray');
    assert.equal(await call('pending'), null);
    assert.equal(fs.existsSync(path.join(directory, 'ai-config.json')), false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
