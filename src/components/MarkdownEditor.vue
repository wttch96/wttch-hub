<!--
  文件说明：提供安全的 Markdown 渲染与双栏编辑弹窗，可通过 v-model 在宿主页面和插件中复用。
-->

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Check, Edit3, Eye, FileText, X } from 'lucide-vue-next';
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

const props = withDefaults(defineProps<{
  modelValue?: string;
  title?: string;
  placeholder?: string;
  editable?: boolean;
  compact?: boolean;
}>(), {
  modelValue: '',
  title: '编辑 Markdown',
  placeholder: '点击添加 Markdown 正文…',
  editable: true,
  compact: false,
});
const emit = defineEmits<{
  'update:modelValue': [value: string];
  save: [value: string];
}>();

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true, typographer: true });
const defaultLinkOpen = markdown.renderer.rules.link_open
  ?? ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  tokens[index].attrSet('target', '_blank');
  tokens[index].attrSet('rel', 'noopener noreferrer');
  return defaultLinkOpen(tokens, index, options, env, self);
};

const open = ref(false);
const draft = ref(props.modelValue);
const editor = ref<HTMLTextAreaElement>();
const rendered = computed(() => DOMPurify.sanitize(markdown.render(props.modelValue || '')));
const draftRendered = computed(() => DOMPurify.sanitize(markdown.render(draft.value || '')));

watch(() => props.modelValue, (value) => { if (!open.value) draft.value = value; });
const showEditor = (event?: MouseEvent | KeyboardEvent) => {
  if (!props.editable) return;
  if (event instanceof MouseEvent && (event.target as HTMLElement | null)?.closest('a')) return;
  draft.value = props.modelValue;
  open.value = true;
  void nextTick(() => editor.value?.focus());
};
const closeEditor = () => { draft.value = props.modelValue; open.value = false; };
const save = () => {
  emit('update:modelValue', draft.value);
  emit('save', draft.value);
  open.value = false;
};
const onKeydown = (event: KeyboardEvent) => {
  if (!open.value) return;
  if (event.key === 'Escape') closeEditor();
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') save();
};
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <article
    class="markdown-view"
    :class="{ editable, compact, empty: !modelValue.trim() }"
    :role="editable ? 'button' : undefined"
    :tabindex="editable ? 0 : undefined"
    :aria-label="editable ? `${title}，点击编辑` : undefined"
    @click="showEditor"
    @keydown.enter.prevent="showEditor"
  >
    <div v-if="modelValue.trim()" class="markdown-body" v-html="rendered" />
    <span v-else class="markdown-placeholder"><FileText :size="14" />{{ placeholder }}</span>
    <span v-if="editable" class="edit-hint"><Edit3 :size="12" />编辑</span>
  </article>

  <Teleport to="body">
    <Transition name="markdown-dialog">
      <div v-if="open" class="markdown-dialog-layer" @click.self="closeEditor">
        <section class="markdown-dialog" role="dialog" aria-modal="true" :aria-label="title">
          <header><div><FileText :size="18" /><h2>{{ title }}</h2></div><div class="dialog-actions"><span>⌘/Ctrl + Enter 保存</span><button type="button" class="cancel" @click="closeEditor"><X :size="15" />取消</button><button type="button" class="save" @click="save"><Check :size="15" />保存</button></div></header>
          <div class="editor-grid">
            <section class="editor-pane"><div class="pane-title"><Edit3 :size="14" />Markdown</div><textarea ref="editor" v-model="draft" spellcheck="false" :placeholder="placeholder" /></section>
            <section class="preview-pane"><div class="pane-title"><Eye :size="14" />预览</div><div v-if="draft.trim()" class="markdown-body preview-body" v-html="draftRendered" /><div v-else class="preview-empty"><FileText :size="24" /><span>在左侧输入 Markdown，右侧会实时预览</span></div></section>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.markdown-view { position: relative; min-height: 44px; border-radius: 7px; color: var(--text); } .markdown-view.editable { padding: 7px 8px; cursor: pointer; transition: background .15s, box-shadow .15s; } .markdown-view.editable:hover, .markdown-view.editable:focus-visible { outline: 0; background: var(--accent-weak); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent); } .markdown-view.compact { min-height: 30px; padding: 4px 6px; } .markdown-placeholder { display: flex; align-items: center; gap: 5px; min-height: 30px; color: var(--text-secondary); font-size: 10px; } .edit-hint { position: absolute; top: 6px; right: 7px; display: none; align-items: center; gap: 3px; padding: 2px 5px; border-radius: 5px; background: var(--panel); color: var(--accent); font-size: 8px; } .markdown-view:hover .edit-hint, .markdown-view:focus-visible .edit-hint { display: flex; }
