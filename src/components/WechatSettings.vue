<!--
  文件说明：提供微信 ClawBot 扫码登录、配对码、连接开关、服务订阅编辑和最近发送记录界面。
-->

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { WechatRule, WechatStatus } from '../services/contracts';
const host = window.wechatHost;
const state = ref<WechatStatus>({ configured: false, enabled: false, connection: 'disconnected', peers: [], rules: [], services: [], deliveries: [] });
const busy = ref(false);
const message = ref('');
const failed = ref(false);
const code = ref('');
const topic = ref('');
const peer = ref('');
const rules = ref<WechatRule[]>([]);
const dirty = ref(false);
const confirmLogout = ref(false);
let subscription: { dispose(): void } | undefined;
const connectionLabel = computed(() => !host ? '需要桌面应用' : state.value.connection === 'connected' ? '连接正常'
  : state.value.connection === 'connecting' ? '正在连接' : state.value.connection === 'error' ? '连接异常'
    : state.value.configured ? '已暂停' : '未登录');
const receive = (next: WechatStatus) => {
  state.value = next;
  if (!dirty.value) rules.value = next.rules.map(rule => ({ ...rule }));
};
async function run(action: () => Promise<void>) {
  if (busy.value || !host) return;
  busy.value = true; message.value = ''; failed.value = false;
  try { await action(); receive(await host.status()); }
  catch (error) { failed.value = true; message.value = error instanceof Error ? error.message : String(error); }
  finally { busy.value = false; }
}
onMounted(() => {
  if (!host) return;
  subscription = host.onDidChange(receive);
  void run(async () => { receive(await host.status()); });
});
onBeforeUnmount(() => subscription?.dispose());
const addRule = () => {
  if (!topic.value || !peer.value) return;
  if (rules.value.some(rule => rule.topic === topic.value && rule.peerId === peer.value)) { message.value = '该会话已订阅此服务'; return; }
  rules.value.push({ id: crypto.randomUUID(), topic: topic.value, peerId: peer.value, enabled: true }); dirty.value = true;
};
const removeRule = (id: string) => { rules.value = rules.value.filter(rule => rule.id !== id); dirty.value = true; };
const save = () => run(async () => { await host!.saveRules(rules.value.map(rule => ({ ...rule }))); dirty.value = false; message.value = state.value.enabled ? '订阅已保存，后续服务结果会发送到所选微信会话' : '订阅已保存，当前仍暂停分发'; });
const logout = () => run(async () => { await host!.logout(); dirty.value = false; confirmLogout.value = false; });
const serviceName = (value: string) => state.value.services.find(service => service.topic === value)?.name || `${value}（当前未加载）`;
</script>

