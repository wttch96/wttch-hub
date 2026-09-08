/**
 * 文件说明：发布为 @wttch-hub/plugin-api 的插件公共 API，约定插件清单、生命周期、存储、AI 和服务分发接口。
 */

import type { Component } from 'vue';

/**
 * 插件 API 的协议版本。
 *
 * 这是插件和宿主之间最重要的兼容性标记。新增字段时通常保持向后
 * 兼容；如果以后出现无法兼容的结构变化，应提升这个版本，并由宿主
 * 在加载插件前拒绝不认识的版本。
 */
/** 宿主和插件共同遵守的 API 协议版本。 */
export const PLUGIN_API_VERSION: 1;

/** 懒加载的 Vue 组件入口，避免打开应用时一次性加载所有工具。 */
export type ComponentLoader = () => Promise<{ default: Component }>;

/** 宿主提供给插件的系统统计数据，插件不需要直接接触 Electron IPC。 */
export type SystemStats = {
  cpu: number;
  memory: number;
  gpu: number;
  readBytes: number;
  writeBytes: number;
  downloadBytes: number;
  uploadBytes: number;
};

export type PluginNotification = {
  title: string;
  body?: string;
  silent?: boolean;
};

export type FloatingWidgetWindowOptions = {
  /** 同一插件内的窗口唯一标识；省略时使用默认窗口。 */
  id?: string;
  width?: number;
  height?: number;
  alwaysOnTop?: boolean;
  locked?: boolean;
};

export interface ToolHostApi {
  /** 请求一次最新系统统计数据。 */
  systemStats(): Promise<SystemStats>;
  /** 通过主进程显示一条系统桌面通知。 */
  showNotification(options: PluginNotification): Promise<boolean>;
  /** 打开当前插件声明的透明浮动 Widget。 */
  openFloatingWidget(options?: FloatingWidgetWindowOptions): Promise<boolean>;
  /** 更新浮动 Widget 的置顶、锁定或尺寸状态。 */
  updateFloatingWidget(options: FloatingWidgetWindowOptions): Promise<boolean>;
  /** 关闭当前插件的浮动 Widget。 */
  closeFloatingWidget(id?: string): Promise<boolean>;
  /** 唤起工作台主窗口，用于提醒悬浮窗点击后的跳转。 */
  showWorkbench(): Promise<boolean>;
}

export type MaybePromise<T> = T | Promise<T>;
export interface Disposable {
  dispose(): void;
}
/** 插件回调可返回清理函数或 VS Code 风格的 Disposable。 */
export type PluginCleanup = (() => MaybePromise<void>) | Disposable;
export type PluginActivationReason = 'startup' | 'route' | 'widget' | 'floating-widget' | 'manual';
export type PluginDeactivationReason =
  'route' | 'widget' | 'floating-widget' | 'disabled' | 'uninstalled' | 'shutdown' | 'error';

export interface PluginSettingsApi {
  get<T extends boolean | number | string>(key: string, fallback?: T): T | undefined;
  update(key: string, value: boolean | number | string): void;
  onDidChange(listener: (key: string, value: boolean | number | string) => void): Disposable;
}

export interface PluginStorageApi {
  get<T>(key: string, fallback?: T): T | undefined;
  update<T>(key: string, value: T): void;
  delete(key: string): void;
  onDidChange(listener: (key: string, value: unknown) => void): Disposable;
}

/** 可移植的插件数据快照；只含当前插件 storage，不含设置或宿主 AI 密钥。 */
export type PluginDataSnapshot = {
  format: 'wttch-hub-plugin-data';
  version: 1;
  pluginId: string;
  data: Record<string, unknown>;
};
/**
 * 插件数据管理：与现有 storage 共用持久化空间，无需迁移已有数据。
 * import 以快照整体替换当前插件数据，校验版本和插件 ID；clear 仅清空自身数据。
 * 这两个操作均触发 storage.onDidChange，持久化失败时保留原数据并抛出错误。
 * 导出是普通 JSON 快照，文件选择与整体备份由宿主设置页负责。
 * 不应在此保存 API Key 等秘密；第三方插件仍运行在宿主可信渲染器中，并非安全沙箱。
 */
