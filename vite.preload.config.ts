/**
 * 文件说明：配置 Electron 预加载脚本的 Vite 构建，保留可读输出和源映射以支持调试。
 */

import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@module/ai': fileURLToPath(new URL('./src/module/ai/index.ts', import.meta.url)),
    },
  },
  build: {
    // Keep output readable and emit source maps so the VS Code debugger
    // can map the bundled preload code back to the TypeScript sources.
    sourcemap: true,
    minify: false,
  },
});