<template>
  <section
    class="group"
    aria-labelledby="wechat-title"
  >
    <h3
      id="wechat-title"
      class="group-title"
    >
      微信 ClawBot · 服务订阅
    </h3>
    <div class="card wechat-card">
      <div class="heading">
        <strong>{{ connectionLabel }}</strong><span v-if="state.accountId">{{ state.accountId }}</span>
      </div>
      <p>连接微信官方 ClawBot，将插件发布的结果分发到你选择的会话。</p>
      <p v-if="!host">
        请在桌面应用中扫码连接微信。
      </p>
      <template v-else>
        <div class="actions">
          <button
            v-if="!state.configured"
            :disabled="busy"
            @click="run(() => host!.login())"
          >
            {{ state.login ? '重新生成二维码' : '扫码连接微信' }}
          </button>
          <button
            v-if="state.login"
            :disabled="busy"
            @click="run(() => host!.cancelLogin())"
          >
            取消登录
          </button>
          <button
            v-if="state.configured"
            :disabled="busy"
            @click="run(() => host!.setEnabled(!state.enabled))"
          >
            {{ state.enabled ? '暂停分发' : '恢复连接与分发' }}
          </button>
          <button
            v-if="state.configured"
            :disabled="busy"
            @click="confirmLogout = true"
          >
            退出微信登录…
          </button>
        </div>
        <div
          v-if="confirmLogout"
          class="notice"
        >
          <p>退出会清除本机微信凭据、会话和订阅，并停止后续分发。确定退出？</p>
          <button
            :disabled="busy"
            @click="logout"
          >
            确认退出
          </button>
          <button
            :disabled="busy"
            @click="confirmLogout = false"
          >
            取消
          </button>
        </div>
        <div
          v-if="state.login"
          class="login"
        >
          <img
            v-if="state.login.qrImage"
            :src="state.login.qrImage"
            width="240"
            height="240"
            alt="微信 ClawBot 登录二维码"
          >
          <p role="status">
            {{ state.login.message }}
          </p>
          <div
            v-if="state.login.status === 'need_verifycode'"
            class="actions"
          >
            <input
              v-model="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              aria-label="微信配对数字"
              placeholder="手机显示的配对数字"
            >
            <button
              :disabled="busy || !code"
              @click="run(async () => { await host!.verify(code); code = ''; })"
            >
              提交配对码
            </button>
          </div>
        </div>
        <p
          v-if="state.error"
          class="error"
          role="status"
        >
          {{ state.error }}
        </p>
        <template v-if="state.configured">
          <p>先在微信给 ClawBot 发一条消息，再选择接收会话。会话以微信返回的 ID 标识；上下文失效时请再次发送消息。</p>
          <div class="subscription-editor">
            <label>订阅服务
              <select
                v-model="topic"
                :disabled="busy"
              >
                <option value="">选择插件服务</option>
                <option
                  v-for="service in state.services"
                  :key="service.topic"
                  :value="service.topic"
                >{{ service.name }}{{ service.enabled ? '' : '（已禁用）' }}</option>
              </select>
            </label>
            <label>接收微信会话
              <select
                v-model="peer"
                :disabled="busy"
              >
                <option value="">选择收到消息的会话</option>
                <option
                  v-for="item in state.peers"
                  :key="item.id"
                  :value="item.id"
                >{{ item.id }}</option>
              </select>
            </label>
            <button
              :disabled="busy || !topic || !peer"
              @click="addRule"
            >
              添加订阅
            </button>
          </div>
          <p v-if="!state.services.length">
            暂无插件声明可订阅服务。
          </p>
          <ul
            v-if="rules.length"
            class="rules"
          >
            <li
              v-for="rule in rules"
              :key="rule.id"
            >
              <label><input
                v-model="rule.enabled"
                type="checkbox"
                :disabled="busy"
                @change="dirty = true"
              >{{ serviceName(rule.topic) }} → {{ rule.peerId }}</label>
              <button
                :disabled="busy"
                @click="removeRule(rule.id)"
              >
                移除
              </button>
            </li>
          </ul>
          <p>保存订阅即允许将对应服务后续发布的标题和正文发送至所选微信会话。已有聊天和 AI 输出不会自动发送。</p>
          <button
            class="save"
            :disabled="busy || !dirty"
            @click="save"
          >
            保存订阅
          </button>
          <p v-if="dirty">
            有尚未保存的订阅更改。
          </p>
        </template>
        <div
          v-if="state.deliveries.length"
          class="deliveries"
        >
          <strong>最近发送记录</strong>
          <ul>
            <li
              v-for="delivery in state.deliveries"
              :key="delivery.id"
            >
              <span>{{ serviceName(delivery.topic) }} → {{ delivery.peerId }}</span>
              <small>{{ new Date(delivery.at).toLocaleString() }} · {{ delivery.state === 'sent' ? '微信接口已接受' : '发送失败' }}{{ delivery.error ? `：${delivery.error}` : '' }}</small>
            </li>
          </ul>
        </div>
      </template>
      <p
        v-if="message"
        role="status"
        :class="{ error: failed }"
      >
        {{ message }}
      </p>
      <p>登录凭据和会话上下文由系统加密保存在本机，不进入通用备份。退出应用后停止分发；超时或失败不会自动重发。</p>
    </div>
  </section>
</template>

<style scoped>
.wechat-card { padding: 16px; }
.heading { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 13px; }
.heading span, p { color: var(--text-secondary); font-size: 12px; overflow-wrap: anywhere; }
p { line-height: 1.7; margin: 10px 0; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
button, select, input:not([type='checkbox']) { padding: 6px 10px; border: 1px solid var(--hairline); border-radius: 6px; background: transparent; color: var(--text); font-size: 12px; }
button { cursor: pointer; }
button:disabled, select:disabled { opacity: .5; cursor: default; }
.login img { display: block; background: white; border-radius: 8px; max-width: 100%; object-fit: contain; }
.subscription-editor { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
.subscription-editor label { display: grid; gap: 6px; font-size: 12px; flex: 1; min-width: 160px; }
select { width: 100%; }
.rules, .deliveries ul { list-style: none; padding: 0; margin: 12px 0; }
.rules li { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; font-size: 12px; overflow-wrap: anywhere; }
.rules label { min-width: 0; }
.rules input { margin-right: 8px; }
.deliveries { margin-top: 20px; font-size: 12px; }
.deliveries li { display: grid; gap: 5px; padding: 8px 0; border-bottom: 1px solid var(--hairline); overflow-wrap: anywhere; }
.deliveries small { color: var(--text-secondary); }
.error { color: #d44; }
.notice { padding: 10px; border: 1px solid var(--hairline); border-radius: 8px; }
.notice button + button { margin-left: 8px; }
.save { color: var(--accent); }
</style>