export interface PluginDataApi {
  keys(): string[];
  getUsage(): { keys: number; bytes: number };
  export(): PluginDataSnapshot;
  import(snapshot: PluginDataSnapshot): void;
  clear(): void;
}

/** 插件发布的服务结果；id 是业务事件的稳定 ID，用于当前进程内去重。 */
export type ServiceOutput = { id: string; title: string; text: string };
export type ServicePublishResult = {
  accepted: boolean;
  sent: number;
  failed: number;
  skipped: number;
  error?: string;
};
/**
 * 插件只发布自己声明的服务结果，不选择微信收件人，也不读取微信凭据。
 * 用户在宿主设置中创建服务订阅后才向相应会话分发；没有订阅时跳过发送。
 * AI 输出不会自动外发，插件应明确选择要发布的最终结果。
 */
export interface PluginServicesApi {
  publish(serviceId: string, output: ServiceOutput): Promise<ServicePublishResult>;
  getStatus(serviceId: string): Promise<{ configured: boolean; subscribed: number }>;
}

export interface PluginUiApi {
  showToast(message: string, kind?: 'info' | 'success' | 'error', duration?: number): number;
  dismissToast(id: number): void;
  openSheet(options: {
    title?: string;
    component?: Component;
    props?: Record<string, unknown>;
  }): void;
  closeSheet(): void;
}

/** 插件调试日志的等级；仅用于开发诊断，不应承载业务数据或密钥。 */
export type PluginDebugLevel = 'debug' | 'info' | 'warn' | 'error';
/** 一条可由 Electron 主进程或测试宿主消费的结构化调试记录。 */
export type PluginDebugEntry = {
  pluginId: string;
  level: PluginDebugLevel;
  message: string;
  data?: unknown;
  timestamp: string;
};
/**
 * 宿主提供的最小调试能力。
 * Electron 中会转发到主进程日志；内存调试宿主会记录到 events.logs。
 */
export interface PluginDebugApi {
  log(level: PluginDebugLevel, message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

/**
 * 插件间扩展注册表。扩展对象只存在于当前渲染器进程，不能用来交换密钥或跨进程数据。
 * 提供者应在 load 中 registerExtension，并在 unload 时由宿主自动撤销。
 */
export interface PluginExtensionsApi {
  /**
   * 注册
   * @param extension
   */
  registerExtension<T extends object>(extension: T): Disposable;
  getExtension<T extends object>(pluginId: string): T | undefined;
}

/** AI 的可诊断错误码；插件应按 code 分支处理，不依赖服务商的英文错误文本。 */
export type AiErrorCode =
  | 'NOT_CONFIGURED'
  | 'DISABLED'
  | 'FORBIDDEN'
  | 'INVALID_REQUEST'
  | 'AUTH'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'NETWORK'
  | 'PROVIDER'
  | 'INVALID_RESPONSE'
  | 'STORAGE'
  | 'UNAVAILABLE'
  | 'BUSY';
export type AiError = { code: AiErrorCode; message: string; retryable: boolean; status?: number };
/** 使用普通可序列化对象跨 IPC 返回错误，避免 Electron 丢失自定义 Error 的属性。 */
export type AiResult<T> = { ok: true; value: T } | { ok: false; error: AiError };
/** OpenAI-compatible function declaration, kept serializable for the IPC boundary. */
export type AiToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};
/** A renderer-side implementation for a tool declared to the AI provider. */
export type AiToolRegistration = AiToolDefinition & {
  invoke(args: Record<string, unknown>): Promise<unknown> | unknown;
};
export type AiToolCall = { id: string; name: string; args: Record<string, unknown> };
export type AiMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: AiToolCall[];
};
export type AiGenerationOptions = {
  /** 单次调用覆盖插件默认提示词；不自动读取页面、文件或其他插件的内容。 */
  systemPrompt?: string;
  /** 省略时使用宿主统一配置的模型；插件可为特殊任务指定兼容的模型。 */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** JSON 输出仍需要在提示词中明确要求 JSON，且服务商必须支持该参数。 */
  responseFormat?: 'text' | 'json_object';
  /** DeepSeek 的思考开关；兼容服务不发送这一扩展参数。默认关闭。 */
  thinking?: boolean;
};
export type AiChatRequest = AiGenerationOptions & {
  messages: AiMessage[];
  /** Tools are declarations only. Their implementation remains in the renderer/plugin. */
  tools?: AiToolDefinition[];
  /** 可选的请求 ID，用于 cancel；同一个调用方的并行请求必须使用不同 ID。 */
  requestId?: string;
};
export type AiCompletion = {
  requestId: string;
  content: string;
  model: string;
  finishReason: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  toolCalls?: AiToolCall[];
};
export type AiStatus = {
  enabled: boolean;
  /** 配置字段完整且密钥可读取，只表示具备调用条件，不代表服务商已验证通过。 */
  configured: boolean;
  hasApiKey: boolean;
  provider: 'deepseek' | 'compatible';
  baseUrl: string;
  model: string;
  timeoutMs: number;
  /** 修改配置后自动回到 untested，旧请求结果不会覆盖新配置的连接状态。 */
  connection: 'untested' | 'ok' | 'error';
  checkedAt?: string;
  lastError?: AiError;
};

