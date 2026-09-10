<!--
  文件说明：渲染从右侧打开的内置 AI 聊天抽屉，提供多轮对话、提示词编辑、取消与重试操作。
-->

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import { useRouter } from 'vue-router';
import {
  Bot,
  CircleCheck,
  CircleX,
  LoaderCircle,
  Plus,
  Send,
  Settings2,
  Square,
  Wrench,
  X,
} from 'lucide-vue-next';
import { useAiChat } from '../composables/useAiChat';
import { useAiService } from '../composables/useAiService';

const { opened, close, session } = useAiChat();
const markdown = new MarkdownIt({ breaks: true, linkify: true });
/** 外部模型内容先转 Markdown，再净化后才交给 v-html。 */
const renderMarkdown = (value?: string) => DOMPurify.sanitize(markdown.render(value ?? ''));
/** 是否有步骤正在执行：有的话步骤自己会转圈，不再额外显示「正在思考」。 */
const hasRunningStep = (steps: readonly { status: string }[]) =>
  steps.some(step => step.status === 'running');
/** 工具参数：无参数时给出明确提示，过长时截断，避免撑破卡片。 */
const formatArgs = (args?: Record<string, unknown>) => {
  if (!args || !Object.keys(args).length) return '无参数';
  const text = JSON.stringify(args);
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
};
/** 工具结果按 JSON 缩进展示并截断：卡片高度有限，超长内容对用户意义不大。 */
const RESULT_LIMIT = 4000;
const formatResult = (result?: string) => {
  if (!result) return '';
  let text = result;
  try {
    text = JSON.stringify(JSON.parse(result), null, 2);
  } catch {
    // 非 JSON 结果原样展示。
  }
  return text.length > RESULT_LIMIT ? `${text.slice(0, RESULT_LIMIT)}…` : text;
};
const ai = useAiService();
const router = useRouter();
const dialog = ref<HTMLDialogElement>();
const input = ref<HTMLTextAreaElement>();
const transcript = ref<HTMLElement>();
const draft = ref('');
const promptExpanded = ref(false);
const systemPrompt = computed({ get: () => session.state.systemPrompt, set: (value: string) => session.setSystemPrompt(value) });
const ready = computed(() => ai.state.available && ai.state.status.configured && ai.state.status.enabled);
const subtitle = computed(() => !ai.state.available ? '请在桌面应用中使用 AI' : !ai.state.status.enabled ? 'AI 服务已关闭'
  : !ai.state.status.configured ? '先配置 AI 服务，即可开始对话' : ai.state.status.model);
const scrollBottom = async () => {
  await nextTick();
  if (transcript.value) transcript.value.scrollTop = transcript.value.scrollHeight;
};
watch(() => session.state.exchanges, () => { void scrollBottom(); }, { deep: true });
watch(opened, async (value) => {
  await nextTick();
  if (value && !dialog.value?.open) {
    // 原生 dialog 提供焦点圈定、背景不可交互和关闭后焦点恢复，键盘用户不会跳出抽屉。
    dialog.value?.showModal();
    await ai.refresh();
    input.value?.focus();
    void scrollBottom();
  } else if (!value && dialog.value?.open) dialog.value.close();
});
onMounted(() => { void ai.refresh(); });
onBeforeUnmount(() => session.stop());
const send = () => {
  if (!draft.value.trim() || !ready.value || session.state.busy) return;
  const text = draft.value;
  draft.value = '';
  void session.send(text);
};
const handleEnter = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); send(); }
};
const goToSettings = () => { close(); void router.push({ path: '/settings', hash: '#ai' }); };
const closeBackdrop = (event: MouseEvent) => {
  if (event.target !== dialog.value) return;
  const rect = dialog.value.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
};
</script>

