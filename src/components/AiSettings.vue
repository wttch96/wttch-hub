<!--
  文件说明：提供 AI 服务商、模型、密钥和超时配置表单，并展示保存结果与连接测试状态。
-->

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { CheckCircle2, LoaderCircle, PlugZap, Save } from 'lucide-vue-next';
import { useRoute } from 'vue-router';
import { useAiService } from '../composables/useAiService';
import { DEFAULT_AI_STATUS, DEEPSEEK_MODELS, type AiConfigurationUpdate } from '@module/ai';

const ai = useAiService();
const route = useRoute();
const section = ref<HTMLElement>();
const scrollToAi = async () => {
  if (route.hash !== '#ai') return;
  await nextTick();
  section.value?.scrollIntoView({ block: 'start', behavior: 'smooth' });
};
watch(() => route.hash, () => { void scrollToAi(); });
const { state } = ai;
const form = reactive({ enabled: true, provider: 'deepseek' as AiConfigurationUpdate['provider'], baseUrl: '', model: '', timeoutSeconds: 120, apiKey: '' });
// 保留已有的非预设模型作为只读选项，避免打开设置就把历史配置静默改成 Flash。
const hasPresetModel = computed(() => DEEPSEEK_MODELS.some((model) => model.value === form.model));
const dirty = ref(false);
const saving = ref(false);
const testing = ref(false);
const clearKey = ref(false);
const feedback = ref('');
const failed = ref(false);
let testId: string | undefined;
const statusText = computed(() => !state.available ? '需要桌面应用' : !state.status.enabled ? '已关闭'
  : !state.status.configured ? '未配置' : state.status.connection === 'ok' ? '连接正常'
    : state.status.connection === 'error' ? '调用失败' : '已配置 · 待测试');
const syncForm = () => {
  form.enabled = state.status.enabled;
  form.provider = state.status.provider;
  form.baseUrl = state.status.baseUrl;
  form.model = state.status.model;
  form.timeoutSeconds = state.status.timeoutMs / 1000;
};
syncForm();
watch(() => state.status, (status, previous) => {
  if (!dirty.value && !saving.value) syncForm();
  // 插件或聊天产生新的检查结果后，清除旧的“测试成功”反馈，显示最新状态。
  if (!testing.value && status.checkedAt !== previous.checkedAt) { feedback.value = ''; failed.value = false; }
});
onMounted(() => { void ai.refresh(); void scrollToAi(); });
onBeforeUnmount(() => { if (testId) void ai.cancel('settings', testId); });
const changeProvider = () => {
  if (form.provider === 'deepseek') {
    form.baseUrl = DEFAULT_AI_STATUS.baseUrl;
    form.model = DEFAULT_AI_STATUS.model;
  } else { form.baseUrl = ''; form.model = ''; }
  form.apiKey = '';
  dirty.value = true;
};
const save = async () => {
  saving.value = true;
  feedback.value = '';
  const result = await ai.configure({
    enabled: form.enabled, provider: form.provider, baseUrl: form.baseUrl, model: form.model,
    timeoutMs: Number(form.timeoutSeconds) * 1000,
    // 空输入框默认保留原密钥；只有“清除密钥”明确提交空字符串。
    ...(clearKey.value ? { apiKey: '' } : form.apiKey.trim() ? { apiKey: form.apiKey } : {}),
  });
  saving.value = false;
  failed.value = result.ok === false;
  if (result.ok === true) {
    dirty.value = false;
    form.apiKey = '';
    clearKey.value = false;
    syncForm();
    feedback.value = result.value.configured ? '已保存，可测试连接。' : '已保存，请补充 API Key。';
  } else feedback.value = result.error.message;
};
const test = async () => {
  if (testing.value) return;
  testing.value = true;
  feedback.value = '';
  testId = crypto.randomUUID();
  const result = await ai.test(testId);
  testId = undefined;
  testing.value = false;
  failed.value = result.ok === false;
  feedback.value = result.ok === true ? `连接成功 · ${result.value.model}` : `${result.error.message}（${result.error.code}）`;
};
</script>