/**
 * 插件 AI 能力：统一配置由宿主管理，接口不会返回 API Key。
 * 使用前在 capabilities 声明 ai: true；未声明或已禁用的插件调用会返回 FORBIDDEN。
 * test 会向已配置服务发送极短的测试消息，可能产生少量 token 费用。
 */
export interface PluginAiApi {
  getStatus(): Promise<AiResult<AiStatus>>;
  test(requestId?: string): Promise<AiResult<AiCompletion>>;
  chat(request: AiChatRequest): Promise<AiResult<AiCompletion>>;
  /** Registers a tool and disposes it automatically when the plugin unloads. */
  registerTool(tool: AiToolRegistration): Disposable;
  cancel(requestId: string): Promise<boolean>;
  onDidChange(listener: (status: AiStatus) => void): Disposable;
}

/** 注入工具页和 Widget 的受控插件能力。 */
export interface PluginComponentApi {
  host: ToolHostApi;
  ai: PluginAiApi;
  settings: PluginSettingsApi;
  storage: PluginStorageApi;
  data: PluginDataApi;
  services: PluginServicesApi;
  ui: PluginUiApi;
  debug: PluginDebugApi;
  extensions: PluginExtensionsApi;
}

/** Vue provide/inject 使用的稳定键。 */
export const PLUGIN_COMPONENT_API_KEY: 'wttch-hub:plugin-api';

/** 插件激活回调收到的上下文，后续可继续扩展宿主能力。 */
export interface PluginActivationContext {
  host: ToolHostApi;
  ai: PluginAiApi;
  path: string;
  reason: PluginActivationReason;
  /** push 进来的资源会在插件卸载时按逆序自动 dispose。 */
  subscriptions: Disposable[];
  settings: PluginSettingsApi;
  storage: PluginStorageApi;
  data: PluginDataApi;
  services: PluginServicesApi;
  ui: PluginUiApi;
  debug: PluginDebugApi;
  extensions: PluginExtensionsApi;
}

export type PluginLifecycleContext = Omit<PluginActivationContext, 'reason'> & {
  reason: PluginActivationReason | PluginDeactivationReason;
};

export interface PluginManifest {
  /** 必须与宿主支持的 PLUGIN_API_VERSION 匹配。 */
  apiVersion: number;
  /** 全局唯一 ID，同时也是 src/plugins 下的目录名。 */
  id: string;
  /** 用于显示、升级和插件包标识的版本号。 */
  version: string;
  /** 插件管理页面显示的名称。 */
  name: string;
  /** 插件包内的入口文件，相对于包根目录。 */
  entry: string;
  /** 插件声明需要的宿主能力，不能在插件中绕过声明直接访问主进程。 */
  capabilities?: string[];
}

/**
 * 插件源码中的 TypeScript 包定义。
 * package.ts 使用这个类型，打包或安装时再生成可传输的 JSON 快照。
 */
export type PluginPackageDefinition = PluginManifest;

/** 一次分发多个插件时使用的集合包定义。 */
export interface PluginBundleDefinition {
  apiVersion: number;
  id: string;
  version: string;
  name: string;
  plugins: PluginPackageDefinition[];
}

/** 类型安全的包定义工厂；运行时只返回原对象，不引入额外框架。 */
/** 类型安全的清单定义函数；运行时只原样返回传入对象。 */
export function definePluginPackage(definition: PluginPackageDefinition): PluginPackageDefinition;

