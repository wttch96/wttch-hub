<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next';
import { useSheet } from '../composables/useSheet';
import { useToast } from '../composables/useToast';

defineProps<{ source?: string }>();
const toast = useToast();
const sheet = useSheet();
</script>

<template>
  <div class="sheet-example">
    <Sparkles :size="24" />
    <h3>这是一个可组合的 Sheet</h3>
    <p>插件可以把任意 Vue 组件传入 Sheet，并在其中继续调用 Toast 或关闭当前面板。</p>
    <div class="actions">
      <button type="button" @click="toast.success('Sheet 内的操作完成了')">发送 Toast</button>
      <button type="button" class="secondary" @click="sheet.close">关闭 Sheet</button>
    </div>
  </div>
</template>

<style scoped>
.sheet-example > svg { color: var(--accent); }
h3 { margin: 14px 0 6px; font-size: 18px; }
p { max-width: 520px; margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.6; }
.actions { display: flex; gap: 8px; margin-top: 22px; }
button { padding: 8px 12px; border: 1px solid var(--accent); border-radius: 7px; background: var(--accent); color: #fff; cursor: pointer; }
button.secondary { border-color: var(--hairline); background: transparent; color: var(--text); }
</style>
