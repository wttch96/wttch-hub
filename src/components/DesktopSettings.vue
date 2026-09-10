<!--
  文件说明：提供关闭窗口行为、实际数据目录查看以及业务数据备份导出和恢复的设置界面。
-->

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { captureEntries } from '../data/backup';
import type { CloseBehavior } from '../data/backup';
const host = window.desktopHost;
const behavior = ref<CloseBehavior>('quit');
const directory = ref('');
const trayAvailable = ref(false);
const debugLoggingEnabled = ref(false);
const ready = ref(false);
const busy = ref(false);
const message = ref('');
const failed = ref(false);
async function run(action: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true; message.value = ''; failed.value = false;
  try { await action(); } catch (error) { failed.value = true; message.value = error instanceof Error ? error.message : String(error); }
  finally { busy.value = false; }
}
onMounted(() => { if (host) void run(async () => {
  const info = await host.info();
  behavior.value = info.closeBehavior; directory.value = info.directory; trayAvailable.value = info.trayAvailable; debugLoggingEnabled.value = info.debugLoggingEnabled; ready.value = true;
}); });
const changeBehavior = (event: Event) => {
  const input = event.target as HTMLSelectElement;
  const next = input.value as CloseBehavior;
  void run(async () => {
    try { await host!.setCloseBehavior(next); behavior.value = next; message.value = '关闭行为已保存'; }
    finally { input.value = behavior.value; }
  });
};
const changeDebugLogging = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const next = input.checked;
  void run(async () => { await host!.setDebugLoggingEnabled(next); debugLoggingEnabled.value = next; message.value = next ? '调试日志已开启' : '调试日志已关闭'; });
};
const exportBackup = () => run(async () => {
  if (await host!.exportBackup(captureEntries(localStorage))) message.value = '备份已导出';
});
const importBackup = () => run(async () => { await host!.importBackup(captureEntries(localStorage)); });
</script>

<template>
  <div class="group">
    <h3 class="group-title">
      窗口与后台运行
    </h3>
    <div class="card desktop-card">
      <div class="row">
        <label for="close-behavior">关闭主窗口时</label>
        <select
          id="close-behavior"
          :value="behavior"
          :disabled="!ready || busy"
          @change="changeBehavior"
        >
          <option value="quit">
            退出应用
          </option>
          <option value="tray">
            隐藏到托盘
          </option>
        </select>
      </div>
      <p>隐藏后闹钟等插件继续运行。托盘“退出”或 Cmd+Q 会退出应用。再次启动会唤起已有工作台。</p>
      <p v-if="ready && !trayAvailable">
        当前系统托盘不可用，关闭窗口将退出应用。
      </p>
    </div>
  </div>
  <div class="group">
    <h3 class="group-title">调试日志</h3>
    <div class="card desktop-card">
      <div class="row">
        <label for="debug-logging">写入详细诊断日志</label>
        <input id="debug-logging" type="checkbox" :checked="debugLoggingEnabled" :disabled="!ready || busy" @change="changeDebugLogging">
      </div>
      <p>日志写入数据目录的 <code>logs/main.log</code>。不会记录密钥、Token、二维码或消息正文。</p>
    </div>
  </div>
  <div class="group">
    <h3 class="group-title">
      数据管理
    </h3>
    <div class="card desktop-card">
      <template v-if="host">
        <strong>数据目录</strong>
        <code>{{ directory || '正在读取…' }}</code>
        <div class="actions">
          <button
            :disabled="!ready || busy"
            @click="run(() => host!.openDirectory())"
          >
            打开目录
          </button>
          <button
            :disabled="!ready || busy"
            @click="exportBackup"
          >
            导出备份
          </button>
          <button
            :disabled="!ready || busy"
            @click="importBackup"
          >
            恢复备份…
          </button>
        </div>
        <p>备份包含插件数据与设置、导航、Widget 布局、工具偏好和关闭行为。AI 和微信配置、密钥、插件安装包与缓存不包含在内。插件数据请勿保存密钥。</p>
        <p>恢复会替换上述数据并重新加载工作台；恢复前自动备份保存在数据目录的 backups 文件夹。</p>
      </template>
      <p v-else>
        请在桌面应用中配置关闭行为和管理数据。
      </p>
      <p
        v-if="message"
        role="status"
        :class="{ error: failed }"
      >
        {{ message }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.desktop-card { padding: 16px; }
.row { display: flex; justify-content: space-between; gap: 16px; }
label, strong { font-size: 13px; }
p { color: var(--text-secondary); font-size: 12px; line-height: 1.7; margin: 10px 0 0; }
code { display: block; overflow-wrap: anywhere; margin-top: 8px; font-size: 12px; user-select: text; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
button, select { padding: 6px 10px; color: var(--text); background: transparent; border: 1px solid var(--hairline); border-radius: 6px; }
button { cursor: pointer; }
button:disabled, select:disabled { opacity: .5; cursor: default; }
.error { color: #d44; }
</style>