.markdown-body { overflow-wrap: anywhere; color: var(--text); font-size: 12px; line-height: 1.62; } .compact .markdown-body { font-size: 10px; line-height: 1.48; } .markdown-body :deep(> :first-child) { margin-top: 0; } .markdown-body :deep(> :last-child) { margin-bottom: 0; } .markdown-body :deep(h1), .markdown-body :deep(h2), .markdown-body :deep(h3) { margin: .9em 0 .4em; line-height: 1.25; } .markdown-body :deep(h1) { font-size: 1.55em; } .markdown-body :deep(h2) { padding-bottom: .25em; border-bottom: 1px solid var(--hairline); font-size: 1.3em; } .markdown-body :deep(h3) { font-size: 1.12em; } .markdown-body :deep(p), .markdown-body :deep(ul), .markdown-body :deep(ol), .markdown-body :deep(blockquote), .markdown-body :deep(pre) { margin: .55em 0; } .markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 1.7em; } .markdown-body :deep(a) { color: var(--accent); text-decoration: none; } .markdown-body :deep(a:hover) { text-decoration: underline; } .markdown-body :deep(blockquote) { padding: .15em .8em; border-left: 3px solid var(--accent); color: var(--text-secondary); } .markdown-body :deep(code) { padding: .12em .34em; border-radius: 4px; background: color-mix(in srgb, var(--text) 8%, transparent); font-family: 'SFMono-Regular', Consolas, monospace; font-size: .9em; } .markdown-body :deep(pre) { padding: .75em; overflow: auto; border: 1px solid var(--hairline); border-radius: 7px; background: color-mix(in srgb, var(--text) 6%, var(--panel)); } .markdown-body :deep(pre code) { padding: 0; background: transparent; } .markdown-body :deep(table) { width: 100%; border-collapse: collapse; } .markdown-body :deep(th), .markdown-body :deep(td) { padding: .35em .5em; border: 1px solid var(--border); text-align: left; } .markdown-body :deep(img) { max-width: 100%; border-radius: 6px; }
.markdown-dialog-layer { position: fixed; z-index: 90; inset: 0; display: grid; padding: 4vh 4vw; place-items: center; background: rgba(0, 0, 0, .34); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); } .markdown-dialog { display: flex; width: min(1180px, 92vw); height: min(780px, 88vh); overflow: hidden; border: 1px solid var(--border); border-radius: 16px; flex-direction: column; background: var(--panel); box-shadow: 0 24px 80px rgba(0, 0, 0, .28); } .markdown-dialog > header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 16px; border-bottom: 1px solid var(--hairline); } .markdown-dialog > header > div, .dialog-actions, .dialog-actions button, .pane-title, .preview-empty { display: flex; align-items: center; } .markdown-dialog h2 { margin: 0; font-size: 15px; } .markdown-dialog > header > div:first-child { gap: 7px; color: var(--accent); } .dialog-actions { gap: 7px; } .dialog-actions > span { margin-right: 4px; color: var(--text-secondary); font-size: 9px; } .dialog-actions button { gap: 4px; padding: 6px 9px; border: 0; border-radius: 7px; cursor: pointer; } .dialog-actions .cancel { background: var(--content-bg); color: var(--text-secondary); } .dialog-actions .save { background: var(--accent); color: #fff; }
.editor-grid { display: grid; min-height: 0; flex: 1; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .editor-pane, .preview-pane { display: flex; min-width: 0; min-height: 0; flex-direction: column; } .editor-pane { border-right: 1px solid var(--border); } .pane-title { gap: 5px; flex: 0 0 auto; padding: 8px 12px; border-bottom: 1px solid var(--hairline); background: var(--content-bg); color: var(--text-secondary); font-size: 10px; font-weight: 600; } .editor-pane textarea { min-width: 0; min-height: 0; flex: 1; padding: 16px; resize: none; border: 0; outline: 0; background: color-mix(in srgb, var(--content-bg) 55%, var(--panel)); color: var(--text); font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px; line-height: 1.65; tab-size: 2; } .preview-body { min-height: 0; padding: 16px 20px 40px; overflow: auto; font-size: 13px; } .preview-empty { justify-content: center; gap: 8px; flex: 1; flex-direction: column; color: var(--text-secondary); font-size: 11px; }
.markdown-dialog-enter-active, .markdown-dialog-leave-active { transition: opacity .16s ease; } .markdown-dialog-enter-active .markdown-dialog, .markdown-dialog-leave-active .markdown-dialog { transition: transform .18s ease; } .markdown-dialog-enter-from, .markdown-dialog-leave-to { opacity: 0; } .markdown-dialog-enter-from .markdown-dialog, .markdown-dialog-leave-to .markdown-dialog { transform: scale(.97) translateY(8px); }
@media (max-width: 760px) { .markdown-dialog-layer { padding: 0; } .markdown-dialog { width: 100vw; height: 100vh; border: 0; border-radius: 0; } .editor-grid { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; } .editor-pane { border-right: 0; border-bottom: 1px solid var(--border); } .dialog-actions > span { display: none; } }
</style>
