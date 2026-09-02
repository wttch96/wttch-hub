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
};

export type WindowControlsApi = typeof windowControls;

contextBridge.exposeInMainWorld('windowControls', windowControls);
