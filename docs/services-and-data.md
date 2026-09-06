<!-- 文件说明：说明统一 AI 服务、微信 ClawBot 服务订阅、插件数据 API、备份恢复与凭据保护规则。 -->

# AI、微信与数据管理

## AI 服务与插件 API

设置页支持 DeepSeek 与兼容 Chat Completions 服务。DeepSeek 可选择 Flash 或 Pro；可配置服务地址、模型、超时、启用状态和 API Key，并使用“测试连接”验证调用。密钥只在主进程使用 Electron `safeStorage` 加密保存，状态接口不会返回密钥。

插件须声明 `capabilities.ai: true`，再通过 `context.ai` 或组件注入的 `api.ai` 调用 `getStatus`、`test`、`chat`、`cancel` 和 `onDidChange`。状态分别表达是否启用、是否配置完整和最近连接是否通过；错误以稳定错误码返回，插件不应依赖服务商原始错误文本。

插件可提供默认系统提示词、模型、温度和最大 token；单次请求可覆盖这些默认值。插件只能调用统一配置，不会获得 API Key。

## 微信 ClawBot 服务订阅

插件声明 `capabilities.services` 与服务 ID 后，通过 `api.services.publish(serviceId, output)` 发布明确选定的结果。用户在设置中配置微信 ClawBot 并订阅 `pluginId/serviceId` 后，宿主才向对应会话发送文本。插件不能选择任意收件人，也不能读取微信 token。

当前实现为单账号、在线文本分发。队列限制为 50 个事件，当前进程最近 500 个事件 ID 去重；取消订阅只阻止尚未发送的项目，失败和重启不会自动重试或补发。入站消息不保存、不执行，也不会自动交给 AI。

## 数据管理

`api.storage` 为插件 ID 隔离的键值存储；`api.data` 在同一命名空间上提供 `keys`、用量统计、导出、导入与清空。单插件快照格式为 `wttch-hub-plugin-data`，只包含该插件数据，不包含设置、其他插件数据或宿主凭据。

设置页可进行整体业务数据备份与恢复。备份不包含 AI/微信密钥、Cookie、缓存和插件 ZIP。插件作者不得把密钥写入 storage，因为插件业务数据可能被用户导出。
