<!--
  文件说明：渲染从右侧打开的内置 AI 聊天抽屉，提供多轮对话、提示词编辑、取消与重试操作。
-->

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Bot, LoaderCircle, Plus, Send, Settings2, Square, X } from 'lucide-vue-next';
import { useAiChat } from '../composables/useAiChat';
import { useAiService } from '../composables/useAiService';

const { opened, close, session } = useAiChat();
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
watch(() => [session.state.exchanges.length, session.state.busy], () => { void scrollBottom(); });
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
          <!-- 模型文本使用插值渲染，不将其当成 HTML 执行。 -->
          <p v-if="exchange.status === 'done'">
            {{ exchange.response?.content }}
          </p>
          <p
            v-else-if="exchange.status === 'pending'"
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
            v-else
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
.ai-drawer { position: fixed; inset: 0 0 0 auto; margin: 0; padding: 0; width: 440px; max-width: 100vw; height: 100dvh; max-height: 100dvh; border: 0; border-left: 1px solid var(--hairline); background: var(--panel); color: var(--text); box-shadow: -14px 0 44px rgba(0,0,0,.16); overflow: hidden; }
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
.chat-composer { padding: 14px 18px; border-top: 1px solid var(--hairline); }
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
