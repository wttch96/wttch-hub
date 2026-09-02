<script setup lang="ts">
import { Bell, CheckCircle2, PanelBottom, TriangleAlert } from 'lucide-vue-next';
import { useSheet } from '../composables/useSheet';
import { useToast } from '../composables/useToast';
import OverlaySheetContent from './OverlaySheetContent.vue';

const toast = useToast();
const sheet = useSheet();

const openSheet = () => sheet.open({
  title: 'Sheet 示例',
  component: OverlaySheetContent,
  props: { source: 'OverlayDemoView' },
});
</script>

<template>
  <section class="page">
    <header class="page-head">
      <h1>Overlay 示例</h1>
      <p class="sub">查看插件可以使用的 Toast 和 Sheet 交互。</p>
    </header>

    <div class="demo-grid">
      <section class="card demo-card">
        <div class="demo-heading">
          <Bell :size="20" />
          <div>
            <h2>Toast</h2>
            <p>短暂反馈，不打断当前操作。</p>
          </div>
        </div>
        <div class="actions">
          <button type="button" @click="toast.info('这是一条提示消息')">提示</button>
          <button type="button" class="success" @click="toast.success('保存成功')"><CheckCircle2 :size="15" />成功</button>
          <button type="button" class="danger" @click="toast.error('操作失败，请稍后重试')"><TriangleAlert :size="15" />错误</button>
        </div>
      </section>

      <section class="card demo-card">
        <div class="demo-heading">
          <PanelBottom :size="20" />
          <div>
            <h2>Sheet</h2>
            <p>从底部展开的可组合内容面板。</p>
          </div>
        </div>
        <button type="button" class="primary" @click="openSheet">打开 Sheet</button>
      </section>
    </div>
  </section>
</template>

<style scoped>
.demo-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.demo-card { padding: 20px; }
.demo-heading { display: flex; align-items: flex-start; gap: 12px; }
.demo-heading > svg { flex: 0 0 auto; color: var(--accent); }
h2 { margin: 0 0 4px; font-size: 16px; }
p { margin: 0; color: var(--text-secondary); font-size: 13px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
button { display: inline-flex; align-items: center; gap: 5px; padding: 8px 12px; border: 1px solid var(--hairline); border-radius: 7px; background: rgba(255, 255, 255, .55); color: var(--text); font-size: 12px; cursor: pointer; }
button:hover { border-color: var(--accent); }
button.success { color: #16833b; }
button.danger { color: #d92d48; }
button.primary { margin-top: 22px; background: var(--accent); border-color: var(--accent); color: #fff; }
@media (max-width: 640px) { .demo-grid { grid-template-columns: 1fr; } }
</style>
