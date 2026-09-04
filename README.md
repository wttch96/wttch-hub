# wttch-hub

一个基于 Electron + Vue 3 的桌面「小工具集」外壳：在 **Windows** 上渲染出 macOS 风格的异形窗口（无边框圆角 + 红绿灯控制按钮 + 可拖拽顶栏），内嵌可折叠侧栏与多页面路由，并集成了从 [wttch-labs](https://github.com/wttch/wttch-labs) 移植来的四个小工具。

## 功能

- **macOS 风格窗口（仅 Windows）**：`main` 用 `frame:false + transparent` 建无边框窗口，页面根节点以 CSS `border-radius` 画圆角形成异形形状；渲染层用自绘的「红绿灯」（关闭 / 最小化 / 缩放）通过 IPC 控制真实窗口；顶栏整条可拖拽移动窗口（`-webkit-app-region: drag`），双击顶栏走系统默认的最大化 / 还原。
  - macOS / Linux 保持各自平台的原生窗口框。
- **可折叠侧栏**：主页 / 小工具 / 设置 三个导航项，可折叠成只剩图标的窄栏。
- **页面切换**：带淡入淡出的 mac 风格转场。
- **底部状态栏**：显示当前页面，右侧有调试按钮可开关 Chrome DevTools（以独立窗口打开；dev 模式启动时自动打开）。
- **四个移植工具**（作为「工具库卡片页 + 嵌套子路由」接入 `/tools`）：

| 路由 | 工具 | 说明 |
| --- | --- | --- |
| `/tools` | 小工具库 | 卡片入口页 |
| `/tools/folderart` | 图标生成器 | 把图片变成 macOS / Windows 风格文件夹图标（PNG 导出） |
| `/tools/packetdraw` | 协议绘制器 | 用文本描述渲染网络协议时序图（SVG / PNG） |
| `/tools/radixconv` | 进制转换器 | 2 / 8 / 10 / 16 进制大数互转与位运算 |
| `/tools/bitparser` | 16 进制数值解析 | 将完整 HEX 解析为整数、补码或标准 IEEE 754 float / double |

## 技术栈

- Electron Forge 7（Vite 插件）+ Electron 44
- Vue 3 + TypeScript + `vue-router`（`createWebHashHistory`，兼容打包后的 `file://`）
- `lucide-vue-next`（图标）
- 工具侧：`antlr4ng`（packetdraw 语法运行时）、`public/templates/`（folderart 的 48 张模板 PNG，约 26MB）

## 插件

工具通过 `src/types/plugin.ts` 中版本化的 `ToolPlugin` API 声明（当前 `apiVersion: 1`）。内置工具注册在 `src/config/tools.ts`；放入 `src/plugins/<id>/index.ts` 的插件会由 `import.meta.glob` 自动发现，并按声明生成工具路由、主页 Widget、statusbar 和设置表单。`src/plugins/runtime.ts` 是统一状态机，负责加载、引用计数激活、停用、卸载、错误隔离、设置事件以及插件私有存储。插件组件通过 `window.toolHost` 使用宿主能力，例如 `window.toolHost?.systemStats()`，不直接访问 Electron IPC。

当前系统监控源码位于 `src/plugins/system-monitor/`，同时提供系统监控页面与 CPU / GPU Widget，作为外置插件示例。插件包定义写在各自的 `package.ts` 中；运行 `npm run install:plugin-api` 会先卸载旧版本，再将最新的 `@wttch-hub/plugin-api` 安装到 `node_modules`，插件通过包名直接导入宿主 API 类型和定义函数。插件集合 ZIP 由独立的外部打包流程生成，`npm run install:plugins` 可将集合包整体安装或更新到 `src/plugins/`。插件页面还可以用系统文件选择器把 ZIP 加载到 Electron `userData/plugins` 仓库，主进程会限制包体积、验证 API 版本、ID、入口路径和重复 ID；托管仓库中的包可以删除。

### 生命周期与宿主 API

生命周期顺序与 VS Code 的扩展模型相近：`load → activate → deactivate → unload`。启用插件触发 `load`；首次打开工具页或挂载 Widget 时触发 `activate`；页面和 Widget 都释放后触发 `deactivate`；禁用、卸载或应用退出时触发 `unload`。回调可以是异步函数，`load`/`activate` 可以返回清理函数或 `{ dispose() }`。插件放进 `context.subscriptions` 的资源会在卸载时按逆序自动释放。

`PluginActivationContext` 提供以下受控能力：

- `host`：主进程能力代理，目前包含系统统计数据。
- `ui`：Toast 和 Sheet UI，不需要插件直接操作宿主组件。
- `settings`：读取、更新设置并订阅变化；声明式字段支持 boolean、number、text 和 select。
- `storage`：按插件 ID 隔离并持久化的键值存储。
- `subscriptions`：VS Code 风格的 Disposable 集合。

插件管理页展示 `加载中 / 已加载 / 激活中 / 运行中 / 已禁用 / 错误` 状态，并提供打开、设置、启用/禁用和删除操作。禁用会立即从工具库、路由和 Widget 库移除，并执行清理。Widget 支持添加、移除、拖动、缩放、固定和布局持久化。

> Vue SFC/TypeScript 插件必须参与 Vite 编译。应用内“加载 ZIP”负责可信包仓库和清单管理；如果包中的插件 ID 尚未编译进当前应用，管理页会显示“待编译”。开发时将包放入项目 `plugins/`，运行 `npm run install:plugins` 后重新构建。宿主不会把任意 ZIP 源码当作 JavaScript 直接执行。

## 快速开始

```bash
npm install
npm start
```

> 安装了 [rtk](https://github.com/wttch/rtk) 的话可写成 `rtk npm install` / `rtk npm start`。

常用脚本（`package.json`）：

| 脚本 | 作用 |
| --- | --- |
| `npm start` | `electron-forge start`，开发模式运行 |
| `npm run package` | 打包未安装程序（输出到 `out/`） |
| `npm run make` | 生成平台安装包 |
| `npm run publish` | 发布 |
| `npm run lint` | ESLint 检查（`.ts` / `.tsx` / `.vue`） |
| `npm run pack:plugins` | 将系统监控源码打成 `plugins/wttch-hub@plugins-1.0.0.zip` |

### 插件开发流程

插件 API 的唯一源定义是 `src/types/plugin.ts`。插件开发前先运行：

```bash
npm install
npm run install:plugin-api
```

`install:plugin-api` 会读取宿主的 TypeScript API 定义，在系统临时目录生成 npm package，先卸载旧的 `@wttch-hub/plugin-api`，再安装新版本到 `node_modules`。它不会把类型文件复制到 `src/plugins`，也不会修改宿主的 `package.json`。

插件源码放在 `src/plugins/<plugin-id>/`，入口通常是 `index.ts`，包信息写在同目录的 `package.ts`：

```ts
import {
  definePluginPackage,
} from '@wttch-hub/plugin-api';

export default definePluginPackage({
  apiVersion: 1,
  id: 'example-tool',
  version: '1.0.0',
  name: '示例工具',
  entry: 'index.ts',
  capabilities: ['widget', 'statusbar'],
});
```

工具入口在同一个目录中使用 `defineToolPlugin(...)` 导出。宿主会自动扫描 `src/plugins`，并根据声明生成工具路由、Widget、状态栏和设置入口。插件需要系统数据时，通过 `window.toolHost` 使用宿主能力，不要直接导入 Electron 或访问 IPC。

插件 API 更新后，重新运行 `npm run install:plugin-api`；开发服务器需要重启才能重新解析依赖。插件的启用状态和配置由宿主设置页管理，路由切换时宿主会执行插件事件回调返回的 cleanup 函数。

系统监控作为完整的外置插件示例发布。修改 `src/plugins/system-monitor/` 后运行 `npm run pack:plugins`，会将入口、Vue 页面、Widget、包清单和插件 API 类型快照压缩到 `plugins/wttch-hub@plugins-1.0.0.zip`。在一份没有已安装源码的工作区中，把该 ZIP 放入 `plugins/` 并运行 `npm run install:plugins`，即可恢复到 `src/plugins/system-monitor/` 后参与构建。

### 开发诊断

设 `WTTCH_DIAG=1` 启动，主进程会做一次「路由巡游」：自动依次跳到各页面，输出 DOM 快照并截图到 `.diag/`，用于排查白屏 / 布局问题（设 `WTTCH_DIAG_NO_SHOT=1` 可跳过截图）。

## 目录结构

```
forge.config.ts / vite.{main,preload,renderer}.config.ts   # 构建配置
src/
  main.ts            # Electron 主进程：窗口、IPC、GPU/sandbox 开关、诊断
  preload.ts         # contextBridge：window.windowControls（窗口控制）
  renderer.ts        # 入口：挂载 App + 引入全局样式（顺序很重要）
  App.vue            # 外壳：自绘标题栏 + 侧栏 + 路由出口
  router.ts          # 路由表（hash 模式）
  index.css          # hub 全局样式 / 设计变量
  config/labs-styles.css   # 从 wttch-labs 引入的工具全局样式（须先于 index.css）
  components/Sidebar.vue
  views/             # HomeView / ToolsArea / ToolsView / SettingsView
  tools/             # 从 wttch-labs 移植的四个内置工具源码
plugins/             # 生成的插件 ZIP，仅用于分发和运行时扫描
src/plugins/
  system-monitor/    # 外置插件源码：CPU / GPU / 内存 / IO 监控
  lib/  types/  composables/   # 工具共享代码（含空桩 useSiteFooter）
public/templates/    # folderart 模板 PNG（构建期原样复制到产物）
```

## 集成 wttch-labs 工具的说明

- 工具源码整体拷贝到 `src/tools/*`，其内部通过 `@/` 别名引用共享模块；渲染端在 `vite.renderer.config.ts` 配了 `@ → ./src`（tsconfig `paths` 同步），所以**不要把 `@/` 改回相对路径**。
- 工具的全局样式集中在 `src/config/labs-styles.css`，在 `renderer.ts` 中**先于** `src/index.css` 引入：这样 hub 的 `body{ background:transparent; overflow:hidden }` 与 `--accent/--text` 等主题变量能保持最后发言权（圆角透明窗口依赖它）。
- folderart 需要 `public/templates/` 下的本地模板图；代码统一用相对路径 `./templates/...` 引用，dev 服务器与打包后的 `file://` 都能解析。
- labs 站点的「页脚」机制（`useSiteFooter`）在 hub 里是空桩 `src/composables/useSiteFooter.ts`，保持调用点签名不变、不渲染任何内容。
- 打包构建不需要 sharp / express / antlr4ng-cli 等 labs 的**构建期**依赖，只有运行期依赖 `antlr4ng` 进了 `dependencies`。

### 已知限制

1. **folderart 的在线图标搜索需要联网**：搜索请求由主进程用 Electron `net` 转发到 iconfont.cn（等价于原站 dev 代理，见 `src/main.ts` 的 `iconfont:search`），不再依赖 Web 代理，dev 与打包后都可用。匿名搜索返回公开图标；需要更完整结果时，可设环境变量 `ICONFONT_COOKIE=<EGG_SESS_ICONFONT 值>` 启动。离线/被墙时该搜索会报错，不影响本地 PNG 上传与内置模板。
2. **folderart 的布局断点按“窗口宽度”判定**：窗口宽 ≥ 1024px 才显示完整的三列工作台；较窄窗口（含默认 960px）会按 labs 的响应式退化成单列滚动。最大化窗口即可看到三列布局。
3. 工具按 Web 场景编写，字体为系统字体栈（Windows 上 `SF Mono` 自动回退 `Consolas`）。

## ⚠️ 环境相关开关（发布前必读）

`src/main.ts` 顶部有一组 **仅为受限开发环境**（远程桌面 / 虚拟机 / CI 无 GPU）准备的开关：

```ts
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('no-sandbox');
```

它们用于解决此类会话里 Chromium GPU 进程与沙箱子进程启动失败（`error_code=18` / `render-process-gone`）。**发布给真实用户前应移除或按环境开关控制**——尤其 `no-sandbox` 会关闭渲染进程沙箱，绝不能带进正式发行版。

## License

MIT
