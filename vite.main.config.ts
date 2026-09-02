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
