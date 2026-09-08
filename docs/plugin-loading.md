# 插件装载流程

本文说明 wttch-hub 当前如何发现、构建、校验和运行插件，并明确源码插件与 ZIP 插件包的边界。

## 概览

```text
plugin-src/<plugin-id>/
        │
        ├─ npm run build:plugins / pack:plugins
        ▼
plugins/*.zip ──► 启动时主进程校验并列出 ──► 插件管理界面

plugin-src/*/index.ts
        │
        └─ Vite import.meta.glob ──► allTools ──► 路由 / Widget / 生命周期
```

当前可执行的前端插件来自工作区的 `plugin-src/*/index.ts`。ZIP 插件包目前用于构建、分发、安装、校验和展示；宿主尚未从 ZIP 内动态执行任意 JavaScript。

## 1. 插件源码结构

每个源码插件位于 `plugin-src/<plugin-id>/`，通常包含：

- `index.ts`：通过 `defineToolPlugin(...)` 导出工具定义和生命周期。
- `package.ts`：通过 `definePluginPackage(...)` 导出打包清单。
- `components/`：工具页面、Widget 或浮动窗口组件。
- 业务状态、服务和测试所需的其他源码。

`index.ts` 中的 Vue 组件使用动态 `import()`，因此只有打开对应工具或挂载其 Widget 时才加载组件代码。

## 2. 开发期发现与运行

`src/config/tools.ts` 使用 Vite 的 `import.meta.glob` 扫描：

```ts
import.meta.glob('../../plugin-src/*/index.ts', {
  eager: true,
  import: 'default',
})
```

该步骤只急切读取每个插件的定义；页面和 Widget 组件仍保持懒加载。扫描结果与内置工具合并为 `allTools`。

随后运行时会：

1. 根据插件定义生成 `/tools/<plugin-path>` 路由。
2. 在侧边栏、工具库、插件管理页中显示已启用插件。
3. 在首页依据 Widget 定义挂载 Widget。
4. 由 `pluginRuntime` 调用 `load`、`activate`、`deactivate`、`unload` 生命周期。

插件通过 `context` 获取受控能力，例如 `context.host`、`context.data`、`context.services`、`context.ai` 和 `context.ui`；不应直接导入 Electron 或自行访问宿主 IPC。

## 3. 构建、打包与安装

常用命令：

```bash
npm run build:plugins
npm run pack:plugins
npm run install:plugins
```

`npm start`、`npm run package` 和 `npm run make` 会先执行 `prepare:plugins`，依次完成工作区包构建、插件构建、ZIP 打包和安装准备。

生成的 ZIP 默认放在 `plugins/`。ZIP 根目录必须包含 `package.json`，其中至少包含：

- `apiVersion: 1`
- `plugins` 数组
- 每个插件的 `id`、`version`、`name`、`entry`

## 4. ZIP 插件包发现与校验

Electron 主进程启动时扫描以下目录：

| 目录 | 来源 | 可移除 |
| --- | --- | --- |
| `<userData>/plugins` | 用户从界面安装的 ZIP | 是 |
| `sandbox/plugins` | 开发沙箱 ZIP | 是 |
| `plugins` | 工作区或随应用分发的 ZIP | 否 |

对每个 ZIP，主进程会校验：

- 压缩包不超过 50 MB；解压后的总量不超过 100 MB；
- 根目录存在合法 `package.json`；
- API 版本、插件 ID、名称、版本和入口声明有效；
- 入口为相对安全路径，不能越出插件包；
- 一个包内不存在重复插件 ID。

校验失败的包只会被忽略并记录警告，不会阻止工作台启动。

## 5. 安装与移除

插件管理界面通过主进程 IPC 完成：

1. 用户选择 ZIP。
2. 主进程先完整校验 ZIP。
3. 校验通过后，将包复制到 `<userData>/plugins`；同名文件视为更新。
4. 界面重新读取插件包列表。

移除操作仅允许删除 `<userData>/plugins` 下的 ZIP，不能删除工作区或沙箱以外的文件。

## 6. 当前限制

ZIP 的“安装”不等于“执行”。当前版本不会将 ZIP 解压后动态加载到渲染进程，也不会执行远程下载的插件代码。因此：

- ZIP 包可被安全发现、校验、安装、移除和展示；
- 运行中的工具、Widget 和生命周期仍来自编译进应用的 `plugin-src`；
- 若要实现可执行 ZIP 插件，需要额外设计解压位置、签名/信任模型、模块加载器、版本兼容和权限隔离；不能仅靠当前的 ZIP 扫描逻辑。

## 相关文件

- `src/config/tools.ts`：源码插件发现与 `allTools` 聚合。
- `src/plugins/runtime.ts`：插件生命周期与能力注入。
- `src/main.ts`：ZIP 扫描、校验、安装和移除 IPC。
- `scripts/build-plugins.ts`、`scripts/pack-plugins.ts`、`scripts/install-plugins.ts`：构建与分发流程。
- `packages/plugin-api/`：公开插件 API 类型与运行时常量。
