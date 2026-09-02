<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { useSheet } from '../composables/useSheet';

const { sheet, close } = useSheet();
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="sheet" class="sheet-layer" @click.self="close">
        <section class="sheet" role="dialog" aria-modal="true" :aria-label="sheet.title ?? '详情'">
          <header class="sheet-head">
            <h2>{{ sheet.title ?? '详情' }}</h2>
            <button type="button" title="关闭" aria-label="关闭" @click="close"><X :size="17" /></button>
          </header>
          <div class="sheet-body">
            <component :is="sheet.component" v-bind="sheet.props" />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-layer { position: fixed; z-index: 45; inset: 0; display: flex; align-items: flex-end; background: rgba(0, 0, 0, .16); }
.sheet { width: 100%; max-height: min(78vh, 640px); overflow: auto; border: 1px solid var(--hairline); border-bottom: 0; border-radius: 14px 14px 0 0; background: rgba(255, 255, 255, .88); box-shadow: 0 -12px 36px rgba(0, 0, 0, .16); -webkit-backdrop-filter: blur(22px); backdrop-filter: blur(22px); }
.sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 15px 18px 12px; border-bottom: 1px solid var(--hairline); }
.sheet-head h2 { margin: 0; font-size: 16px; }
.sheet-head button { display: inline-flex; padding: 4px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); cursor: pointer; }
.sheet-head button:hover { background: rgba(0, 0, 0, .06); color: var(--text); }
.sheet-body { padding: 18px; }
.sheet-enter-active, .sheet-leave-active { transition: opacity .18s ease; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform .2s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
</style>
