<!--
  文件说明：渲染全局 Toast 消息列表，将共享提示状态展示为可关闭的临时反馈。
-->

<script setup lang="ts">
import { Check, CircleAlert, Info, X } from 'lucide-vue-next';
import { useToast } from '../composables/useToast';

const { toasts, dismiss } = useToast();
const icons = { info: Info, success: Check, error: CircleAlert };
</script>

<template>
  <div class="toast-host" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id" class="toast" :class="`is-${toast.kind}`">
        <component :is="icons[toast.kind]" :size="16" />
        <span>{{ toast.message }}</span>
        <button type="button" title="关闭通知" aria-label="关闭通知" @click="dismiss(toast.id)"><X :size="14" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host { position: fixed; z-index: 50; top: 58px; left: 50%; display: flex; flex-direction: column; align-items: center; gap: 8px; transform: translateX(-50%); pointer-events: none; }
.toast { display: flex; align-items: center; gap: 8px; min-width: 220px; max-width: 360px; padding: 10px 10px 10px 12px; border: 1px solid var(--hairline); border-radius: 9px; background: var(--card-bg); box-shadow: 0 8px 24px rgba(0, 0, 0, .13); color: var(--text); font-size: 13px; -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); pointer-events: auto; }
.toast svg { flex: 0 0 auto; color: var(--accent); }
.toast.is-success svg { color: var(--success); }
.toast.is-error svg { color: var(--danger); }
.toast span { flex: 1; }
.toast button { display: inline-flex; padding: 3px; border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; }
.toast button:hover { color: var(--text); }
.toast-enter-active, .toast-leave-active { transition: opacity .18s ease, transform .18s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
