<!-- 文件说明：定义可独立发布的 wttch-hub 插件 API 包边界，并说明当前本地开发阶段的引用方式。 -->

# @wttch-hub/plugin-api

这里是可独立发布的 `wttch-hub-plugin-api` 工作区包。它对插件作者公开插件清单、生命周期、AI、存储、数据管理和服务分发的类型，以及 `defineToolPlugin`、`definePluginPackage` 两个定义函数。

唯一 API 声明文件是 `src/index.d.ts`。根项目与插件通过 npm workspace 在 `node_modules/@wttch-hub/plugin-api` 链接本包；运行 `npm run install:packages` 可重建链接，运行 `npm --workspace @wttch-hub/plugin-api run build` 或 `npm pack` 可独立验证和打包。`src/index.js` 只保留 `defineToolPlugin`、`definePluginPackage` 和稳定常量的极小运行时实现。

插件应始终从包名导入，不能从宿主的 `src/` 目录导入：

```ts
import { defineToolPlugin, type PluginComponentApi } from '@wttch-hub/plugin-api';
```

相关指南：[扩展插件 API](../../docs/extending-plugin-api.md)、[开发新插件](../../docs/new-plugin.md)、[工作区构建与发布](../../docs/operations.md)。

## 跨插件扩展

插件可在 `load` 中通过 `context.extensions.registerExtension()` 导出一个受控对象；其他插件使用
`context.extensions.getExtension('插件 ID')` 读取。扩展只在当前渲染器有效，插件禁用或卸载后自动失效。

主题插件提供的颜色扩展是一个示例：

```ts
type ThemeExtension = {
  registerColor(key: string, defaultValue: string, description?: string): { dispose(): void };
  getColor(key: string): string | undefined;
  onDidChange(listener: () => void): { dispose(): void };
};

const theme = context.extensions.getExtension<ThemeExtension>('theme');
if (theme) {
  context.subscriptions.push(theme.registerColor('todo.priority-high', '#E5484D', 'Todo 高优先级颜色'));
  context.subscriptions.push(theme.onDidChange(() => {
    const color = theme.getColor('todo.priority-high');
    // 将 color 应用于本插件 UI。
  }));
}
```

建议在插件激活后读取依赖扩展，并将返回的 `Disposable` 放入 `subscriptions`，这样禁用时会自动清理注册。
