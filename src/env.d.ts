/**
 * 文件说明：声明 Vue 单文件组件和 Window 上的预加载桥接类型，供渲染进程进行 TypeScript 类型检查。
 */

/// <reference types="vite/client" />

// Keep this file a plain script (no top-level import/export) so the ambient
// `declare module '*.vue'` below stays globally active.

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}

/** Shape of the window-controls bridge exposed by src/preload.ts. */
interface WindowControlsApi {
  /** Host platform, so the page can decide whether to draw custom chrome. */
  platform: string;
  /** Whether Chromium runs with hardware acceleration disabled. */
  softwareRendering: boolean;
  minimize(): void;
  toggleMaximize(): void;
  close(): void;
  /** Subscribe to real maximize-state changes; returns an unsubscribe fn. */
  onMaximizedChange(callback: (maximized: boolean) => void): () => void;
  /** Open or close the Chrome DevTools (detached) for this window. */
  toggleDevTools(): void;
}

/** Result of the folderart icon-font search bridge (see src/preload.ts). */
interface IconfontSearchResponse {
  status: number;
  text: string;
  error?: string;
}

interface Window {
  serviceHost?: import('./services/contracts').ServiceBridge;
  wechatHost?: import('./services/contracts').WechatBridge;
  desktopHost?: import('./data/contracts').DesktopBridge;
  /** 统一 AI 服务桥，浏览器预览时不存在。 */
  aiHost?: import('./ai/contracts').AiBridge;
  /** Present when the page runs inside Electron (see src/preload.ts). */
  windowControls?: WindowControlsApi;
  toolHost?: {
    systemStats(): Promise<import('./types/plugin').SystemStats>;
    showNotification(options: import('./types/plugin').PluginNotification): Promise<boolean>;
    openFloatingWidget(pluginId: string, options?: import('./types/plugin').FloatingWidgetWindowOptions): Promise<boolean>;
    updateFloatingWidget(pluginId: string, options: import('./types/plugin').FloatingWidgetWindowOptions): Promise<boolean>;
    closeFloatingWidget(pluginId: string): Promise<boolean>;
    pluginPackages(): Promise<import('./types/plugin').PluginPackageInfo[]>;
    installPluginPackage(): Promise<import('./types/plugin').PluginInstallResult>;
    removePluginPackage(file: string): Promise<import('./types/plugin').PluginPackageInfo[]>;
  };
  /** Electron 中的插件开发日志桥；仅由 @wttch-hub/plugin-debug 消费。 */
  pluginDebugHost?: {
    log(entry: import('@wttch-hub/plugin-api').PluginDebugEntry): void;
  };

  /** Present inside Electron: forwards folderart's icon-font search to main. */
  iconFontSearch?: (body: string) => Promise<IconfontSearchResponse>;
}
