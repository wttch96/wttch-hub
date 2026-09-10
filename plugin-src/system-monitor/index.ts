/**
 * 文件说明：声明系统监控插件的页面入口、能力、生命周期及设置，将插件实现接入工作台运行时。
 */

import { Cpu } from 'lucide-vue-next';
import { defineToolPlugin } from '@wttch-hub/plugin-api';
import { z } from 'zod';
import type { AiToolRegistration } from '@wttch-hub/plugin-api';

export default defineToolPlugin({
  apiVersion: 1,
  id: 'system-monitor',
  path: 'system-monitor',
  navigation: { defaultVisible: false, order: 30 },
  name: '系统监控',
  icon: Cpu,
  desc: '实时查看 CPU、显卡、内存和磁盘 IO，快速掌握当前机器状态。',
  tags: ['CPU', 'GPU', '内存', 'IO'],
  tint: ['#ff375f', 'rgba(255, 55, 95, 0.12)'],
  component: () => import('./components/SystemMonitor.vue'),
  capabilities: { systemStats: true, toast: true, sheet: true, ai: true },
  events: {
    load(context) {
      // VS Code 风格：放入 subscriptions 的资源由宿主在卸载时统一释放。
      context.subscriptions.push(
        context.settings.onDidChange((key, value) => {
          if (key === 'refreshIntervalMs')
            context.ui.showToast(`系统监控刷新间隔已更新为 ${value} ms`, 'success');
        }),
      );
      // 工具在激活上下文中声明，直接使用受控 host API，而非依赖浏览器全局对象。
      const systemMonitorTool: AiToolRegistration = {
        name: 'system_monitor',
        description: '实时查看 CPU、显卡、内存和磁盘 IO，快速掌握当前机器状态。',
        schema: z.object({}),
        invoke: () => context.host.systemStats(),
      };
      context.ai.registerTool(systemMonitorTool);
    },
    activate() {
      // 页面和 Widget 共用引用计数；第一个消费者出现时激活，最后一个离开时清理。
      return {
        dispose() {
          /* 组件自身会释放采样定时器。 */
        },
      };
    },
    deactivate() {
      /* 可在这里暂停插件级后台任务。 */
    },
    unload() {
      /* subscriptions 将在此回调后由宿主自动释放。 */
    },
    settingsChanged() {
      /* 复杂插件可在这里重建服务；示例组件通过 props 获取间隔。 */
    },
  },
  statusbar: { label: '系统监控', color: '#ff375f' },
  settings: {
    description: '控制系统监控的启用状态和刷新频率。',
    fields: [
      { key: 'refreshIntervalMs', label: '刷新间隔（毫秒）', type: 'number', defaultValue: 2000 },
    ],
  },
  widget: {
    component: () => import('./components/CpuGpuWidget.vue'),
    defaultWidth: 3,
    defaultHeight: 2,
    minWidth: 3,
    minHeight: 2,
    refreshIntervalMs: 2000,
  },
});