<template>
  <section
    id="ai"
    ref="section"
    class="group ai-settings"
    aria-labelledby="ai-settings-title"
  >
    <div class="ai-heading">
      <h3
        id="ai-settings-title"
        class="group-title"
      >
        AI 服务
      </h3>
      <span
        class="ai-badge"
        :class="{ connected: state.status.connection === 'ok' && state.status.enabled }"
      >{{ statusText }}</span>
    </div>
    <p class="ai-description">
      统一配置后，内置聊天和声明 AI 能力的插件即可使用。
    </p>
    <form
      class="card ai-form"
      @submit.prevent="save"
      @input="dirty = true"
      @change="dirty = true"
    >
      <fieldset :disabled="!state.available || state.loading || saving || testing">
        <label class="ai-enabled"><input
          v-model="form.enabled"
          type="checkbox"
        >启用 AI 服务</label>
        <div class="ai-fields">
          <label>服务商
            <select
              v-model="form.provider"
              @change="changeProvider"
            >
              <option value="deepseek">DeepSeek</option>
              <option value="compatible">自定义兼容服务</option>
            </select>
          </label>
          <label>模型名称
            <select
              v-if="form.provider === 'deepseek'"
              v-model="form.model"
              required
            >
              <option
                v-if="!hasPresetModel"
                :value="form.model"
                disabled
              >
                {{ form.model ? `已保存：${form.model}` : '请选择模型' }}
              </option>
              <option
                v-for="model in DEEPSEEK_MODELS"
                :key="model.value"
                :value="model.value"
              >
                {{ model.label }}
              </option>
            </select>
            <input
              v-else
              v-model="form.model"
              required
              maxlength="200"
              placeholder="服务商提供的模型 ID"
            >
          </label>
          <label class="ai-wide">服务地址
            <input
              v-model="form.baseUrl"
              type="url"
              required
              :readonly="form.provider === 'deepseek'"
              placeholder="https://example.com/v1"
            >
          </label>
          <label class="ai-wide">API Key
            <input
              v-model="form.apiKey"
              type="password"
              autocomplete="new-password"
              maxlength="8192"
              :disabled="clearKey"
              :placeholder="state.status.hasApiKey ? '已保存密钥，留空保留；更换服务后需重新输入' : '输入 API Key'"
            >
          </label>
          <label>请求超时（秒）<input
            v-model.number="form.timeoutSeconds"
            type="number"
            min="5"
            max="300"
            step="1"
            required
          ></label>
          <label
            v-if="state.status.hasApiKey"
            class="ai-clear"
          ><input
            v-model="clearKey"
            type="checkbox"
          >清除已保存密钥</label>
        </div>
        <p class="ai-hint">
          密钥由系统加密保存在本机，插件无法读取。自定义服务需兼容 Chat Completions 接口。
        </p>
        <div class="ai-actions">
          <button
            type="submit"
            class="primary"
          >
            <Save :size="15" />{{ saving ? '保存中…' : '保存配置' }}
          </button>
          <button
            type="button"
            :disabled="dirty || !state.status.configured || !state.status.enabled"
            @click="test"
          >
            <PlugZap :size="15" />测试连接
          </button>
        </div>
      </fieldset>
      <p
        v-if="testing"
        class="ai-feedback"
        role="status"
      >
        <LoaderCircle
          :size="14"
          class="spin"
        />正在测试…<button
          type="button"
          @click="testId && ai.cancel('settings', testId)"
        >
          停止测试
        </button>
      </p>
      <p
        v-if="feedback"
        class="ai-feedback"
        :class="{ failed }"
        role="status"
      >
        <CheckCircle2
          v-if="!failed"
          :size="14"
        />{{ feedback }}
      </p>
      <p
        v-else-if="state.status.lastError"
        class="ai-feedback failed"
        role="status"
      >
        {{ state.status.lastError.message }}
      </p>
      <p class="ai-hint">
        测试使用已保存配置，会发送一条短消息，可能产生少量 token 费用。修改后请先保存再测试。
      </p>
      <p
        v-if="!state.available"
        class="ai-hint"
      >
        当前为浏览器预览，请在 Electron 桌面应用中保存密钥并调用 AI。
      </p>
    </form>
  </section>
</template>

<style scoped>
.ai-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.ai-heading .group-title { margin: 0; }
.ai-badge { padding: 4px 8px; border-radius: 6px; background: var(--accent-weak); color: var(--text-secondary); font-size: 11px; }
.ai-badge.connected { color: var(--success); }
.ai-description, .ai-hint { color: var(--text-secondary); font-size: 12px; line-height: 1.6; }
.ai-form { padding: 16px; }
fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
fieldset:disabled { opacity: .65; }
.ai-enabled, .ai-clear { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.ai-enabled { margin-bottom: 16px; }
.ai-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.ai-fields label:not(.ai-clear) { display: grid; gap: 7px; min-width: 0; font-size: 12px; }
.ai-wide { grid-column: 1 / -1; }
input:not([type='checkbox']), select { width: 100%; min-width: 0; padding: 8px 10px; border: 1px solid var(--hairline); border-radius: 7px; background: var(--content-bg); color: var(--text); font: inherit; }
input[type='checkbox'] { accent-color: var(--accent); }
.ai-actions { display: flex; gap: 8px; flex-wrap: wrap; }
button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 11px; border: 1px solid var(--hairline); border-radius: 7px; background: var(--card-bg); color: var(--text); cursor: pointer; font: inherit; font-size: 12px; }
button.primary { background: var(--accent); color: white; border-color: transparent; }
button:disabled { opacity: .45; cursor: default; }
.ai-feedback { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; font-size: 12px; color: var(--success); }
.ai-feedback.failed { color: var(--danger); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 700px) { .ai-fields { grid-template-columns: 1fr; } }
</style>