<template>
  <dialog
    ref="dialog"
    class="ai-drawer"
    aria-labelledby="ai-chat-title"
    @cancel.prevent="close"
    @close="close"
    @click="closeBackdrop"
  >
    <header class="chat-header">
      <div class="chat-heading">
        <Bot :size="21" /><div>
          <h2 id="ai-chat-title">
            AI 聊天
          </h2><p>{{ subtitle }}</p>
        </div>
      </div>
      <div class="chat-tools">
        <button
          type="button"
          title="新对话"
          aria-label="新对话"
          :disabled="!session.state.exchanges.length"
          @click="session.clear()"
        >
          <Plus :size="17" />
        </button>
        <button
          type="button"
          title="AI 设置"
          aria-label="AI 设置"
          @click="goToSettings"
        >
          <Settings2 :size="17" />
        </button>
        <button
          type="button"
          title="关闭聊天"
          aria-label="关闭聊天"
          @click="close"
        >
          <X :size="18" />
        </button>
      </div>
    </header>
    <div class="chat-prompt">
      <button
        type="button"
        :aria-expanded="promptExpanded"
        aria-controls="chat-system-prompt"
        @click="promptExpanded = !promptExpanded"
      >
        {{ promptExpanded ? '收起' : '编辑' }}系统提示词
      </button>
      <textarea
        v-if="promptExpanded"
        id="chat-system-prompt"
        v-model="systemPrompt"
        :disabled="session.state.busy"
        aria-label="聊天系统提示词"
        maxlength="8000"
        rows="3"
      />
    </div>
    <div
      ref="transcript"
      class="chat-transcript"
      role="log"
      aria-label="聊天记录"
      aria-live="polite"
    >
      <div
        v-if="!session.state.exchanges.length"
        class="chat-empty"
      >
        <span class="chat-orb"><Bot :size="30" /></span><h3>有什么想聊的？</h3>
        <p>{{ ready ? '提问、梳理思路，或让 AI 帮你整理一段文字。' : '在设置中接入 DeepSeek 或兼容服务，聊天与插件共用一份配置。' }}</p>
        <button
          v-if="!ready"
          type="button"
          class="chat-primary"
          @click="goToSettings"
        >
          前往 AI 设置
        </button>
      </div>
      <article
        v-for="(exchange, index) in session.state.exchanges"
        :key="exchange.id"
        class="chat-exchange"
      >
        <div class="chat-message user">
          <span class="chat-role">你</span><p>{{ exchange.prompt }}</p>
        </div>
        <div class="chat-message assistant">
          <span class="chat-role">AI</span>
          <!-- 按执行顺序渲染：文本 → 工具调用卡片 → 后续文本，完整还原生成过程。 -->
          <template
            v-for="step in exchange.steps"
            :key="step.id"
          >
            <div
              v-if="step.kind === 'text'"
              class="chat-markdown"
              v-html="renderMarkdown(step.content)"
            />
            <div
              v-else
              class="chat-tool"
              :class="`is-${step.status}`"
            >
              <div class="chat-tool-head">
                <Wrench :size="13" />
                <code>{{ step.name }}</code>
                <LoaderCircle
                  v-if="step.status === 'running'"
                  :size="13"
                  class="spin"
                />
                <CircleCheck
                  v-else-if="step.status === 'done'"
                  :size="13"
                  class="chat-tool-ok"
                />
                <CircleX
                  v-else
                  :size="13"
                  class="chat-tool-fail"
                />
              </div>
              <p>{{ formatArgs(step.args) }}</p>
              <details v-if="step.result !== undefined">
                <summary>{{ step.status === 'error' ? '查看错误' : '查看结果' }}</summary>
                <pre>{{ formatResult(step.result) }}</pre>
              </details>
            </div>
          </template>
          <!-- 兜底：服务商没有推送增量时用最终文本补一次渲染，避免出现空气泡。 -->
          <div
            v-if="!exchange.steps.length && exchange.response?.content"
            class="chat-markdown"
            v-html="renderMarkdown(exchange.response.content)"
          />
          <!-- 没有正在执行的步骤时才提示等待，同时覆盖首轮和两轮之间的空档。 -->
          <p
            v-if="exchange.status === 'pending' && !hasRunningStep(exchange.steps)"
            class="chat-wait"
          >
            <LoaderCircle
              :size="15"
              class="spin"
            />正在思考…
          </p>
          <p
            v-else-if="exchange.status === 'cancelled'"
            class="chat-muted"
          >
            已停止生成。
          </p>
          <p
            v-else-if="exchange.status === 'error'"
            class="chat-error"
          >
            {{ exchange.error?.message }}<small>{{ exchange.error?.code }}</small>
          </p>
          <small
            v-if="exchange.response?.finishReason === 'length'"
            class="chat-error"
          >已达到输出上限，回答可能不完整。</small>
          <small
            v-if="exchange.response?.usage"
            class="chat-muted"
          >{{ exchange.response.usage.totalTokens }} tokens · {{ exchange.response.model }}</small>
          <button
            v-if="index === session.state.exchanges.length - 1 && ['error', 'cancelled'].includes(exchange.status)"
            type="button"
            :disabled="session.state.busy || !ready"
            @click="session.retry()"
          >
            重试
          </button>
        </div>
      </article>
    </div>
    <form
      class="chat-composer"
      @submit.prevent="send"
    >
      <p
        v-if="!ready"
        class="chat-notice"
      >
        {{ subtitle }} <button
          type="button"
          @click="goToSettings"
        >
          打开设置
        </button>
      </p>
      <textarea
        ref="input"
        v-model="draft"
        aria-label="发送给 AI 的消息"
        :disabled="!ready"
        maxlength="16000"
        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
        rows="3"
        @keydown="handleEnter"
      />
      <div class="chat-composer-footer">
        <small>仅携带最近 20 轮成功对话 · 会话不落盘</small>
        <button
          v-if="session.state.busy"
          type="button"
          @click="session.stop()"
        >
          <Square :size="14" />停止
        </button>
        <button
          v-else
          type="submit"
          class="chat-primary"
          :disabled="!ready || !draft.trim()"
        >
          <Send :size="14" />发送
        </button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.ai-drawer { position: fixed; inset: 14px 14px 14px auto; margin: 0; padding: 0; width: 440px; max-width: calc(100vw - 28px); height: auto; max-height: calc(100dvh - 28px); border: 1px solid var(--hairline); border-radius: 16px; background: var(--panel); color: var(--text); box-shadow: -14px 0 44px rgba(0,0,0,.16); overflow: hidden; }
