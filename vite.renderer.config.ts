/**
 * 文件说明：配置 Vue 渲染进程的 Vite 插件和源码路径别名，供工具页面与工作台界面构建使用。
 */

import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Imported tools (wttch-labs) reference their shared code as '@/...'.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 插件公开 API 在当前单仓库阶段直接指向唯一源；未来拆包时仅替换此映射。
      '@wttch-hub/plugin-api': fileURLToPath(new URL('./src/types/plugin.ts', import.meta.url)),
    },
  },
});
