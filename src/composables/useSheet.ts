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