.ai-drawer[open] { display: flex; flex-direction: column; animation: drawer-in .2s ease-out; }
.ai-drawer::backdrop { background: rgba(0,0,0,.18); }
.chat-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px; border-bottom: 1px solid var(--hairline); }
.chat-heading { display: flex; align-items: center; gap: 10px; min-width: 0; }
.chat-heading > svg { flex-shrink: 0; color: var(--accent); }
.chat-heading > div { min-width: 0; }
h2 { margin: 0; font-size: 16px; }
.chat-heading p { margin: 4px 0 0; color: var(--text-secondary); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-tools { display: flex; gap: 3px; flex-shrink: 0; }
button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 9px; border: 1px solid var(--hairline); border-radius: 7px; background: transparent; color: var(--text); font: inherit; font-size: 12px; cursor: pointer; }
.chat-tools button { padding: 6px; border: 0; }
button:hover:not(:disabled) { background: var(--accent-weak); }
button:disabled { opacity: .4; cursor: default; }
button.chat-primary { background: var(--accent); color: white; border-color: transparent; }
.chat-prompt { padding: 10px 18px; border-bottom: 1px solid var(--hairline); }
.chat-prompt > button { padding: 0; border: 0; color: var(--text-secondary); font-size: 11px; }
textarea { display: block; width: 100%; resize: vertical; min-height: 58px; max-height: 160px; padding: 10px; border: 1px solid var(--hairline); border-radius: 8px; background: var(--content-bg); color: var(--text); font: inherit; font-size: 13px; line-height: 1.6; }
.chat-prompt textarea { margin-top: 8px; }
.chat-transcript { flex: 1; min-height: 0; overflow-y: auto; padding: 18px; }
.chat-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 220px; height: 100%; text-align: center; gap: 12px; }
.chat-orb { display: inline-flex; padding: 16px; border-radius: 20px; background: var(--accent-weak); color: var(--accent); }
.chat-empty h3 { margin: 0; font-size: 18px; }
.chat-empty p { margin: 0; max-width: 280px; font-size: 13px; color: var(--text-secondary); line-height: 1.7; }
.chat-exchange + .chat-exchange { margin-top: 24px; }
.chat-message { padding: 12px; border-radius: 10px; overflow-wrap: anywhere; }
.chat-message.user { margin-left: 24px; background: var(--accent-weak); }
.chat-message.assistant { margin: 8px 24px 0 0; background: var(--content-bg); }
.chat-role { color: var(--text-secondary); font-size: 11px; }
.chat-message p { margin: 6px 0; white-space: pre-wrap; line-height: 1.7; font-size: 13px; }
.chat-message small { display: block; margin-top: 8px; font-size: 10px; }
.chat-message button { margin-top: 8px; }
.chat-error { color: var(--danger); }
.chat-muted { color: var(--text-secondary); }
.chat-wait { display: flex; align-items: center; gap: 8px; }
.chat-tool { margin: 8px 0; padding: 8px 10px; border: 1px solid var(--hairline); border-radius: 8px; background: var(--panel); }
.chat-tool.is-error { border-color: var(--danger); }
.chat-tool-head { display: flex; align-items: center; gap: 6px; }
.chat-tool-head > svg:first-child { flex-shrink: 0; color: var(--text-secondary); }
.chat-tool-head code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: Consolas, monospace; font-size: 12px; }
.chat-tool-ok { color: var(--accent); }
.chat-tool-fail { color: var(--danger); }
.chat-tool p { margin: 6px 0 0; color: var(--text-secondary); font-size: 11px; line-height: 1.6; }
.chat-tool details { margin-top: 6px; }
.chat-tool summary { cursor: pointer; color: var(--text-secondary); font-size: 11px; }
.chat-tool pre { overflow: auto; max-height: 220px; margin: 6px 0 0; padding: 8px; border-radius: 6px; background: var(--content-bg); font-family: Consolas, monospace; font-size: 11px; line-height: 1.5; }
.chat-composer { padding: 14px 18px; border-top: 1px solid var(--hairline); }
.chat-markdown :deep(p) { margin: .45em 0; line-height: 1.6; } .chat-markdown :deep(pre) { overflow: auto; padding: 10px; border-radius: 7px; background: var(--content-bg); } .chat-markdown :deep(code) { font-family: Consolas, monospace; } .chat-markdown :deep(a) { color: var(--accent); } .chat-markdown :deep(ul), .chat-markdown :deep(ol) { padding-left: 20px; }
.chat-composer-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 10px; }
.chat-composer-footer small { font-size: 10px; line-height: 1.5; color: var(--text-secondary); }
.chat-notice { margin: 0 0 8px; font-size: 12px; color: var(--text-secondary); }
.chat-notice button { border: 0; padding: 0 4px; color: var(--accent); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) { .ai-drawer[open], .spin { animation: none; } }
</style>
