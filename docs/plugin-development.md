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

`npm start`、`npm run package` 和 `npm run make` 都会先执行 `build:plugins`。随后渲染进程通过 `import.meta.glob('../../plugin-src/*/index.ts')` 发现所有插件入口，Vite 将 Vue 页面和 Widget 编译到工作台产物中。新增或移动插件后需要重启开发服务器。

当前桌面应用不会将任意 ZIP 中的 TypeScript/Vue 源码直接当作 JavaScript 运行。ZIP 安装会被校验并恢复到 `plugin-src`，随后必须重新构建；这避免了把未经构建和审查的代码直接执行在可信渲染器中。

## 公共 API 与测试

插件只从 `@wttch-hub/plugin-api` 导入 `defineToolPlugin`、`definePluginPackage` 和类型。当前 API 真源是 `src/types/plugin.ts`，`packages/plugin-api` 是未来独立 npm 仓库边界。插件不得直接使用 Electron IPC；宿主按能力声明提供 AI、存储、数据快照、服务分发、通知、系统状态和 UI 接口。

`@wttch-hub/plugin-debug` 提供无 Electron、无网络、无真实密钥的内存调试宿主。`createPluginDebugHost({ pluginId })` 可生成生命周期 context、隔离 storage/settings，并记录通知、Toast 与服务发布，适合插件单元测试。

插件声明 `capabilities` 后才可调用对应能力。能力声明是宿主 API 的访问边界，不是恶意插件隔离沙箱；第三方插件仍应经过代码审查。
