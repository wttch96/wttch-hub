/**
 * 文件说明：配置 Vue 渲染进程的 Vite 插件和源码路径别名，供工具页面与工作台界面构建使用。
 */

import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [vue()],
  // Electron Forge injects this server's URL into the main-process bundle.
  // Falling back to another port can leave Electron pointing at the previous
  // URL, so fail explicitly instead of opening an invisible window.
  server: {
    // Electron resolves localhost to IPv4 on some Windows installations,
    // while Vite otherwise binds only to the IPv6 ::1 loopback interface.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      // Imported tools (wttch-labs) reference their shared code as '@/...'.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
