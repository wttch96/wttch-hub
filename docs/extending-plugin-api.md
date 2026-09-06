<!-- 文件说明：指导维护者以兼容、可测试、可发布的方式扩展 @wttch-hub/plugin-api 和宿主实现。 -->

# 如何扩展插件 API

本指南适用于要为插件新增宿主能力的维护者，例如“读取剪贴板”“选择文件”“调用新的 AI 能力”或“新增系统状态”。API 不是只加一个 TypeScript 类型：它必须同时具备公开契约、受控实现、组件/生命周期注入、能力校验、测试和版本策略。

## 1. 先设计最小公开契约

在 [packages/plugin-api/src/index.ts](../packages/plugin-api/src/index.ts) 中为新能力增加：

1. 输入、输出和可判断错误类型。
2. 面向插件的接口，例如 `PluginClipboardApi`。
3. `PluginComponentApi` 和 `PluginActivationContext` 中的受控入口。
4. `ToolPlugin.capabilities` 中的显式能力开关。

例如新增只读剪贴板能力：

```ts
export interface PluginClipboardApi {
  readText(): Promise<string>;
}

export interface PluginComponentApi {
  // 已有字段…
  clipboard: PluginClipboardApi;
}

export interface ToolPlugin {
  capabilities?: {
    // 已有能力…
    clipboard?: boolean;
  };
}
```

保持 API 向后兼容时，新增字段应为可选或提供安全默认值。只有旧插件无法继续工作的破坏性变更，才提升 `PLUGIN_API_VERSION` 和包的 major 版本。

## 2. 在宿主实现受控能力

不要让插件直接导入 Electron 或直接访问 IPC。能力实现应在宿主侧模块中完成，并在 `src/plugins/runtime.ts` 创建插件 API 时注入。

需要主进程权限时：

1. 在 `src/main.ts` 注册一个严格校验来源与参数的 IPC handler。
2. 在 `src/preload.ts` 只暴露最小 bridge 方法。
3. 在渲染进程创建插件专用封装；每次调用检查插件是否启用且已声明 capability。
4. 将封装注入 `PluginComponentApi` 和生命周期 context。

API 不返回 API Key、微信 token、任意文件路径或原始 Electron 对象。任何可选权限都应由 `capabilities` 声明，再由运行时强制检查。

## 3. 编写测试

至少增加三类测试：

- **契约测试**：非法输入、未声明能力、禁用插件和正常调用都具有稳定结果。
- **IPC 测试**：外部页面、子 frame、浮动窗口或不可信来源不能调用敏感能力。
- **生命周期测试**：插件卸载时，订阅、排队任务或未完成请求会被释放。

不依赖 Electron 的插件行为测试可使用 `@wttch-hub/plugin-debug`：

```ts
import { createPluginDebugHost } from '@wttch-hub/plugin-debug';

const host = createPluginDebugHost({ pluginId: 'example-tool' });
await plugin.events?.activate?.(host.context('route'));
```

若新能力需要在调试宿主中可用，也要同步扩展 [packages/plugin-debug/src/index.ts](../packages/plugin-debug/src/index.ts)，且默认应使用内存实现或明确失败，不访问网络、真实密钥或本机敏感数据。

## 4. 构建、验证与发布

```bash
npm run install:packages
npm --workspace @wttch-hub/plugin-api run build
npm --workspace @wttch-hub/plugin-debug run build
npm run build:packages
npm test
```

通过后可在包目录执行 `npm pack` 检查 tarball 内容；发布时由 CI 使用同一包版本发布 `@wttch-hub/plugin-api`，再发布依赖它的 `@wttch-hub/plugin-debug`。插件项目只依赖包名和版本，不依赖宿主源码路径。

## 5. 更新文档与示例

更新以下内容：

- API 类型旁的中文注释：能力目的、权限、限制和错误语义。
- [插件开发指南](./new-plugin.md)：插件作者需要知道的声明和调用示例。
- [AI、微信与数据管理](./services-and-data.md)：若能力涉及服务、数据或凭据。
- `plugin-src/examples/hello-plugin`：当新能力是常用基础能力时加入最小示例。

完成后，宿主、调试环境和插件包在版本上保持一致；不要只发布类型却遗漏运行时实现。
