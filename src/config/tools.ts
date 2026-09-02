import { defineAsyncComponent, type Component } from 'vue';
import {
  Binary,
  Braces,
  Cpu,
  FolderOpen,
  Network,
} from 'lucide-vue-next';

export interface ToolPlugin {
  id: string;
  path: string;
  name: string;
  icon: Component;
  desc: string;
  tags: string[];
  tint: [string, string];
  flow?: boolean;
  component: () => Promise<{ default: Component }>;
  capabilities?: {
    toast?: boolean;
    sheet?: boolean;
  };
  widget?: {
    component: () => Promise<{ default: Component }>;
    defaultWidth: number;
    defaultHeight: number;
    minWidth?: number;
    minHeight?: number;
    refreshIntervalMs: number;
  };
}

export const tools: ToolPlugin[] = [
  {
    id: 'folderart',
    path: 'folderart',
    name: '图标生成器',
    icon: FolderOpen,
    desc: '把一张图片变成 macOS / Windows 风格的文件夹图标，支持多套模板样式与 PNG 导出。',
    tags: ['图标', 'PNG'],
    tint: ['#0a84ff', 'rgba(10, 132, 255, 0.12)'],
    component: () => import('../tools/folderart/index.vue'),
  },
  {
    id: 'packetdraw',
    path: 'packetdraw',
    name: '协议绘制器',
    icon: Network,
    desc: '用简单文本描述一次网络交互，渲染成协议 / 时序图，方便写文档和做演示。',
    tags: ['时序', '文本转图'],
    tint: ['#bf5af2', 'rgba(191, 90, 242, 0.12)'],
    flow: true,
    component: () => import('../tools/packetdraw/index.vue'),
  },
  {
    id: 'radixconv',
    path: 'radixconv',
    name: '进制转换器',
    icon: Binary,
    desc: '在二进制 / 八进制 / 十进制 / 十六进制之间互转，支持大数与位运算解释。',
    tags: ['进制', '位运算'],
    tint: ['#34c759', 'rgba(52, 199, 89, 0.12)'],
    flow: true,
    component: () => import('../tools/radixconv/index.vue'),
  },
  {
    id: 'bitparser',
    path: 'bitparser',
    name: '位段解析器',
    icon: Braces,
    desc: '按字段宽度定义位段布局，把二进制报文逐位解析成可读的字段清单。',
    tags: ['位段', '报文'],
    tint: ['#ff9f0a', 'rgba(255, 159, 10, 0.13)'],
    flow: true,
    component: () => import('../tools/bitparser/index.vue'),
  },
  {
    id: 'system-monitor',
    path: 'system-monitor',
    name: '系统监控',
    icon: Cpu,
    desc: '实时查看 CPU、内存和磁盘 IO，快速掌握当前机器状态。',
    tags: ['CPU', '内存', 'IO'],
    tint: ['#ff375f', 'rgba(255, 55, 95, 0.12)'],
    component: () => import('../tools/system-monitor/index.vue'),
    capabilities: { toast: true, sheet: true },
    widget: {
      component: defineAsyncComponent(() => import('../tools/system-monitor/index.vue')),
      defaultWidth: 6,
      defaultHeight: 2,
      minWidth: 3,
      minHeight: 2,
      refreshIntervalMs: 2000,
    },
  },
  {
    id: 'cpu-usage',
    path: 'cpu-usage',
    name: 'CPU 使用率',
    icon: Cpu,
    desc: '在主页显示实时 CPU 使用率。',
    tags: ['CPU', 'Widget'],
    tint: ['#ff375f', 'rgba(255, 55, 95, 0.12)'],
    component: () => import('../tools/system-monitor/CpuUsageWidget.vue'),
    capabilities: { toast: true, sheet: true },
    widget: {
      component: defineAsyncComponent(() => import('../tools/system-monitor/CpuUsageWidget.vue')),
      defaultWidth: 3,
      defaultHeight: 2,
      minWidth: 3,
      minHeight: 2,
      refreshIntervalMs: 2000,
    },
  },
];

export const widgetPlugins = tools.filter((tool) => tool.widget);

export const findTool = (id: string) => tools.find((tool) => tool.id === id);
