/**
 * 文件说明：配置 Electron 主进程的 Vite 构建，保留可读输出和源映射以支持调试。
 */

import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    // Keep output readable and emit source maps so the VS Code debugger
    // can map the bundled main process code back to the TypeScript sources.
    sourcemap: true,
    minify: false,
  },
});
