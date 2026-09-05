/**
 * 文件说明：使用模拟 Electron 环境验证 AI 接口的调用来源校验和密钥保护，不访问真实凭据。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createAiService } from '../src/ai/service';
import * as config from '../src/ai/config';
import * as shared from '../src/ai/shared';

/** 使用真实注册逻辑和 service，模拟 Electron、文件系统与系统加密，避免访问开发者密钥链。 */
test('AI IPC 拒绝外部页面/子 frame/浮动窗口改配置，合法主窗口配置不返回密钥', async () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const files = new Map<string, string>();
  const exports: { registerAiIpc?: (check: (url: string) => boolean) => void } = {};
  const dependencies: Record<string, unknown> = {
    electron: {
      app: { getPath: () => '/test-data', on: (): void => undefined },
      BrowserWindow: { fromWebContents: () => ({}), getAllWindows: (): unknown[] => [] },
      ipcMain: { handle: (name: string, handler: (...args: unknown[]) => unknown) => handlers.set(name, handler) },
      net: { fetch: async () => new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] })) },
      safeStorage: {
        isEncryptionAvailable: () => true,
        encryptString: (value: string) => Buffer.from(value),
        decryptString: (value: Buffer) => value.toString(),
      },
    },
    'node:fs': {
      existsSync: (name: string) => files.has(name),
      readFileSync: (name: string) => files.get(name),
      writeFileSync: (name: string, value: string) => files.set(name, value),
      renameSync: (from: string, to: string) => files.set(to, files.get(from)!),
      mkdirSync: (): void => undefined,
      rmSync: (name: string) => files.delete(name),
    },
    'node:path': { join: (...parts: string[]) => parts.join('/'), dirname: () => '/test-data' },
    './config': config,
    './service': { createAiService },
    './shared': shared,
  };
  const source = ts.transpileModule(readFileSync('src/ai/main.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  runInNewContext(source, { exports, require: (id: string) => dependencies[id], process: { platform: 'darwin', pid: 1 }, Buffer, URL });
  exports.registerAiIpc!((url) => url.startsWith('app://renderer/'));
  const event = (url: string, subframe = false) => {
    const frame = { url };
    return { sender: { id: 1, mainFrame: frame }, senderFrame: subframe ? { url } : frame };
  };
  const call = async (name: string, ...args: unknown[]) => await handlers.get(name)!(...args) as { ok: boolean; value?: unknown; error?: { code: string } };
  assert.equal((await call('ai:status', event('https://external.example'))).error?.code, 'FORBIDDEN');
  assert.equal((await call('ai:status', event('app://renderer/', true))).error?.code, 'FORBIDDEN');
  assert.equal((await call('ai:configure', event('app://renderer/#/floating/alarm'), {})).error?.code, 'FORBIDDEN');
  const result = await call('ai:configure', event('app://renderer/#/settings'), { ...config.defaultConfiguration(), apiKey: 'never-return-this' });
  assert.equal(result.ok, true);
  assert.ok(!JSON.stringify(result).includes('never-return-this'));
  assert.ok(!files.get('/test-data/ai-config.json')?.includes('never-return-this'));
  assert.equal((await call('ai:chat', event('app://renderer/'), 'unknown', {})).error?.code, 'FORBIDDEN');
  const completion = await call('ai:test', event('app://renderer/'), 'settings', 'smoke');
  assert.equal(completion.ok, true);
});
