/**
 * 文件说明：模拟 Electron 与微信接口，验证微信请求来源限制及登录凭据经系统安全存储保存。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as client from '../src/services/wechatClient';
import * as service from '../src/services/wechatService';
import * as preferences from '../src/desktop/preferences';
import type { registerWechatIpc } from '../src/services/main';

test('微信 IPC 拒绝外部、子 frame 与 Widget；登录凭据只经安全存储写入文件', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-wechat-ipc-'));
  let dispose: (() => void) | undefined;
  try {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    let encrypted = 0;
    const exports: { registerWechatIpc?: typeof registerWechatIpc } = {};
    const dependencies: Record<string, unknown> = {
      electron: {
        app: { getPath: () => directory, on: (_event: string, callback: () => void) => { dispose = callback; } },
        BrowserWindow: { fromWebContents: () => ({}), getAllWindows: (): unknown[] => [] },
        ipcMain: { handle: (name: string, handler: (...args: unknown[]) => unknown) => handlers.set(name, handler) },
        net: { fetch: async (input: string, options: RequestInit) => {
          if (input.includes('get_bot_qrcode')) return new Response('{"qrcode":"qr-secret","qrcode_img_content":"url"}');
          if (input.includes('get_qrcode_status')) return new Response('{"status":"confirmed","ilink_bot_id":"bot","bot_token":"never-expose-me"}');
          return new Promise((_resolve, reject) => { options.signal?.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }); });
        } },
        safeStorage: { isEncryptionAvailable: () => true, encryptString: (raw: string) => { encrypted++; assert.ok(raw.includes('never-expose-me')); return Buffer.from('encrypted-by-os'); } },
      },
      'node:fs': fs, 'node:path': path, qrcode: { toDataURL: async () => 'data:image/png;base64,qr' },
      '../desktop/preferences': preferences, '../desktop/logger': { debugLog: (): void => undefined }, './wechatClient': client, './wechatService': service,
    };
    const source = ts.transpileModule(fs.readFileSync('src/services/main.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    runInNewContext(source, { exports, require: (id: string) => dependencies[id], process: { platform: 'darwin' }, URL, Buffer });
    exports.registerWechatIpc!(url => url.startsWith('app://renderer/'));
    const event = (url = 'app://renderer/#/settings', subframe = false) => {
      const frame = { url }; return { sender: { mainFrame: frame }, senderFrame: subframe ? { url } : frame };
    };
    const call = async (name: string, e = event(), ...input: unknown[]) => await handlers.get(name)!(e, ...input);
    await assert.rejects(call('wechat:login', event('https://external.example/')));
    await assert.rejects(call('wechat:login', event('app://renderer/', true)));
    await assert.rejects(call('services:publish', event('app://renderer/#/floating/alarm'), 'alarm/triggered', {}));
    await call('wechat:login'); await new Promise(resolve => setImmediate(resolve));
    assert.equal(encrypted, 1);
    const status = JSON.stringify(await call('wechat:status'));
    assert.ok(!status.includes('never-expose-me')); assert.ok(!status.includes('qr-secret'));
    assert.ok(!fs.readFileSync(path.join(directory, 'wechat-config.json'), 'utf8').includes('never-expose-me'));
  } finally { dispose?.(); fs.rmSync(directory, { recursive: true, force: true }); }
});
