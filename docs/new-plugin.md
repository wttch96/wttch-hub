<!-- 文件说明：提供从创建工作区包到实现、测试、构建、沙盒安装和在工作台验证的新插件开发流程。 -->

# 如何开发一个新插件

以下以 `note-board` 为例。插件源码始终放在 `plugin-src`，并作为 npm workspace 包由根项目的 `node_modules` 统一链接。

## 1. 从模板创建目录

复制 [hello-plugin 模板](../plugin-src/examples/hello-plugin)：

```bash
cp -R plugin-src/examples/hello-plugin plugin-src/note-board
```

修改三个文件中的 ID、名称和版本：

- `plugin-src/note-board/package.json`：包名应为 `@wttch-hub/plugin-note-board`。
- `plugin-src/note-board/package.ts`：`id: 'note-board'`、名称、版本和分发能力。
- `plugin-src/note-board/index.ts`：运行时插件 ID、`path`、名称、页面、图标与功能声明。

目录名、`package.ts` 的 `id` 与 `index.ts` 的 `id` 必须完全一致，且使用小写字母、数字和连字符。

## 2. 声明 npm 依赖

插件的 `package.json` 必须拥有 `build`、`test` 和 API 包依赖：

```json
{
  "name": "@wttch-hub/plugin-note-board",
  "version": "0.1.0",
  "dependencies": {
    "@wttch-hub/plugin-api": "1.0.0"
  },
  "peerDependencies": {
    "vue": "^3.5.0",
    "lucide-vue-next": "^1.0.0"
  },
  "scripts": {
    "build": "tsx ../../scripts/build-plugins.ts",
    "test": "node --import tsx --test ../../tests/plugin-debug.test.ts"
  }
}
```

执行 `npm run install:packages` 后，npm 会在唯一的 `node_modules` 下为工作区创建链接。插件代码只能从 `@wttch-hub/plugin-api` 等包名导入，不能引用 `../../src` 或其他工作区的源码。

## 3. 定义分发清单

`package.ts` 用于安装校验和 ZIP 分发：

```ts
import { definePluginPackage } from '@wttch-hub/plugin-api';

export default definePluginPackage({
  apiVersion: 1,
  id: 'note-board',
  version: '0.1.0',
  name: '便签面板',
  entry: 'index.ts',
  capabilities: ['storage', 'widget'],
});
```

该 `capabilities` 是分发描述；运行时能力还必须在 `defineToolPlugin` 中显式声明。

## 4. 定义运行时插件

`index.ts` 默认导出 `defineToolPlugin`。页面通过 `component` 懒加载，简单配置由宿主渲染和持久化：

```ts
import { StickyNote } from 'lucide-vue-next';
import { defineToolPlugin } from '@wttch-hub/plugin-api';

export default defineToolPlugin({
  apiVersion: 1,
  id: 'note-board',
  path: 'note-board',
  name: '便签面板',
  icon: StickyNote,
  desc: '记录短便签。',
  tags: ['便签'],
  tint: ['#ff9f0a', 'rgba(255, 159, 10, .12)'],
  navigation: { label: '便签', order: 30 },
  component: () => import('./components/NoteBoard.vue'),
  capabilities: { toast: true },
  settings: {
    fields: [{ key: 'defaultColor', label: '默认颜色', type: 'color', defaultValue: '#ff9f0a' }],
  },
});
```

组件通过 Vue `inject(PLUGIN_COMPONENT_API_KEY)` 获得 `PluginComponentApi`，使用 `api.storage`、`api.settings`、`api.ai` 等受控能力。不要导入 Electron、不要调用 `window.require`、不要自行读取其他插件数据。

## 5. 编写插件测试

将插件测试放入 `tests/`，并让 `package.json` 的 `test` 指向它。可用调试宿主测试 storage、设置、服务发布与生命周期：

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { createPluginDebugHost } from '@wttch-hub/plugin-debug';

test('便签保存到插件私有存储', () => {
  const host = createPluginDebugHost({ pluginId: 'note-board' });
  host.api.storage.update('notes', [{ id: '1', text: '第一条' }]);
  assert.equal(host.api.storage.get<Array<{ text: string }>>('notes')?.[0].text, '第一条');
});
```

## 6. 构建、安装到沙盒并运行

```bash
npm --workspace @wttch-hub/plugin-note-board run build
npm --workspace @wttch-hub/plugin-note-board test
npm run prepare:plugins
npm start
```

`prepare:plugins` 会校验所有插件、生成清单、创建 ZIP 并将其安装到 `sandbox/plugins`。Vite 会从 `plugin-src/*/index.ts` 编译并加载新插件；启动后可在“插件”页面确认状态，并从“插件设置”页面配置声明式字段。

## 7. 登记与发布准备

在 [plugin-registry/plugins.json](../plugin-registry/plugins.json) 新增该插件的 ID、名称、API 版本、源码位置与类型。完成后执行：

```bash
npm run build:packages
npm run test:packages
npm run typecheck
npm test
```

要发布单个插件时，在其工作区目录执行 `npm pack` 并检查 tarball。当前工作台运行 Vue/TypeScript 插件时仍需要主应用的 Vite 构建；ZIP 用于安装包登记与沙盒管理，不会被桌面应用直接执行。
