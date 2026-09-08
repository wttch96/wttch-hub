<!--
  文件说明：渲染独立浮动时钟，按插件设置展示时间并处理浮动窗口相关操作。
-->

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { AlarmClock, BellRing, Lock, Pin, PinOff, Unlock, X } from 'lucide-vue-next';
import { PLUGIN_COMPONENT_API_KEY, type PluginComponentApi } from '@wttch-hub/plugin-api';
import { alarmState, nextAlarmOccurrence } from '../store';

const props = withDefaults(defineProps<{
  clock24Hour?: boolean; showSeconds?: boolean; floatingAlwaysOnTop?: boolean; floatingLocked?: boolean;
}>(), { clock24Hour: true, showSeconds: true, floatingAlwaysOnTop: true, floatingLocked: false });
const api = inject<PluginComponentApi>(PLUGIN_COMPONENT_API_KEY);
const now = ref(new Date());
const locked = ref(props.floatingLocked);
const alwaysOnTop = ref(props.floatingAlwaysOnTop);
let timer: ReturnType<typeof setInterval> | undefined;
let alignTimer: ReturnType<typeof setTimeout> | undefined;
/** 对齐系统整秒刷新，避免 setInterval 从任意时刻开始造成近 1 秒的显示滞后。 */
const startClock = () => {
  const tick = () => { now.value = new Date(); };
  tick();
  alignTimer = setTimeout(() => {
    tick();
    timer = setInterval(tick, 1_000);
  }, 1_000 - (Date.now() % 1_000));
};
startClock();
onBeforeUnmount(() => { clearTimeout(alignTimer); clearInterval(timer); });
const time = computed(() => now.value.toLocaleTimeString('zh-CN', {
  hour12: !props.clock24Hour, hour: '2-digit', minute: '2-digit', second: props.showSeconds ? '2-digit' : undefined,
}));
const date = computed(() => now.value.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }));
const nextAlarm = computed(() => alarmState.alarms.filter((alarm) => alarm.enabled)
  .map((alarm) => ({ alarm, next: nextAlarmOccurrence(alarm, now.value) })).filter((item) => item.next)
  .sort((a, b) => a.next!.getTime() - b.next!.getTime())[0]);
const toggleLock = () => { locked.value = !locked.value; api?.settings.update('floatingLocked', locked.value); void api?.host.updateFloatingWidget({ locked: locked.value }).catch(() => undefined); };
const toggleTop = () => { alwaysOnTop.value = !alwaysOnTop.value; api?.settings.update('floatingAlwaysOnTop', alwaysOnTop.value); void api?.host.updateFloatingWidget({ alwaysOnTop: alwaysOnTop.value }).catch(() => undefined); };
const clearReminder = () => api?.storage.delete('activeReminder');
const close = () => void api?.host.closeFloatingWidget().catch(() => undefined);
const dismissReminder = () => { clearReminder(); close(); };
const openWorkbench = () => { clearReminder(); void api?.host.showWorkbench().finally(close); };
let autoClose: ReturnType<typeof setTimeout> | undefined;
watch(() => alarmState.reminder, (reminder) => {
  clearTimeout(autoClose);
  if (!reminder) return;
  const remaining = 60_000 - (Date.now() - reminder.triggeredAt);
  // 过期提醒不应把用户手动打开的普通时钟立即关闭。
  if (remaining <= 0) { clearReminder(); return; }
  autoClose = setTimeout(dismissReminder, remaining);
}, { immediate: true });
onBeforeUnmount(() => clearTimeout(autoClose));
</script>

<template>
  <section class="floating-clock" :class="{ locked, ringing: alarmState.reminder }" @click="alarmState.reminder && openWorkbench()">
    <template v-if="alarmState.reminder"><div class="reminder"><BellRing :size="30" /><span>提醒</span><strong>{{ alarmState.reminder.title }}</strong><p>{{ alarmState.reminder.body }}</p><small>点击打开工作台 · 1 分钟后自动关闭</small></div></template>
    <template v-else>
    <div class="controls"><button type="button" :title="alwaysOnTop ? '取消置顶' : '始终置顶'" @click="toggleTop"><PinOff v-if="alwaysOnTop" :size="13" /><Pin v-else :size="13" /></button><button type="button" :title="locked ? '解锁位置' : '锁定位置'" @click="toggleLock"><Lock v-if="locked" :size="13" /><Unlock v-else :size="13" /></button><button type="button" title="关闭浮动时钟" @click="alarmState.reminder ? dismissReminder() : close()"><X :size="14" /></button></div>
    <div class="eyebrow"><AlarmClock :size="14" />TIME</div>
    <time>{{ time }}</time>
    <div class="date">{{ date }}</div>
    <div v-if="nextAlarm" class="next"><span>{{ nextAlarm.alarm.label }}</span><strong>{{ nextAlarm.next?.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) }}</strong></div>
    <div v-else class="next empty">暂无即将到来的提醒</div>
    </template>
  </section>
</template>

<style scoped>
.floating-clock { position: relative; width: 100%; height: 100%; padding: 22px 24px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--warning) 32%, var(--border)); border-radius: 38px 14px 38px 14px; background: linear-gradient(145deg, color-mix(in srgb, var(--panel) 92%, var(--warning)), color-mix(in srgb, var(--panel) 96%, transparent)); box-shadow: inset 0 1px rgba(255, 255, 255, .25); color: var(--text); -webkit-app-region: drag; user-select: none; }
.floating-clock::after { position: absolute; right: -28px; bottom: -36px; width: 120px; height: 120px; border-radius: 50%; background: color-mix(in srgb, var(--warning) 14%, transparent); content: ''; }
.controls { position: absolute; z-index: 2; top: 12px; right: 14px; display: flex; gap: 3px; -webkit-app-region: no-drag; } .controls button { display: inline-flex; padding: 5px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); cursor: pointer; } .controls button:hover { background: var(--accent-weak); color: var(--warning); }
.eyebrow { display: flex; align-items: center; gap: 5px; color: var(--warning); font-size: 9px; font-weight: 800; letter-spacing: .14em; } time { display: block; margin-top: 8px; font-size: clamp(34px, 15vw, 52px); font-weight: 750; letter-spacing: -.04em; line-height: 1; font-variant-numeric: tabular-nums; } .date { margin-top: 6px; color: var(--text-secondary); font-size: 11px; }
.next { position: absolute; z-index: 1; right: 22px; bottom: 18px; left: 24px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 9px; border-top: 1px solid var(--hairline); font-size: 10px; } .next span { overflow: hidden; color: var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; } .next strong { color: var(--warning); white-space: nowrap; } .next.empty { color: var(--text-secondary); }
.ringing { cursor: pointer; -webkit-app-region: no-drag; } .reminder { display: flex; height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 7px; padding: 0 22px; text-align: center; animation: shake .48s ease-in-out infinite; } .reminder svg { color: var(--warning); } .reminder span, .reminder small { color: var(--text-secondary); font-size: 10px; } .reminder strong { font-size: 19px; } .reminder p { margin: 0; font-size: 13px; } /* 位移限制为 6px，小于 22px 的安全边距，不会被原生窗口裁切。 */ @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
</style>
