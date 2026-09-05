/**
 * 文件说明：验证 macOS 与 Windows 托盘分支、菜单生命周期及图标文件的尺寸和封装结构。
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import type { createSystemTray } from '../src/desktop/tray';

/** 在非 Windows 主机也验证平台分支：macOS Template、Windows ICO、右键菜单与清理。 */
for (const platform of ['darwin', 'win32']) test(`${platform} 托盘图标、菜单与生命周期`, () => {
  const events = new Map<string, () => void>();
  let iconPath = '';
  let template = false;
  let destroyed = false;
  let visible = false;
  let opened = 0;
  let popups = 0;
  let quit = false;
  let menu: { label?: string; enabled?: boolean; click?: () => void }[] = [];
  let trayInput: unknown;
  class FakeTray {
    constructor(image: unknown) { trayInput = image; }
    on(name: string, callback: () => void) { events.set(name, callback); }
    setToolTip() { /* 无需模拟系统气泡。 */ }
    isDestroyed() { return destroyed; }
    destroy() { destroyed = true; }
    setContextMenu(value: typeof menu) { menu = value; }
    popUpContextMenu(value: typeof menu) { menu = value; popups += 1; }
    setIgnoreDoubleClickEvents() { /* macOS 原生选项。 */ }
  }
  const image = { isEmpty: () => false, setTemplateImage: (value: boolean) => { template = value; } };
  const exports: { createSystemTray?: typeof createSystemTray } = {};
  const dependencies: Record<string, unknown> = {
    'node:path': path,
    electron: {
      app: { isPackaged: true },
      Menu: { buildFromTemplate: (items: typeof menu) => items },
      Tray: FakeTray,
      nativeImage: { createFromPath: (file: string) => { iconPath = file; return image; } },
    },
  };
  const source = ts.transpileModule(readFileSync('src/desktop/tray.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  runInNewContext(source, { exports, require: (name: string) => dependencies[name], process: { platform, resourcesPath: '/app/Resources' } });
  const controller = exports.createSystemTray!({
    show() { opened += 1; visible = true; }, hide() { visible = false; },
    isVisible: () => visible, quit() { quit = true; },
  });
  assert.equal(iconPath, `/app/Resources/icons/${platform === 'darwin' ? 'hubTemplate.png' : 'hub.ico'}`);
  assert.equal(template, platform === 'darwin');
  assert.equal(trayInput, platform === 'darwin' ? image : iconPath);
  // macOS 使用绑定的原生菜单，不额外注册点击；Windows 左键仅弹菜单。
  assert.equal(menu[0].label, '显示工作台');
  assert.equal(menu[1].enabled, false);
  if (platform === 'darwin') {
    assert.equal(events.has('click'), false);
    assert.equal(events.has('right-click'), false);
  } else {
    events.get('click')!();
    assert.equal(popups, 1);
  }
  assert.equal(events.has('double-click'), false);
  assert.equal(opened, 0);
  assert.equal(visible, false);
  menu[0].click!();
  assert.equal(opened, 1);
  controller.refresh();
  assert.equal(menu[1].enabled, true);
  menu[1].click!(); assert.equal(visible, false);
  controller.refresh(); assert.equal(menu[1].enabled, false);
  menu[3].click!(); assert.equal(quit, true);
  controller.destroy(); controller.destroy(); assert.equal(destroyed, true);
});

test('分发图标具有正确的 PNG 尺寸、ICO 多分辨率与 ICNS chunk', () => {
  const pngSize = (name: string) => {
    const bytes = readFileSync(`assets/icons/${name}`);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(bytes[25], 6); // RGBA，保留真正的透明背景。
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  };
  assert.deepEqual(pngSize('hub.png'), [1024, 1024]);
  assert.deepEqual(pngSize('hubTemplate.png'), [16, 16]);
  assert.deepEqual(pngSize('hubTemplate@2x.png'), [32, 32]);
  const ico = readFileSync('assets/icons/hub.ico');
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 7);
  for (let index = 0; index < 7; index += 1) {
    const entry = 6 + index * 16;
    const offset = ico.readUInt32LE(entry + 12);
    const length = ico.readUInt32LE(entry + 8);
    assert.ok(offset + length <= ico.length);
    assert.equal(ico.subarray(offset + 1, offset + 4).toString(), 'PNG');
  }
  const icns = readFileSync('assets/icons/hub.icns');
  assert.equal(icns.subarray(0, 4).toString(), 'icns');
  assert.equal(icns.readUInt32BE(4), icns.length);
  const types: string[] = [];
  let offset = 8;
  while (offset < icns.length) {
    types.push(icns.subarray(offset, offset + 4).toString());
    const length = icns.readUInt32BE(offset + 4);
    assert.ok(length > 8);
    offset += length;
  }
  assert.equal(offset, icns.length);
  assert.ok(types.includes('ic10') && types.includes('ic11'));
});
