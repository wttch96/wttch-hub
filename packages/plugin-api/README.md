<!-- 文件说明：定义可独立发布的 wttch-hub 插件 API 包边界，并说明当前本地开发阶段的引用方式。 -->

# @wttch-hub/plugin-api

这里是可独立发布的 `wttch-hub-plugin-api` 工作区包。它对插件作者公开插件清单、生命周期、AI、存储、数据管理和服务分发的类型，以及 `defineToolPlugin`、`definePluginPackage` 两个定义函数。

唯一 API 源文件是 `src/index.ts`。根项目与插件通过 npm workspace 在 `node_modules/@wttch-hub/plugin-api` 链接本包；运行 `npm run install:packages` 可重建链接，运行 `npm --workspace @wttch-hub/plugin-api run build` 或 `npm pack` 可独立验证和打包。

插件应始终从包名导入，不能从宿主的 `src/` 目录导入：

```ts
import { defineToolPlugin, type PluginComponentApi } from '@wttch-hub/plugin-api';
```

相关指南：[扩展插件 API](../../docs/extending-plugin-api.md)、[开发新插件](../../docs/new-plugin.md)、[工作区构建与发布](../../docs/operations.md)。
