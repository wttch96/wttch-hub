/**
 * 文件说明：模拟 Electron 主进程，验证单实例锁、重复启动唤起和关闭时隐藏或退出的生命周期行为。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { shouldHideOnClose } from '../src/desktop/preferences';

for (const primary of [false, true]) test(`主进程单实例与关闭行为：持有锁=${primary}`, () => {
  const appEvents = new Map<string, () => void>();
  const windowEvents = new Map<string, (event?: unknown) => void>();
  let created = 0, shown = 0, hidden = 0, focused = 0, restored = 0, quits = 0;
  let ready = false;
  let behavior = 'tray';
  const app = {
    requestSingleInstanceLock: () => primary,
    quit: () => { quits++; appEvents.get('before-quit')?.(); },
    on: (name: string, cb: () => void) => appEvents.set(name, cb),
    getPath: () => '/test-data',
    isReady: () => ready,
  };
  class FakeWindow {
    webContents = { openDevTools: (): void => undefined };
    constructor() { created++; }
    on(name: string, cb: (event?: unknown) => void) { windowEvents.set(name, cb); }
    once() { /* 首帧事件由 Electron 触发，本测试只验证生命周期入口。 */ }
    loadFile() { return Promise.resolve(); /* 不加载真实页面。 */ }
    isDestroyed() { return false; }
    isMinimized() { return true; }
    restore() { restored++; }
    show() { shown++; }
    hide() { hidden++; }
    focus() { focused++; }
  }
  const dependencies: Record<string, unknown> = {
    electron: { app, BrowserWindow: FakeWindow, ipcMain: { handle: (): void => undefined, on: (): void => undefined } },
    'dotenv/config': {}, 'node:path': path, 'node:url': { pathToFileURL }, 'node:fs': {},
    'electron-squirrel-startup': false, systeminformation: {}, fflate: {},
    './services/main': { registerWechatIpc: (): void => undefined },
    '@module/ai/main': { registerAiIpc: (): void => undefined }, './data/main': { registerDataIpc: (): void => undefined },
    './system/macosStats': { macGpuUtilization: async (): Promise<undefined> => undefined, macMemoryUsage: (): number => 0 },
    './desktop/preferences': { shouldHideOnClose, createPreferences: () => ({ get: () => behavior, getDebugLoggingEnabled: () => false }) },
    './desktop/logger': { debugError: (): void => undefined, debugLog: (): void => undefined, initializeDebugLogger: (): void => undefined },
    './desktop/tray': { getApplicationIconPath: () => '/icon.png', createSystemTray: () => ({ refresh: (): void => undefined }) },
  };
  const source = ts.transpileModule(readFileSync('src/main.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  runInNewContext(source, { exports: {}, require: (id: string) => { assert.ok(id in dependencies, id); return dependencies[id]; }, process: { platform: 'win32', env: {} }, __dirname: '/app', MAIN_WINDOW_VITE_DEV_SERVER_URL: undefined, MAIN_WINDOW_VITE_NAME: 'main_window', URL, console });
  appEvents.get('second-instance')!();
  assert.equal(created, 0); // ready 前不能创建窗口。
  ready = true; appEvents.get('ready')!();
  if (!primary) { assert.equal(created, 0); assert.equal(quits, 1); return; }
  assert.equal(created, 1);
  appEvents.get('second-instance')!();
  assert.equal(created, 1); assert.equal(shown, 1); assert.equal(focused, 1); assert.equal(restored, 1);
  let prevented = 0;
  windowEvents.get('close')!({ preventDefault: () => { prevented++; } });
  assert.equal(hidden, 1); assert.equal(quits, 0);
  behavior = 'quit';
  windowEvents.get('close')!({ preventDefault: () => { prevented++; } });
  assert.equal(quits, 1);
  windowEvents.get('close')!({ preventDefault: () => { prevented++; } });
  assert.equal(prevented, 2); // before-quit 后不再阻止真正关闭。
});
