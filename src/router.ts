import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import ToolsArea from './views/ToolsArea.vue';
import ToolsView from './views/ToolsView.vue';
import SettingsView from './views/SettingsView.vue';
import type { Component } from 'vue';

// The imported wttch-labs tools are embedded as nested routes under /tools:
// /tools is the tool-library page, each tool opens on its own child route so the
// sidebar keeps its three top-level entries (主页 / 小工具 / 设置).
const tool = (
  path: string,
  name: string,
  title: string,
  loader: () => Promise<{ default: Component }>,
  flow = false,
) => ({
  path,
  name,
  meta: { tool: true, title, flow },
  component: loader,
});

// `createWebHashHistory` is used so routing keeps working when the packaged
// app is loaded from the filesystem (file://) instead of a dev server.
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', name: 'home', component: HomeView },
    {
      // Nested tools host: /tools renders the library, /tools/<tool> renders the
      // tool itself inside a slim "tool area" with a way back to the library.
      path: '/tools',
      component: ToolsArea,
      children: [
        { path: '', name: 'tools', component: ToolsView },
        tool(
          'folderart',
          'tool-folderart',
          '图标生成器',
          () => import('./tools/folderart/index.vue'),
        ),
        tool(
          'packetdraw',
          'tool-packetdraw',
          '协议绘制器',
          () => import('./tools/packetdraw/index.vue'),
          true, // whole-page scroll
        ),
        tool(
          'radixconv',
          'tool-radixconv',
          '进制转换器',
          () => import('./tools/radixconv/index.vue'),
          true, // whole-page scroll, not a fixed paned editor
        ),
        tool(
          'bitparser',
          'tool-bitparser',
          '位段解析器',
          () => import('./tools/bitparser/index.vue'),
          true, // whole-page scroll
        ),
      ],
    },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
});
