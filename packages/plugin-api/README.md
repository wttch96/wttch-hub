<!-- 文件说明：定义可独立发布的 wttch-hub 插件 API 包边界，并说明当前本地开发阶段的引用方式。 -->

# @wttch-hub/plugin-api

这里是未来 `wttch-hub-plugin-api` 仓库的目录边界。它对插件作者公开插件清单、生命周期、AI、存储、数据管理和服务分发的类型，以及 `defineToolPlugin`、`definePluginPackage` 两个定义函数。

当前仍在单仓库开发阶段，唯一 API 源文件保留在 [`src/types/plugin.ts`](../../src/types/plugin.ts)，避免维护两份会逐渐不一致的声明。执行 `npm run install:plugin-api` 会从该文件生成并安装本地的 `@wttch-hub/plugin-api` 包。拆出独立仓库时，只需将该源文件和本目录的包元数据迁移过去，插件侧的导入路径不变。

插件应始终从包名导入，不能从宿主的 `src/` 目录导入：

```ts
import { defineToolPlugin, type PluginComponentApi } from '@wttch-hub/plugin-api';
```
