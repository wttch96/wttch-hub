import type { Component } from 'vue';

/**
 * 插件 API 的协议版本。
 *
 * 这是插件和宿主之间最重要的兼容性标记。新增字段时通常保持向后
 * 兼容；如果以后出现无法兼容的结构变化，应提升这个版本，并由宿主
 * 在加载插件前拒绝不认识的版本。
 */
export const PLUGIN_API_VERSION = 1;

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

export interface ToolHostApi {
  /** 请求一次最新系统统计数据。 */
  systemStats(): Promise<SystemStats>;
}

/** 插件路由离开时由宿主调用，用于移除事件监听器和定时器。 */
export type PluginCleanup = () => void;

/** 插件激活回调收到的上下文，后续可继续扩展宿主能力。 */
export interface PluginActivationContext {
  host: ToolHostApi;
  path: string;
}

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
export const definePluginPackage = (definition: PluginPackageDefinition): PluginPackageDefinition => definition;

/** ZIP 被宿主识别后展示给插件管理页面的数据。 */
export interface PluginPackageInfo extends PluginManifest {
  file: string;
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
  component: ComponentLoader;
  events?: {
    /** 路由激活时调用；返回的清理函数会在离开插件时执行。 */
    activate?: (context: PluginActivationContext) => void | PluginCleanup;
  };
  capabilities?: {
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
      type: 'boolean' | 'number' | 'text';
      defaultValue: boolean | number | string;
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
}

export const defineToolPlugin = (plugin: ToolPlugin): ToolPlugin => plugin;
