/**
 * 文件说明：运行真实插件运行时并模拟宿主依赖，验证激活、释放、禁用和设置回调之间的协作。
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import * as vue from 'vue';
import type { ToolPlugin } from '../src/types/plugin';
import type { pluginRuntime } from '../src/plugins/runtime';
import { createPluginServicesApi } from '../src/services/pluginApi';
import { createPluginDataApi } from '../src/data/pluginApi';
import { createPluginAiApi } from '../src/module/ai/pluginApi';
import { createLifecycleQueue } from '../src/plugins/lifecycleQueue';
import { createPluginExtensionRegistry } from '../src/plugins/extensions';

/**
 * 运行真实 runtime 源码，仅替换工具发现和浏览器接口。
 * import.meta.glob 属于 Vite 编译期能力，Node 中使用固定插件清单代替；
 * 生命周期、响应式状态和队列都使用生产实现，验证公开 API 之间的竞态。
 */
const createRuntime = (events: ToolPlugin['events']) => {
  const notifications: string[] = [];
  /** 模拟主进程落盘：先结构化克隆参数，暴露无法序列化的响应式代理。 */
  const saved: Record<string, unknown>[] = [];
  const cloneErrors: string[] = [];
  const dependencies: Record<string, unknown> = {
    vue,
    './lifecycleQueue': { createLifecycleQueue },
    './extensions': { createPluginExtensionRegistry },
    '@module/ai': { createPluginAiApi },
    '../data/pluginApi': { createPluginDataApi },
    '../services/pluginApi': { createPluginServicesApi },
    '@wttch-hub/plugin-debug': {
      createElectronPluginDebugger: () => ({
        api: {
          log: (): void => undefined, debug: (): void => undefined, info: (): void => undefined,
          warn: (): void => undefined, error: (): void => undefined,
        },
      }),
    },
    '../config/tools': { allTools: [{
      id: 'test', name: '测试插件', events,
      settings: { fields: [{ key: 'enabled', type: 'boolean', defaultValue: true }] },
    }] },
    '../composables/useToast': { useToast: () => ({ error: (message: string) => notifications.push(message) }) },
    '../composables/useSheet': { useSheet: () => ({}) },
  };
  const exports: { pluginRuntime?: typeof pluginRuntime } = {};
  const source = readFileSync('src/plugins/runtime.ts', 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(outputText, {
    exports,
    require: (id: string) => {
      assert.ok(id in dependencies, `未模拟的依赖：${id}`);
      return dependencies[id];
    },
    localStorage: { getItem: (): null => null, setItem: (): void => undefined },
    window: {
      addEventListener: (): void => undefined,
      pluginStorageHost: {
        read: (): Record<string, unknown> => ({}),
        write: (_pluginId: string, value: Record<string, unknown>) => {
          try { saved.push(structuredClone(value)); }
          catch (error) { cloneErrors.push((error as Error).message); }
          return Promise.resolve(true);
        },
      },
    },
  });
  return { runtime: exports.pluginRuntime!, notifications, saved, cloneErrors };
};

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

test('激活期间禁用：等待激活完成，再清理且不残留活动作用域', async () => {
  const started = deferred();
  const finish = deferred();
  const calls: string[] = [];
  const { runtime } = createRuntime({
    async activate() {
      started.resolve();
      await finish.promise;
      calls.push('active');
      return () => { calls.push('dispose'); };
    },
    unload() { calls.push('unload'); },
  });
  const acquired = runtime.acquire('test', 'widget');
  await started.promise;
  const disabled = runtime.setEnabled('test', false);
  finish.resolve();
  const release = await acquired;
  await disabled;
  await release();
  assert.deepEqual(calls, ['active', 'dispose', 'unload']);
  assert.equal(runtime.states.test.status, 'disabled');
  assert.equal(runtime.states.test.activeScopes, 0);
});

test('并发获取共享一次激活，最后一次释放才清理且重复释放无副作用', async () => {
  let activations = 0;
  let cleanups = 0;
  const { runtime } = createRuntime({ activate() {
    activations += 1;
    return () => { cleanups += 1; };
  } });
  const [first, second] = await Promise.all([runtime.acquire('test', 'route'), runtime.acquire('test', 'widget')]);
  assert.equal(activations, 1);
  assert.equal(runtime.states.test.activeScopes, 2);
  await first();
  assert.equal(cleanups, 0);
  await second();
  await second();
  assert.equal(cleanups, 1);
  assert.equal(runtime.states.test.status, 'ready');
});

test('设置钩子同步抛错由运行时接管，不从设置调用中逃逸', async () => {
  const { runtime, notifications } = createRuntime({ settingsChanged() { throw new Error('设置失败'); } });
  await runtime.initialize();
  assert.doesNotThrow(() => runtime.updateSetting('test', 'enabled', false));
  // settingsChanged 在微任务中运行；等待其错误处理完成再读取最终状态。
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(runtime.states.test.status, 'error');
  assert.equal(notifications.length, 1);
});

test('插件存储写入主进程前还原成纯数据，响应式数组也能通过 IPC 克隆', async () => {
  const { runtime, saved, cloneErrors } = createRuntime({
    load(context) {
      // 与 todo 插件一致：先写入数组，再从响应式状态整体回写。
      context.storage.update('items', [{ id: '1', title: '买牛奶' }]);
      context.storage.update('lane', context.storage.get('items'));
    },
  });
  const release = await runtime.acquire('test', 'route');
  await release();
  assert.deepEqual(cloneErrors, []);
  assert.equal(saved.length, 2);
  assert.deepEqual(saved[1], { items: [{ id: '1', title: '买牛奶' }], lane: [{ id: '1', title: '买牛奶' }] });
});

test('插件资源按插件 ID 统一追踪，并在禁用时以注册的逆序自动释放', async () => {
  const calls: string[] = [];
  const { runtime } = createRuntime({
    load(context) {
      context.subscriptions.push({ dispose: () => calls.push('manual') });
      context.settings.onDidChange(() => undefined).dispose();
      const extension = context.extensions.registerExtension({ name: 'test-extension' });
      context.subscriptions.push({ dispose: () => calls.push('after-extension') });
      // The host-owned registration is tracked automatically; plugin authors
      // do not need to put its returned Disposable into subscriptions.
      assert.equal(typeof extension.dispose, 'function');
    },
  });
  await runtime.initialize();
  await runtime.setEnabled('test', false);
  assert.deepEqual(calls, ['after-extension', 'manual']);
});
