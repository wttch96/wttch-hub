/** AI 模块在渲染进程中依赖的最小预加载桥接声明。 */

import type { AiBridge } from './contracts';

declare global {
  interface Window {
    aiHost?: AiBridge;
  }
}

export {};