/** ZIP 被宿主识别后展示给插件管理页面的数据。 */
export interface PluginPackageInfo extends PluginManifest {
  file: string;
  removable?: boolean;
  source?: 'managed' | 'sandbox' | 'workspace';
}

export interface PluginInstallResult {
  installed: PluginPackageInfo[];
  cancelled?: boolean;
}

/**
 * 插件提供给侧栏的默认菜单配置，用户可在设置页覆盖名称、可见性和顺序。
 * 这里只声明展示偏好，菜单始终复用插件原有路由和图标，不创建第二套页面。
 */
export interface PluginNavigationOptions {
  /** 默认菜单名称；省略时使用插件 name，用户重命名不会修改插件本身的名称。 */
  label?: string;
  /** 是否默认显示；false 仍允许用户在设置中开启，省略时为 true。 */
  defaultVisible?: boolean;
  /** 默认排序权重，较小者在前；未填写时按插件注册顺序排在指定权重的项目之后。 */
  order?: number;
}

export interface ToolPlugin {
  /** 插件实现的 API 版本。 */
  apiVersion: typeof PLUGIN_API_VERSION;
  id: string;
  path: string;
  name: string;
  icon: Component;
  desc: string;
  tags: string[];
  tint: [string, string];
  flow?: boolean;
  /**
   * 是否允许在主导航显示：true 使用默认菜单配置，对象可指定默认名称和顺序。
   * false 或省略表示不提供导航入口，设置页也不展示该插件的菜单编辑项。
   * 此字段只影响导航入口，不影响工具库、路由、Widget 和插件启用状态。
   */
  navigation?: boolean | PluginNavigationOptions;
  /** 插件级 AI 默认参数；只对该插件生效，单次 chat 参数优先，不修改宿主统一配置。 */
  ai?: AiGenerationOptions;
  /** 服务 ID 在插件内唯一；宿主以 pluginId/serviceId 作为订阅主题。 */
  services?: Array<{ id: string; name: string; description?: string }>;
  component: ComponentLoader;
  events?: {
    /** 首次启用时调用一次，适合注册命令、监听器和全局资源。 */
    load?: (context: PluginLifecycleContext) => MaybePromise<void | PluginCleanup>;
    /** 首个页面或 Widget 使用插件时调用。 */
    activate?: (context: PluginActivationContext) => MaybePromise<void | PluginCleanup>;
    /** 最后一个使用者离开后调用。 */
    deactivate?: (context: PluginLifecycleContext) => MaybePromise<void>;
    /** 禁用、卸载或宿主退出前调用。 */
    unload?: (context: PluginLifecycleContext) => MaybePromise<void>;
    /** 设置字段发生变化后调用。 */
    settingsChanged?: (
      context: PluginLifecycleContext,
      key: string,
      value: boolean | number | string,
    ) => MaybePromise<void>;
  };
  capabilities?: {
    services?: boolean;
    ai?: boolean;
    systemStats?: boolean;
    notifications?: boolean;
    floatingWidget?: boolean;
    toast?: boolean;
    sheet?: boolean;
  };
  statusbar?: {
    label: string;
    color?: string;
  };
  settings?: {
    /** 设置页中的插件配置说明。 */
    description?: string;
    /** 由宿主渲染和持久化的简单配置字段。 */
    fields?: Array<{
      key: string;
      label: string;
      description?: string;
      type: 'boolean' | 'number' | 'text' | 'color' | 'select';
      defaultValue: boolean | number | string;
      min?: number;
      max?: number;
      step?: number;
      options?: Array<{ label: string; value: string | number }>;
    }>;
  };
  widget?: {
    component: ComponentLoader;
    defaultWidth: number;
    defaultHeight: number;
    minWidth?: number;
    minHeight?: number;
    refreshIntervalMs: number;
  };
  floatingWidget?: {
    component: ComponentLoader;
    defaultWidth: number;
    defaultHeight: number;
    minWidth?: number;
    minHeight?: number;
  };
}

/** 类型安全的工具定义函数；运行时只原样返回传入对象。 */
export function defineToolPlugin(plugin: ToolPlugin): ToolPlugin;
