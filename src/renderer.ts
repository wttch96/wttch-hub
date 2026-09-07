/**
 * 文件说明：Vue 渲染进程入口，在插件加载前完成待恢复数据的应用，再加载路由、全局样式并挂载工作台。
 */

import { createApp } from 'vue';
import { restoreEntries, validateBackup } from './data/backup';
// Global stylesheet shared by the imported wttch-labs tools (tokens, panels,
// form fields, ...). It must load BEFORE the hub's own index.css so the hub
// styles keep the final say on element resets, body transparency (rounded
// window) and the shared --accent/--text tokens.
import './config/labs-styles.css';
import './index.css';

// Apply this before mounting Vue, so software-rendered systems never paint a
// costly glass/animation frame first.
if (window.windowControls?.softwareRendering) {
  document.documentElement.classList.add('software-rendering');
}

// 必须在动态加载插件 runtime 之前恢复数据，否则模块初始化会先读到旧快照。
async function bootstrap() {
  if (window.desktopHost && !location.hash.startsWith('#/floating/')) {
    const pending = await window.desktopHost.pendingRestore();
    if (pending) {
      restoreEntries(localStorage, validateBackup(pending).entries);
      await window.desktopHost.finishRestore();
    }
  }
  const [{ default: App }, { default: router }] = await Promise.all([import('./App.vue'), import('./router')]);
  createApp(App).use(router).mount('#app');
}
void bootstrap().catch(error => {
  // 恢复失败时不加载插件，保留待恢复文件供重试，避免旧插件继续改写业务数据。
  const root = document.getElementById('app');
  if (!root) return;
  root.textContent = `工作台启动失败：${error instanceof Error ? error.message : String(error)}。待恢复数据已保留。`;
  const retry = document.createElement('button');
  retry.textContent = '重试';
  retry.onclick = () => location.reload();
  root.append(retry);
});
