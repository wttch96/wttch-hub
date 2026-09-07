<!-- 文件说明：说明插件调试运行环境的用途、使用方式和未来独立仓库的拆分边界。 -->

# @wttch-hub/plugin-debug

这是插件调试与测试运行环境的本地仓库边界。`src/index.ts` 提供不依赖 Electron 的内存宿主：它可生成插件生命周期上下文、记录通知和服务发布、模拟设置与私有存储，并让测试显式配置 AI 返回值。

插件作者可在自己的测试中使用它：

```ts
import { createPluginDebugHost } from '@wttch-hub/plugin-debug';

const host = createPluginDebugHost({ pluginId: 'my-plugin' });
await plugin.events?.load?.(host.context('startup'));
```

桌面端默认通过 `createElectronPluginDebugger` 提供 `context.debug`。插件可在
生命周期或组件中写入结构化日志，无须访问 Electron 的 IPC：

```ts
context.debug.info('开始同步', { source: 'widget' });
context.debug.error('同步失败', { reason: error instanceof Error ? error.message : String(error) });
```

日志会显示在 Electron 主进程终端；使用 `createElectronPluginDebugger` 的开发工具也可读取其最近 200 条 `entries`。不要写入密钥、令牌或完整的用户内容。

本包通过 npm workspace 依赖 `@wttch-hub/plugin-api`，由 `node_modules` 中的工作区链接统一解析。插件在本项目内测试时直接从包名导入；运行 `npm run install:packages` 可重建所有链接，拆分成独立仓库后测试代码不需要改动。

相关指南：[开发新插件](../../docs/new-plugin.md)、[扩展插件 API](../../docs/extending-plugin-api.md)。
