import { readonly, ref } from 'vue';

export type ToastKind = 'info' | 'success' | 'error';
export type ToastItem = {
  id: number;
  message: string;
  kind: ToastKind;
  duration: number;
};

const items = ref<ToastItem[]>([]);
let nextId = 1;

const remove = (id: number) => {
  items.value = items.value.filter((item) => item.id !== id);
};

const show = (message: string, kind: ToastKind = 'info', duration = 2800) => {
  const id = nextId++;
  items.value.push({ id, message, kind, duration });
  if (duration > 0) window.setTimeout(() => remove(id), duration);
  return id;
};

export const useToast = () => ({
  toasts: readonly(items),
  show,
  info: (message: string, duration?: number) => show(message, 'info', duration),
  success: (message: string, duration?: number) => show(message, 'success', duration),
  error: (message: string, duration?: number) => show(message, 'error', duration),
  dismiss: remove,
});
