/**
 * 文件说明：定义主页、设置、插件、工具和浮动 Widget 的路由，配置页面元信息及工具访问规则。
 */

import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import ToolsArea from './views/ToolsArea.vue';
import ToolsView from './views/ToolsView.vue';
import SettingsView from './views/SettingsView.vue';
import OverlayDemoView from './views/OverlayDemoView.vue';
import PluginsView from './views/PluginsView.vue';
import PluginSettingsView from './views/PluginSettingsView.vue';
import { allTools } from './config/tools';
import { pluginRuntime } from './plugins/runtime';
import PluginToolHost from './components/PluginToolHost.vue';
import PluginFloatingWidgetHost from './components/PluginFloatingWidgetHost.vue';

// 工具库与插件导航共用 /tools 下的子路由；导航重命名不会改变路由或插件 ID。
// hash 路由兼容开发服务器与打包后的 file:// 加载方式。
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
    {
      path: '/plugins/:pluginId/settings',
      name: 'plugin-settings',
      component: PluginSettingsView,
      props: true,
      meta: { pluginSettings: true },
    },
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
