/**
 * 文件说明：Electron 预加载入口，通过 contextBridge 向页面暴露受控的窗口、插件、AI、数据管理和微信服务接口。
 */

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { AiBridge } from './ai/contracts';
import type { AiStatus } from './types/plugin';

// On Windows the renderer draws a full macOS-style title bar, so expose a
// small, explicit surface for driving the native window from the page.
const windowControls = {
  /** Host platform, so the page can decide whether to draw custom chrome. */
  platform: process.platform as NodeJS.Platform,

  minimize: () => ipcRenderer.send('win:minimize'),
  toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
  close: () => ipcRenderer.send('win:close'),

  /** Subscribe to real maximize-state changes; returns an unsubscribe fn. */
  onMaximizedChange: (callback: (maximized: boolean) => void) => {
    const listener = (_event: IpcRendererEvent, maximized: boolean) => {
      callback(maximized);
    };
    ipcRenderer.on('win:maximized-changed', listener);
    return () => {
      ipcRenderer.removeListener('win:maximized-changed', listener);
    };
  },

  /** Open or close the Chrome DevTools (detached) for this window. */
  toggleDevTools: () => ipcRenderer.send('win:toggle-devtools'),
};

const toolHost = {
  stats: () => ipcRenderer.invoke('system:stats'),
  showNotification: (options: import('./types/plugin').PluginNotification) => ipcRenderer.invoke('notifications:show', options),
  openFloatingWidget: (pluginId: string, options?: import('./types/plugin').FloatingWidgetWindowOptions) => ipcRenderer.invoke('floating-widget:open', pluginId, options),
  updateFloatingWidget: (pluginId: string, options: import('./types/plugin').FloatingWidgetWindowOptions) => ipcRenderer.invoke('floating-widget:update', pluginId, options),
  closeFloatingWidget: (pluginId: string) => ipcRenderer.invoke('floating-widget:close', pluginId),
};

export type WindowControlsApi = typeof windowControls;

contextBridge.exposeInMainWorld('windowControls', windowControls);
contextBridge.exposeInMainWorld('toolHost', {
  systemStats: toolHost.stats,
  showNotification: toolHost.showNotification,
  openFloatingWidget: toolHost.openFloatingWidget,
  updateFloatingWidget: toolHost.updateFloatingWidget,
  closeFloatingWidget: toolHost.closeFloatingWidget,
  pluginPackages: () => ipcRenderer.invoke('plugins:list'),
  installPluginPackage: () => ipcRenderer.invoke('plugins:install'),
  removePluginPackage: (file: string) => ipcRenderer.invoke('plugins:remove', file),
});

// folderart's online icon-font search needs a same-origin proxy to iconfont.cn
// (which sends no CORS headers). The main process forwards the POST over
// Electron's network stack, so it works both from the dev server and file://.
export type IconfontSearchResponse = {
  status: number;
  text: string;
  error?: string;
};

const iconFontSearch = (body: string): Promise<IconfontSearchResponse> =>
  ipcRenderer.invoke('iconfont:search', body);

contextBridge.exposeInMainWorld('iconFontSearch', iconFontSearch);

/** API Key 只允许经 configure 单向提交，不提供读取接口，也不放入 localStorage。 */
const aiHost: AiBridge = {
  getStatus: () => ipcRenderer.invoke('ai:status'),
  configure: (input) => ipcRenderer.invoke('ai:configure', input),
  chat: (owner, request) => ipcRenderer.invoke('ai:chat', owner, request),
  test: (owner, requestId) => ipcRenderer.invoke('ai:test', owner, requestId),
  cancel: (owner, requestId) => ipcRenderer.invoke('ai:cancel', owner, requestId),
  onDidChange(callback) {
    const listener = (_event: IpcRendererEvent, status: AiStatus) => callback(status);
    ipcRenderer.on('ai:status-changed', listener);
    return { dispose: () => ipcRenderer.removeListener('ai:status-changed', listener) };
  },
};
contextBridge.exposeInMainWorld('aiHost', aiHost);

/** 数据管理仅提供业务快照和固定目录入口，不暴露通用文件系统接口。 */
const desktopHost: import('./data/contracts').DesktopBridge = {
  info: () => ipcRenderer.invoke('desktop:info'),
  setCloseBehavior: value => ipcRenderer.invoke('desktop:close-behavior', value),
  openDirectory: () => ipcRenderer.invoke('desktop:open-directory'),
  exportBackup: entries => ipcRenderer.invoke('desktop:export', entries),
  importBackup: entries => ipcRenderer.invoke('desktop:import', entries),
  pendingRestore: () => ipcRenderer.invoke('desktop:pending'),
  finishRestore: () => ipcRenderer.invoke('desktop:finish'),
};
contextBridge.exposeInMainWorld('desktopHost', desktopHost);

const serviceHost: import('./services/contracts').ServiceBridge = {
  register: services => ipcRenderer.invoke('services:register', services),
  publish: (topic, output) => ipcRenderer.invoke('services:publish', topic, output),
  status: topic => ipcRenderer.invoke('services:status', topic),
};
const wechatHost: import('./services/contracts').WechatBridge = {
  status: () => ipcRenderer.invoke('wechat:status'),
  login: () => ipcRenderer.invoke('wechat:login'),
  verify: code => ipcRenderer.invoke('wechat:verify', code),
  cancelLogin: () => ipcRenderer.invoke('wechat:cancel-login'),
  logout: () => ipcRenderer.invoke('wechat:logout'),
  setEnabled: enabled => ipcRenderer.invoke('wechat:enabled', enabled),
  saveRules: rules => ipcRenderer.invoke('wechat:rules', rules),
  onDidChange(callback) {
    const listener = (_event: IpcRendererEvent, status: import('./services/contracts').WechatStatus) => callback(status);
    ipcRenderer.on('wechat:changed', listener);
    return { dispose: () => ipcRenderer.removeListener('wechat:changed', listener) };
  },
};
contextBridge.exposeInMainWorld('serviceHost', serviceHost);
contextBridge.exposeInMainWorld('wechatHost', wechatHost);
