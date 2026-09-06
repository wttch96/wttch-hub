<!-- 文件说明：描述 Electron 主进程、预加载脚本、Vue 渲染进程、插件运行时与配置目录之间的架构边界。 -->

# 系统架构

## 进程边界

`src/main.ts` 创建窗口、托盘、单实例锁、插件 ZIP 仓库和受限 IPC。`src/preload.ts` 通过 contextBridge 暴露窗口控制及经过验证的宿主调用；渲染进程不应直接访问 Node/Electron。`src/renderer.ts` 挂载 Vue 应用，`src/router.ts` 按插件清单生成工具路由。

渲染进程中的 `src/plugins/runtime.ts` 管理插件状态机：`load → activate → deactivate → unload`。它以引用计数避免页面、Widget 和浮动窗口重复激活，并在禁用、卸载、错误和退出时释放订阅与未完成请求。

## 配置与数据位置

普通插件设置、插件私有 storage、导航偏好和主页 Widget 布局保存在渲染进程本地存储。主进程的用户数据目录由 Electron `app.getPath('userData')` 决定；其中包含 AI 配置、微信配置、桌面行为偏好、托管插件 ZIP 与恢复暂存文件。开发构建的插件 ZIP 位于项目 `sandbox/plugins`，主进程会一并扫描；它是可再生的本地沙盒目录。实际用户数据路径因系统、应用 ID 和安装方式不同，应通过运行时 Electron API 获取，不应在代码中写死。

数据管理模块只导出登记的业务数据。恢复前会写入暂存文件、关闭旧 Widget 并重载窗口，确保插件在导入新数据后再激活。未安装插件的数据保留在备份中，重新安装相同 ID 的插件后可以读取。

## 未来仓库边界

- `packages/plugin-api`：插件公开类型与定义函数。
- `packages/plugin-debug`：插件测试运行环境。
- `plugin-registry`：可审查的插件身份、版本、能力与源码位置声明。
- `plugin-src`：当前单仓库中的插件源码集合。

当前这些目录由同一工作台编译。拆成独立仓库后，宿主需要固定 API 版本、验证分发包完整性，并保持对插件代码的构建与安全审查。
