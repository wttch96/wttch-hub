<!--
  文件说明：介绍工作台功能、开发启动方式、插件 API、数据管理和微信服务分发的使用与维护方法。
-->

# wttch-hub

一个基于 Electron + Vue 3 的桌面「小工具集」外壳：在 **Windows** 上渲染出 macOS 风格的异形窗口（无边框圆角 + 红绿灯控制按钮 + 可拖拽顶栏），内嵌可折叠侧栏与多页面路由，并集成了从 [wttch-labs](https://github.com/wttch/wttch-labs) 移植来的四个小工具。

## 文档

| 文档 | 内容 |
| --- | --- |
| [文档总览](docs/README.md) | 全部文档入口与阅读路径 |
| [工作台功能](docs/workbench.md) | 页面、插件设置、导航、Widget、AI 抽屉与托盘 |
| [插件开发概览](docs/plugin-development.md) | `plugin-src`、npm workspace、构建与自动加载 |
| [开发新插件](docs/new-plugin.md) | 模板、依赖、实现、测试、沙盒安装和发布准备 |
| [扩展插件 API](docs/extending-plugin-api.md) | 新能力设计、IPC、运行时注入、测试与版本发布 |
| [系统架构](docs/architecture.md) | Electron 进程边界、插件运行时与数据流 |
| [AI、微信与数据管理](docs/services-and-data.md) | AI、服务订阅、数据快照、备份与凭据边界 |
| [构建与发布](docs/operations.md) | 本地开发、工作区构建、测试、打包与发布检查 |

## 功能

- **macOS 风格窗口（仅 Windows）**：`main` 用 `frame:false + transparent` 建无边框窗口，页面根节点以 CSS `border-radius` 画圆角形成异形形状；渲染层用自绘的「红绿灯」（关闭 / 最小化 / 缩放）通过 IPC 控制真实窗口；顶栏整条可拖拽移动窗口（`-webkit-app-region: drag`），双击顶栏走系统默认的最大化 / 还原。
  - macOS / Linux 保持各自平台的原生窗口框。
- **可折叠侧栏**：主页 / 小工具 / 插件 / 设置，以及可配置的插件快捷菜单；可折叠成只剩图标的窄栏。
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

## 应用图标与系统托盘

应用启动后，Windows 通知区域和 macOS 菜单栏会出现 Hub 图标。点击图标弹出菜单，菜单提供“显示工作台 / 隐藏工作台 / 退出”，右键同样可打开菜单。隐藏窗口不会销毁渲染器，闹钟等已加载插件继续运行；关闭主窗口时默认退出应用，也可在设置中选择“隐藏到托盘”；托盘退出与 Cmd+Q 始终退出。macOS 即使只剩浮动 Widget，也可点击 Dock 或选择托盘菜单中的“显示工作台”重开主工作台。

Windows 使用多尺寸 ICO，macOS 菜单栏使用能随系统明暗自动着色的 Template 及 Retina 版本。应用窗口、Dock/Finder 和安装包同时接入 Hub 应用图标。设计源图、素材说明和生成提示词见 [assets/icons/README.md](assets/icons/README.md)，素材更新后在 macOS 执行 `npm run build:icons`。

## 技术栈

- Electron Forge 7（Vite 插件）+ Electron 44
- Vue 3 + TypeScript + `vue-router`（`createWebHashHistory`，兼容打包后的 `file://`）
- `lucide-vue-next`（图标）
- 工具侧：`antlr4ng`（packetdraw 语法运行时）、`public/templates/`（folderart 的 48 张模板 PNG，约 26MB）

## 插件

工具通过 `src/types/plugin.ts` 中版本化的 `ToolPlugin` API 声明（当前 `apiVersion: 1`）。内置工具注册在 `src/config/tools.ts`；所有可执行插件位于 `plugin-src/<id>/index.ts`，由 `import.meta.glob` 自动发现，并按声明生成工具路由、主页 Widget、statusbar 和独立设置页。每个插件在“插件”管理页通过“插件设置”进入 `/plugins/<plugin-id>/settings`，集中管理页不再混排各插件字段。`src/plugins/runtime.ts` 是统一状态机，负责加载、引用计数激活、停用、卸载、错误隔离、设置事件以及插件私有存储。插件组件通过 `window.toolHost` 使用宿主能力，例如 `window.toolHost?.systemStats()`，不直接访问 Electron IPC。

系统监控、主题配置、Todo 清单和闹钟提醒源码位于 `plugin-src/`，分别示范 Widget/系统能力、主题 token、私有数据存储和桌面通知。每个插件都包含自己的 `package.json`，提供 `npm run build` 和 `npm test` 入口；工作台的启动、打包与制作安装包会先自动构建全部插件。插件包定义写在各自的 `package.ts` 中；运行 `npm run install:plugin-api` 会先卸载旧版本，再将最新的 `@wttch-hub/plugin-api` 安装到 `node_modules`，插件通过包名直接导入宿主 API 类型和定义函数。插件集合 ZIP 由独立的外部打包流程生成，`npm run install:plugins` 可将集合包整体安装或更新到 `plugin-src/`。插件页面还可以用系统文件选择器把 ZIP 加载到 Electron `userData/plugins` 仓库，主进程会限制包体积、验证 API 版本、ID、入口路径和重复 ID；托管仓库中的包可以删除。

### 本地多仓库边界

在接入 GitHub 前，插件相关代码已经按未来仓库拆分为本项目内的独立目录：

- `packages/plugin-api/`：公开 API 包边界；当前唯一类型源仍是 `src/types/plugin.ts`，由 `npm run install:plugin-api` 生成本地包。
- `packages/plugin-debug/`：无 Electron、无网络和无真实密钥的内存调试宿主；本地 TypeScript 与 Vite 已映射到 `@wttch-hub/plugin-debug`，插件测试可直接从该包名导入。
- `plugin-registry/`：只保存版本化插件声明 `plugins.json`，用于审查身份、API 兼容版本和本地源码位置。
- `plugin-src/`：所有本地插件源码根目录；每个插件都有 npm `build` / `test` 入口，复制 `examples/hello-plugin` 到该目录下一层后即可被构建发现。

运行 `npm run check:plugins` 会同时校验声明文件与本地开发插件的 `index.ts`、`package.ts` 是否齐全。上述四个目录以后可以原样拆成各自 Git 仓库；当前不需要网络，也不会从 GitHub 下载或执行任何远程代码。

### 统一 AI 服务与右侧聊天

在 **设置 → AI 服务** 中选择 DeepSeek 或自定义兼容服务，填写服务地址、模型、API Key（DeepSeek 可直接选择 Flash / Pro，自定义兼容服务填写模型 ID），保存后点击“测试连接”。测试会发送一条短补全请求，因此能检查模型调用与鉴权是否可用，并可能产生少量 token 费用。侧栏底部的 **AI 聊天** 打开右侧抽屉，支持编辑系统提示词、多轮聊天、停止、失败重试和新对话；Enter 发送，Shift+Enter 换行。

插件通过 `capabilities.ai` 声明能力，并可提供自己的默认生成参数：

```ts
export default defineToolPlugin({
  // 其余必需字段（id、name、component 等）同普通插件。
  capabilities: { ai: true },
  ai: {
    systemPrompt: '你是中文技术文档助手，请给出简洁且准确的说明。',
    temperature: 0.3,
    maxTokens: 2048,
  },
  // ...
});
```

组件通过注入的 `PluginComponentApi` 使用 `api.ai`；生命周期回调通过 `context.ai` 使用同一接口：

```ts
const status = await api.ai.getStatus();
if (status.ok === true && status.value.enabled && status.value.configured) {
  const requestId = crypto.randomUUID();
  const result = await api.ai.chat({
    requestId,
    messages: [{ role: 'user', content: '解释这个函数的作用。' }],
    // 单次调用可覆盖插件默认系统提示词、模型、temperature、maxTokens。
    systemPrompt: '请用中文分三点回答。',
  });
  if (result.ok === true) {
    console.log(result.value.content, result.value.usage);
  } else {
    console.log(result.error.code, result.error.message, result.error.retryable);
  }
  // 对仍在执行的请求：await api.ai.cancel(requestId);
}

const subscription = api.ai.onDidChange((status) => {
  // configured 表示配置完整；connection 才表示最近一次调用是否通过。
  console.log(status.configured, status.connection, status.lastError);
});
// 页面不再使用订阅时：subscription.dispose(); 宿主卸载插件时也会统一清理。
// 显式诊断：const result = await api.ai.test(); 会发送一条短测试消息。
```

- `getStatus()` 区分 `configured`（密钥可读取且配置完整）、`enabled`（全局开关）和 `connection`（`untested` / `ok` / `error`），同时提供检查时间及最近错误。保存新配置后重置验证状态并取消旧请求。
- `chat()` 返回完整文本、实际模型、结束原因与可选 token 用量。当前为非流式文本补全，支持 `systemPrompt`、`model`、`temperature`、`maxTokens`、`responseFormat` 和 DeepSeek 的 `thinking` 开关，不执行模型生成的工具或代码。
- `responseFormat: 'json_object'` 需要兼容服务支持，并在提示词中要求 JSON；`finishReason: 'length'` 表示输出可能被截断。内置聊天最多携带最近 20 轮成功对话，聊天记录仅保留在当前会话内存中。
- 错误码包含 `NOT_CONFIGURED`、`DISABLED`、`FORBIDDEN`、`AUTH`、`RATE_LIMIT`、`TIMEOUT`、`CANCELLED`、`NETWORK`、`PROVIDER`、`INVALID_REQUEST`、`INVALID_RESPONSE`、`STORAGE`、`UNAVAILABLE`、`BUSY`，调用方可直接判断 `ok` 与 `error.code`。
- 密钥只在主进程中解密，以 Electron `safeStorage` 加密后写入 `userData/ai-config.json`；不会通过状态接口返回，也不会写入插件存储或 localStorage。系统安全存储不可用时拒绝保存密钥，不退回明文存储。更换服务地址必须重新输入密钥。
- AI IPC 校验应用文档与主 frame，取消请求按窗口和调用方隔离。插件仍遵循宿主现有的可信、同渲染器运行方式；能力声明不是对恶意插件的独立安全沙箱。只有应用设置入口应调用 `configure`，插件使用 `api.ai`。
- 自定义地址使用 Chat Completions 根路径（如 `https://example.com/v1`），自动追加 `/chat/completions`。远程服务使用 HTTPS，HTTP 仅允许本机兼容服务；不跟随重定向发送密钥。

接口依据：[DeepSeek Chat Completions 文档](https://api-docs.deepseek.com/api/create-chat-completion/)、[Electron safeStorage 文档](https://www.electronjs.org/docs/latest/api/safe-storage)。API 类型更新后运行 `npm run install:plugin-api` 更新插件开发包。

### 插件导航菜单

在插件入口的 `defineToolPlugin({...})` 中声明 `navigation`，即可提供侧栏快捷入口：

```ts
navigation: {
  label: '待办清单',     // 默认菜单名称；省略时使用插件 name
  defaultVisible: true, // 默认显示；false 表示允许用户在设置中手动打开
  order: 10,            // 默认排序权重，数值越小越靠前
},
```

- `navigation: true` 使用默认名称并默认显示；`false` 或不填写表示不支持导航入口，不会出现在菜单设置中。
- 用户可在 **设置 → 导航菜单** 中勾选显示、重命名、上移/下移或恢复全部默认配置。名称最多 40 个字符，留空恢复插件默认名称；修改后自动保存，重启后保留。
- 菜单重命名只影响侧栏，不改变插件名称、工具库标题、路由或插件 ID。插件菜单位于“小工具”和“插件”之间，固定的应用入口不参与排序。
- 禁用插件会隐藏它的导航入口，重新启用后恢复之前的菜单偏好；隐藏菜单不会禁用插件，工具库仍可打开。
- Todo 和闹钟默认显示，系统监控支持导航但默认隐藏，主题插件不提供导航入口。
- 导航偏好使用独立的 `wttch-hub:navigation:v1` 存储键，并通过 `storage` 事件同步到其他窗口。菜单配置字段是可选扩展，API 版本保持为 1；更新类型后运行 `npm run install:plugin-api` 刷新本地开发包。

### 生命周期与宿主 API

生命周期顺序与 VS Code 的扩展模型相近：`load → activate → deactivate → unload`。启用插件触发 `load`；首次打开工具页或挂载 Widget 时触发 `activate`；页面和 Widget 都释放后触发 `deactivate`；禁用、卸载或应用退出时触发 `unload`。回调可以是异步函数，`load`/`activate` 可以返回清理函数或 `{ dispose() }`。插件放进 `context.subscriptions` 的资源会在卸载时按逆序自动释放。

`PluginActivationContext` 提供以下受控能力：

- `host`：主进程能力代理，目前包含系统统计数据和受校验的桌面通知。
- `ui`：Toast 和 Sheet UI，不需要插件直接操作宿主组件。
- `settings`：读取、更新设置并订阅变化；声明式字段支持 boolean、number、text 和 select。
- `storage`：按插件 ID 隔离并持久化的键值存储，支持变更订阅。
- `data`：基于同一存储提供键列表、JSON 字节用量、快照导出/恢复和清空；仅操作本插件的数据。
- `services`：发布插件声明的服务结果，由用户配置的微信订阅决定是否分发以及接收会话。
- `PLUGIN_COMPONENT_API_KEY`：工具页和 Widget 通过 Vue `inject` 获取同一套受控宿主能力。
- `floatingWidget`：声明独立的透明浮动组件；`host.openFloatingWidget()`、`updateFloatingWidget()` 和 `closeFloatingWidget()` 控制窗口尺寸、置顶及位置锁定。
- `subscriptions`：VS Code 风格的 Disposable 集合。

插件管理页展示 `加载中 / 已加载 / 激活中 / 运行中 / 已禁用 / 错误` 状态，并提供打开、设置、启用/禁用和删除操作。禁用会立即从工具库、路由和 Widget 库移除，并执行清理。Widget 支持添加、移除、拖动、缩放、固定和布局持久化。

闹钟调度器在插件 `load` 生命周期中运行，窗口最小化时仍保持计时；禁用插件或退出应用会按生命周期停止调度。应用完全退出后不会驻留系统后台，因此不会触发关机期间的提醒。

闹钟插件同时提供主页时间 Widget 和浮动时钟。浮动窗口使用独立透明渲染器，可始终置顶并跨桌面显示；锁定后禁止窗口移动和缩放。浮动渲染器只激活主题与目标插件，避免重复运行插件级后台任务。

> Vue SFC/TypeScript 插件必须参与 Vite 编译。应用内“加载 ZIP”负责可信包仓库和清单管理；如果包中的插件 ID 尚未编译进当前应用，管理页会显示“待编译”。开发时将包放入项目 `plugins/`，运行 `npm run install:plugins` 后重新构建。宿主不会把任意 ZIP 源码当作 JavaScript 直接执行。

## 窗口行为与数据管理

设置中的“窗口与后台运行”提供“退出应用 / 隐藏到托盘”，配置写入 `userData/desktop-config.json`，保存后立即生效。托盘不可用时回退到退出，避免窗口隐藏后无法找回。单实例锁按 Electron 的用户数据目录区分实例；再次启动会还原、显示并聚焦已有主窗口，不重复创建托盘或插件调度器。生命周期接口依据 [Electron app 文档](https://www.electronjs.org/docs/latest/api/app)。

“数据管理”显示运行时真实的 `app.getPath('userData')`，支持打开目录、导出 JSON 备份和恢复备份：

- 白名单包含插件存储与设置、导航、主页 Widget 布局、folderart 偏好、packetdraw 文本和关闭行为。
- 不导出 AI 和微信配置/密钥、Cookie、缓存或插件 ZIP；业务数据中的插件自存内容按原样备份，因此插件不要把秘密写入 `storage`。
- 恢复先校验格式、版本、数据结构和 10 MB 大小限制，再显示覆盖确认。确认后重新读取当前数据，自动写入 `userData/backups/before-restore-*.json`。
- 恢复通过 `pending-restore.json` 暂存；关闭旧 Widget，重载主窗口，在插件模块导入前应用快照。写入失败会回滚 localStorage，待恢复文件保留供重试。成功后更新关闭行为并删除暂存文件。
- 未安装插件的数据会保留，安装相应插件后可以读取。恢复后需手动重新打开浮动 Widget。AI 聊天目前仍是内存会话，不在备份内。

### 插件数据 API

`context.data` 与组件注入的 `api.data` 都使用 `PluginDataApi`，与现有 `storage` 共用 `wttch-hub:plugin-runtime:v1` 中按插件 ID 划分的命名空间；不改变已有同步存储接口，也不需要搬迁数据。

```ts
// 日常读写继续使用 storage。
context.storage.update('result', { text: '任务完成' });
const keys = context.data.keys();
const usage = context.data.getUsage(); // { keys: 键数量, bytes: JSON UTF-8 字节数 }
const snapshot = context.data.export(); // 深拷贝，可 JSON.stringify 后用于传输或留存

// 仅接受本插件、version=1 的快照；整体替换 storage，单插件导入上限 4 MB。
// 恢复和清空会通知 storage.onDidChange，失败会抛错，原数据保留。
context.data.import(snapshot);
// 只有用户在插件界面明确选择清空时才调用：
// context.data.clear();
```

快照格式为 `{ format: 'wttch-hub-plugin-data', version: 1, pluginId, data }`。设置字段、其他插件数据和宿主凭据不在插件快照内。插件数据 API 不暴露任意文件路径读写；整体文件备份由宿主设置页处理。插件处于现有可信渲染器模型，命名空间是 API 边界，不是恶意代码隔离沙箱。更新开发类型包可运行 `npm run install:plugin-api`。

## 微信官方 ClawBot 与服务分发

设置中的“微信 ClawBot · 服务订阅”直接使用腾讯官方公开的 iLink 微信通道协议，不要求安装 OpenClaw。本实现对照官方插件 2.4.8：参考 [腾讯官方仓库](https://github.com/Tencent/openclaw-weixin)、[扫码登录流程](https://github.com/Tencent/openclaw-weixin/blob/main/src/auth/login-qr.ts) 和 [收发接口](https://github.com/Tencent/openclaw-weixin/blob/main/src/api/api.ts)。

使用流程：

1. 点击“扫码连接微信”，使用手机微信扫描并确认；若提示配对码，填写手机显示的数字。
2. 在微信中给 ClawBot 发送一条消息。宿主收取官方返回的会话 ID 与 context token，才能确定可投递的会话。
3. 选择服务（例如“闹钟提醒 · 闹钟触发”）和接收会话，添加并保存订阅。保存意味着允许该服务后续发布的标题和正文发送到指定会话。
4. 查看最近发送记录，或暂停分发、移除订阅。会话上下文过期时需再次向 ClawBot 发消息；登录失效时重新扫码。

插件声明服务并发布结果：

```ts
export default defineToolPlugin({
  // 省略常规 id/name/component 等字段。
  capabilities: { ai: true, services: true },
  services: [{ id: 'daily-report', name: '日报结果', description: '生成日报后发布最终文本' }],
});

// 在插件任务中使用 lifecycle context 或组件 api；只发布明确选定的最终结果。
const status = await context.services.getStatus('daily-report');
const result = await context.ai.chat({ messages: [{ role: 'user', content: '根据任务数据生成日报' }] });
if (result.ok) {
  const delivery = await context.services.publish('daily-report', {
    id: 'daily-report-2026-09-05', // 同一业务事件使用稳定 ID
    title: '今日日报',
    text: result.value.content, // 本版正文上限 3500 字符；标题上限 120 字符
  });
  // delivery: { accepted, sent, failed, skipped, error? }
  // sent 只表示微信接口接受请求，不代表用户已阅读。
}
```

宿主按 `pluginId/serviceId` 隔离主题。插件无法通过此 API 选择任意微信收件人或读取 token；服务须声明 `capabilities.services`，禁用插件后不可继续发布。Widget 不发布也不登记服务，避免重复通知。外部服务可以由插件获取结果后以同一 API 发布，本版不提供公网回调服务器。

凭据、会话上下文和订阅统一经 Electron `safeStorage` 加密写入 `userData/wechat-config.json`，不进入通用备份。入站消息正文不保存、不执行，也不自动传给 AI。换账号前需退出登录；退出时清除旧会话和订阅，避免新账号误继承接收人。

当前分发为文本、单账号、在线发送。队列最多 50 个事件，当前进程最近 500 个事件 ID 去重；最近 50 条发送记录仅存内存，不保存正文。没有订阅就不发送，暂停或退出应用不投递，失败/超时不自动重试，重启不补发历史事件。已经发出的网络请求可能在撤销订阅前被微信接受，撤销仅阻止尚未发出的后续投递。插件仍运行在可信渲染器模型中，此 API 隔离不是恶意插件安全沙箱。

测试使用模拟微信响应验证协议、配对登录、取消竞态、订阅撤销、去重、IPC 来源与凭据存储；真实扫码和接收会话需要用户自行授权后联调。

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
| `npm run pack:plugins` | 将系统监控、主题、Todo 和闹钟源码打成插件集合 ZIP |

### 插件开发流程

插件 API 的唯一源定义是 `src/types/plugin.ts`，未来对应 `packages/plugin-api/` 独立仓库。插件开发前先运行：

```bash
npm install
npm run install:plugin-api
```

`install:plugin-api` 会读取宿主的 TypeScript API 定义，在系统临时目录生成 npm package，先卸载旧的 `@wttch-hub/plugin-api`，再安装新版本到 `node_modules`。它不会把类型文件复制到 `src/plugins`，也不会修改宿主的 `package.json`。

所有插件源码放在 `plugin-src/<plugin-id>/`，入口通常是 `index.ts`，包信息写在同目录的 `package.ts`：

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

工具入口在同一个目录中使用 `defineToolPlugin(...)` 导出。宿主会自动扫描 `plugin-src`，并根据声明生成工具路由、Widget、状态栏和设置入口。执行 `npm run start` 时会先自动运行 `npm run build:plugins`，再由 Vite 编译和加载全部插件。插件需要系统数据时，通过 `window.toolHost` 使用宿主能力，不要直接导入 Electron 或访问 IPC。写单元测试时，可从 `@wttch-hub/plugin-debug` 调用 `createPluginDebugHost({ pluginId })`，获得只在内存中运行的 `context('startup')` 和副作用记录。

插件 API 更新后，重新运行 `npm run install:plugin-api`；开发服务器需要重启才能重新解析依赖。插件的启用状态和配置由宿主设置页管理，路由切换时宿主会执行插件事件回调返回的 cleanup 函数。

系统监控、主题配置、Todo 清单与闹钟提醒作为完整的外置插件示例发布。修改 `plugin-src/` 后运行 `npm run pack:plugins`，会将入口、Vue 页面、Widget、主题定义、包清单和插件 API 类型快照压缩到 `plugins/wttch-hub@plugins-1.0.0.zip`。在一份没有已安装源码的工作区中，把该 ZIP 放入 `plugins/` 并运行 `npm run install:plugins`，即可恢复插件源码后参与构建。

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
  theme/             # 全局主题 token 与预设色板
  todo/              # Todo 工具页、Widget 与私有存储
  alarm/             # 闹钟工具页、Widget、后台调度与桌面通知
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
