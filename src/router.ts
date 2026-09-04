import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import ToolsArea from './views/ToolsArea.vue';
import ToolsView from './views/ToolsView.vue';
import SettingsView from './views/SettingsView.vue';
import OverlayDemoView from './views/OverlayDemoView.vue';
import PluginsView from './views/PluginsView.vue';
import { allTools } from './config/tools';
import { pluginRuntime } from './plugins/runtime';
import PluginToolHost from './components/PluginToolHost.vue';
import PluginFloatingWidgetHost from './components/PluginFloatingWidgetHost.vue';

// The imported wttch-labs tools are embedded as nested routes under /tools:
// /tools is the tool-library page, each tool opens on its own child route so the
// sidebar keeps its three top-level entries (主页 / 小工具 / 设置).
// `createWebHashHistory` is used so routing keeps working when the packaged
// app is loaded from the filesystem (file://) instead of a dev server.
const router = createRouter({
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
        ...allTools.map((plugin) => ({
          path: plugin.path,
          name: `tool-${plugin.id}`,
          meta: {
            tool: true,
            title: plugin.name,
            flow: plugin.flow ?? false,
            statusbar: plugin.statusbar,
            pluginId: plugin.id,
          },
          component: PluginToolHost,
          props: { pluginId: plugin.id },
        })),
      ],
    },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/plugins', name: 'plugins', component: PluginsView },
    { path: '/examples/overlays', name: 'overlay-demo', component: OverlayDemoView },
    {
      path: '/floating/:pluginId',
      name: 'floating-widget',
      component: PluginFloatingWidgetHost,
      props: true,
      meta: { floating: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
});

router.beforeEach((to) => {
  const id = to.meta?.pluginId as string | undefined;
  if (id && !pluginRuntime.states[id]?.enabled) return { name: 'plugins', query: { disabled: id } };
  return true;
});

export default router;
