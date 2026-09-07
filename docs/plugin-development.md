<!-- 文件说明：规定插件源码目录、npm 构建测试入口、公开 API、调试宿主和宿主自动加载流程。 -->

# 插件开发

## 目录与 npm 入口

所有可执行插件都位于 `plugin-src/<plugin-id>/`。一个插件至少包含 `index.ts`、`package.ts` 和 `package.json`；后者必须定义 `build` 与 `test` 脚本。内置的闹钟、系统监控、主题和 Todo 插件可作为参考，`plugin-src/examples/hello-plugin` 是不会被加载的模板。

```text
plugin-src/example-tool/
  index.ts       # defineToolPlugin 的默认导出
  package.ts     # definePluginPackage 的默认导出
  package.json   # npm run build / npm test
  components/    # 可选 Vue 页面、Widget
```

在插件目录可独立执行：

```bash
npm --prefix plugin-src/alarm run build
npm --prefix plugin-src/alarm test
```

根目录的 `npm run build:plugins` 会校验全部插件的 ID、API 版本、入口与 npm 脚本，并生成 `plugin-src/.generated/plugins.json`。这是可再生的构建清单，不提交版本库。

## 自动构建与加载

`npm start`、`npm run package` 和 `npm run make` 都会先执行 `prepare:plugins`：校验插件、生成清单、打包 ZIP，并将 ZIP 安装到 `sandbox/plugins`。随后渲染进程通过 `import.meta.glob('../../plugin-src/*/index.ts')` 发现所有插件入口，Vite 将 Vue 页面和 Widget 编译到工作台产物中；主进程同时扫描开发沙盒中的已安装 ZIP。新增或移动插件后需要重启开发服务器。

当前桌面应用不会将任意 ZIP 中的 TypeScript/Vue 源码直接当作 JavaScript 运行。CLI 安装会校验 ZIP 后放入 `sandbox/plugins`；源码始终保留在 `plugin-src` 并参与 Vite 构建。这避免了把未经构建和审查的代码直接执行在可信渲染器中。

## 公共 API 与测试

插件只从 `@wttch-hub/plugin-api` 导入 `defineToolPlugin`、`definePluginPackage` 和类型。API 真源是 `packages/plugin-api/src/index.d.ts`；根目录与各插件通过 npm workspace 在 `node_modules` 中解析该包。插件不得直接使用 Electron IPC；宿主按能力声明提供 AI、存储、数据快照、服务分发、通知、系统状态和 UI 接口。

根目录 `package.json` 的 `workspaces` 定义了 `packages/*` 和 `plugin-src/*`。运行 `npm run install:packages` 会离线重建工作区链接；`npm run build:packages` 与 `npm run test:packages` 会遍历全部包。每个包都具有 `npm pack` 可消费的 `main`、`types`、版本和依赖声明，开发时不使用相对目录依赖。

`@wttch-hub/plugin-debug` 提供无 Electron、无网络、无真实密钥的内存调试宿主。`createPluginDebugHost({ pluginId })` 可生成生命周期 context、隔离 storage/settings，并记录通知、Toast 与服务发布，适合插件单元测试。

插件声明 `capabilities` 后才可调用对应能力。能力声明是宿主 API 的访问边界，不是恶意插件隔离沙箱；第三方插件仍应经过代码审查。
