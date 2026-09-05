/**
 * 文件说明：登记内置工具并发现可编译插件，统一提供工具清单与查询入口，供路由、导航和运行时使用。
 */

import {
  Binary,
  Braces,
  FolderOpen,
  Network,
} from 'lucide-vue-next';
import type { ToolPlugin } from '../types/plugin';

const builtinTools: ToolPlugin[] = [
  {
    apiVersion: 1,
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
    apiVersion: 1,
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
    apiVersion: 1,
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
    apiVersion: 1,
    id: 'bitparser',
    path: 'bitparser',
    name: '16 进制数值解析',
    icon: Braces,
    desc: '把完整十六进制数值解释为整数、补码或标准 IEEE 754 float / double，并展示计算过程。',
    tags: ['HEX', 'IEEE 754'],
    tint: ['#ff9f0a', 'rgba(255, 159, 10, 0.13)'],
    flow: true,
    component: () => import('../tools/bitparser/index.vue'),
  },
];

// Plugin entry points are discovered at build time. Their page and widget
// components remain lazy, so adding a directory under /plugins is enough to
// make a plugin available to routes and the home widget library.
const externalPlugins = import.meta.glob('../plugins/*/index.ts', {
  eager: true,
  import: 'default',
}) as Record<string, ToolPlugin>;

export const allTools: ToolPlugin[] = [
  ...builtinTools,
  ...Object.values(externalPlugins),
];

/** @deprecated Prefer pluginRuntime.enabledTools in UI code. */
export const tools = allTools;
export const widgetPlugins = allTools.filter((tool) => tool.widget);

export const findTool = (id: string) => allTools.find((tool) => tool.id === id);
