/** 文件说明：提供最小运行时插件模板，演示插件入口应如何使用公开 API 声明页面和设置。 */

import { Puzzle } from 'lucide-vue-next';
import { defineToolPlugin } from '@wttch-hub/plugin-api';

export default defineToolPlugin({
  apiVersion: 1,
  id: 'hello-plugin',
  path: 'hello-plugin',
  name: '示例插件',
  icon: Puzzle,
  desc: '复制此目录后，修改插件标识和页面入口即可开始开发。',
  tags: ['示例'],
  tint: ['#0a84ff', 'rgba(10, 132, 255, 0.12)'],
  component: () => import('./views/HelloPluginView.vue'),
  navigation: true,
  capabilities: { toast: true },
  settings: { fields: [{ key: 'greeting', label: '问候语', type: 'text', defaultValue: '你好' }] },
});
