<!-- 文件说明：定义本地插件开发仓库的目录约定、调试命令以及与宿主和声明仓库的关系。 -->

# 插件开发仓库

这里是未来多个独立插件仓库在当前项目中的本地落点。每个可编译插件放在 `plugin-src/<plugin-id>/`，至少包含：

```text
<plugin-id>/
  index.ts       # 默认导出 defineToolPlugin(...) 的运行时入口
  package.ts     # 默认导出 definePluginPackage(...) 的可分发声明
  package.json   # npm 包入口，必须提供 build 和 test 脚本
  components/    # 可选 Vue 页面或 Widget
```

宿主会在构建时发现 `plugin-src/*/index.ts`。`npm run start`、`npm run package` 与 `npm run make` 均会先执行 `npm run build:plugins`：该命令验证每个插件的 npm 入口并生成清单，然后 Vite 将页面和 Widget 一并编译、自动加载。当前单仓库会自动把 `@wttch-hub/plugin-api` 与 `@wttch-hub/plugin-debug` 映射到本地源码；组件与插件实现只从 `@wttch-hub/plugin-api` 导入 API，测试可从 `@wttch-hub/plugin-debug` 创建内存宿主。

`examples/` 是模板，不会被宿主加载。复制其目录到上一层并修改 ID 后，才会成为一个本地开发插件。插件的显示元数据应同步登记到 `../plugin-registry/plugins.json`。单独在插件目录执行 `npm run build` 或 `npm test` 可使用该插件的 npm 入口。

详细步骤见：[开发新插件](../docs/new-plugin.md)、[扩展插件 API](../docs/extending-plugin-api.md)、[构建与发布](../docs/operations.md)。
