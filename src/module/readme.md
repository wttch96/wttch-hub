# `src/module` 模块约定

`src/module` 用于放置有独立职责、可单独类型检查的应用内部模块。它不是 npm package，也不需要 `package.json`；模块依赖图由 TypeScript Project References（`tsconfig.json` 的 `references`）维护。

当前 `ai` 是参考实现。迁移 store、setting 或其他服务时，按相同约定创建模块。

## 一个模块的目录

```text
src/module/<name>/
  index.ts          # 唯一的通用公开入口
  tsconfig.json     # TypeScript 子项目定义
  env.d.ts          # 可选：仅本模块需要的 Window 或环境声明
  ...实现文件
```

`index.ts` 只导出模块希望被其他代码使用的类型和函数。模块外代码不得直接导入实现文件，例如不要写 `@module/store/persistence`；应从 `@module/store` 导入。

如果某入口只允许主进程使用，可像 AI 一样额外提供 `main.ts`，并把 `@module/ai/main` 作为明确的主进程入口。不要把 Electron 代码从通用 `index.ts` 导出，以免渲染进程意外打包它。

## 新增模块的步骤

以 `store` 为例：

1. 创建 `src/module/store/`，将 store 代码移入其中，并创建只导出公共 API 的 `index.ts`。
2. 创建 `src/module/store/tsconfig.json`，复制 AI 模块的配置，并把 `outDir` 改为唯一目录，例如 `../../../.tsbuild/module-store`。
3. 在根 `tsconfig.json` 的 `references` 中加入 `{ "path": "./src/module/store" }`。
4. 在 `tsconfig.src.json` 的 `references` 中加入同一条引用；`src/module` 继续保持在应用项目的 `exclude` 中，避免同一文件同时属于两个 TypeScript 项目。
5. 在 `tsconfig.base.json` 的 `paths` 中增加公开入口，例如：

   ```json
   "@module/store": ["./src/module/store/index.ts"]
   ```

6. 在 Vite 配置中添加同名别名。渲染进程加到 `vite.renderer.config.ts`；主进程或 preload 若使用该模块，也分别加到 `vite.main.config.ts`、`vite.preload.config.ts`。
7. 将调用点改为 `import { ... } from '@module/store'`，并在迁移完成后删除旧目录。

## 模块之间的依赖

模块 A 若依赖模块 B：

- A 的 `tsconfig.json` 中加入 `"references": [{ "path": "../b" }]`；
- A 只从 B 的 `@module/b` 公共入口导入；
- 不允许循环依赖。TypeScript build 会拒绝循环的 project reference。

例如 setting 模块需要 store：

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "rootDir": ".",
    "outDir": "../../../.tsbuild/module-setting"
  },
  "references": [{ "path": "../store" }],
  "include": ["**/*.ts"]
}
```

## 验证

运行 `npm run typecheck`。该命令使用 `tsc -b`，会按 root → module → app 的引用图进行增量构建。生成的声明文件位于 `.tsbuild/`，已被 Git 忽略。

完成迁移后，再运行与该模块相关的测试。模块内不应依赖 Vue 页面、路由或 Electron 窗口；这些应用层适配应留在模块的公开入口或专用 `main.ts` 中。
