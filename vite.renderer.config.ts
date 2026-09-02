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
    },
  },
});
