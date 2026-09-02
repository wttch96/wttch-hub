// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

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

export type WindowControlsApi = typeof windowControls;

contextBridge.exposeInMainWorld('windowControls', windowControls);

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
