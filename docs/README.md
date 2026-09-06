<!-- 文件说明：提供项目文档总入口，按使用者角色连接工作台使用、插件开发、运行架构与运维说明。 -->

# wttch-hub 文档

| 文档 | 适用对象 | 内容 |
| --- | --- | --- |
| [工作台功能](./workbench.md) | 使用者 | 页面、插件管理、AI 聊天、Widget 与设置 |
| [插件开发](./plugin-development.md) | 插件作者 | `plugin-src`、npm 入口、API、测试和构建加载 |
| [系统架构](./architecture.md) | 维护者 | Electron 进程边界、路由、运行时和数据流 |
| [AI、微信与数据管理](./services-and-data.md) | 使用者与维护者 | AI 配置、服务分发、备份恢复和安全边界 |
| [构建与发布](./operations.md) | 维护者 | 开发、测试、打包、图标与已知限制 |

本目录描述当前本地单仓库形态。`packages/plugin-api`、`packages/plugin-debug`、`plugin-registry` 和 `plugin-src` 已保留未来拆分为独立仓库的边界；当前不会从 GitHub 下载或直接执行远程插件代码。
