<!-- 文件说明：列出开发、校验、测试、构建、打包、图标生成和发布前检查的运维命令。 -->

# 构建与发布

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm start` | 自动构建插件后启动 Electron 开发环境 |
| `npm run build:plugins` | 校验并生成全部插件清单 |
| `npm run check:plugins` | 校验注册表与插件目录结构 |
| `npm test` | 运行全部 Node 测试 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 检查 |
| `npm run pack:plugins` | 将 `plugin-src` 打为插件集合 ZIP |
| `npm run install:plugins` | 将本地插件集合 ZIP 安装到 `sandbox/plugins` |
| `npm run prepare:plugins` | 校验、打包并安装全部插件到开发沙盒 |
| `npm run package` | 自动构建插件后生成未安装应用 |
| `npm run make` | 自动构建插件后生成平台安装包 |
| `npm run build:icons` | 生成 PNG、ICO 与 ICNS 图标资源 |

## 发布前检查

至少执行 `npm run build:plugins`、`npm run typecheck`、`npm test` 和 `npm run lint`。确认 `plugin-src/.generated` 没有被提交；它会在构建时重建。逐个插件可通过 `npm --prefix plugin-src/<id> run build` 与 `npm --prefix plugin-src/<id> test` 验证其 npm 入口。

Electron 打包可能在首次执行时下载平台二进制或原生依赖，需要网络。开发或 CI 中的 GPU/沙箱兼容开关仅适用于受限环境；发布真实桌面应用前，应审查 `src/main.ts` 中的 `disable-gpu` 与 `no-sandbox` 相关开关。
