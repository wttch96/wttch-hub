<!-- 文件说明：说明插件调试运行环境的用途、使用方式和未来独立仓库的拆分边界。 -->

# @wttch-hub/plugin-debug

这是插件调试与测试运行环境的本地仓库边界。`src/index.ts` 提供不依赖 Electron 的内存宿主：它可生成插件生命周期上下文、记录通知和服务发布、模拟设置与私有存储，并让测试显式配置 AI 返回值。

插件作者可在自己的测试中使用它：

```ts
import { createPluginDebugHost } from '@wttch-hub/plugin-debug';

const host = createPluginDebugHost({ pluginId: 'my-plugin' });
await plugin.events?.load?.(host.context('startup'));
```

当前仓库的 TypeScript 与 Vite 都把 `@wttch-hub/plugin-api`、`@wttch-hub/plugin-debug` 映射到本地唯一源，因此无需依赖 `node_modules` 的安装顺序。插件在本项目内测试时可直接从包名导入；拆分成独立仓库后，将这两个目录发布为 npm 包即可保持测试代码不变。
