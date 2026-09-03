import type { Component } from 'vue';

export const PLUGIN_API_VERSION = 1;

export type ComponentLoader = () => Promise<{ default: Component }>;

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
  systemStats(): Promise<SystemStats>;
}

export type PluginCleanup = () => void;

export interface PluginActivationContext {
  host: ToolHostApi;
  path: string;
}

export interface PluginManifest {
  apiVersion: number;
  id: string;
  version: string;
  name: string;
  entry: string;
  capabilities?: string[];
}

/** 插件源码中的 TypeScript 包定义，打包时会被序列化为 package.json。 */
export type PluginPackageDefinition = PluginManifest;

export const definePluginPackage = (definition: PluginPackageDefinition): PluginPackageDefinition => definition;

export interface PluginPackageInfo extends PluginManifest {
  file: string;
}

export interface ToolPlugin {
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
    /** Called when the plugin route becomes active. Return a cleanup callback. */
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
    description?: string;
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
