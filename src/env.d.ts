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
  minimize(): void;
  toggleMaximize(): void;
  close(): void;
  /** Subscribe to real maximize-state changes; returns an unsubscribe fn. */
  onMaximizedChange(callback: (maximized: boolean) => void): () => void;
  /** Open or close the Chrome DevTools (detached) for this window. */
  toggleDevTools(): void;
}

interface SystemStats {
  cpu: number;
  memory: number;
  readBytes: number;
  writeBytes: number;
  downloadBytes: number;
  uploadBytes: number;
}

/** Result of the folderart icon-font search bridge (see src/preload.ts). */
interface IconfontSearchResponse {
  status: number;
  text: string;
  error?: string;
}

interface Window {
  /** Present when the page runs inside Electron (see src/preload.ts). */
  windowControls?: WindowControlsApi;
  systemMonitor?: { stats(): Promise<SystemStats> };

  /** Present inside Electron: forwards folderart's icon-font search to main. */
  iconFontSearch?: (body: string) => Promise<IconfontSearchResponse>;
}
