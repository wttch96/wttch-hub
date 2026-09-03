import { Cpu } from 'lucide-vue-next';
import { defineToolPlugin } from '../../types/plugin';

export default defineToolPlugin({
  apiVersion: 1,
  id: 'system-monitor',
  path: 'system-monitor',
  name: '系统监控',
  icon: Cpu,
  desc: '实时查看 CPU、显卡、内存和磁盘 IO，快速掌握当前机器状态。',
  tags: ['CPU', 'GPU', '内存', 'IO'],
  tint: ['#ff375f', 'rgba(255, 55, 95, 0.12)'],
  component: () => import('./components/SystemMonitor.vue'),
  capabilities: { toast: true, sheet: true },
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
