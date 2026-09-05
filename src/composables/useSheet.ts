/**
 * 文件说明：维护全局 Sheet 的打开状态、标题、内容组件和参数，为宿主及插件提供面板操作。
 */

import { readonly, ref, type Component } from 'vue';

export type SheetOptions = {
  title?: string;
  component?: Component;
  props?: Record<string, unknown>;
};

const state = ref<SheetOptions | null>(null);

export const useSheet = () => ({
  sheet: readonly(state),
  open: (options: SheetOptions) => { state.value = options; },
  close: () => { state.value = null; },
});
