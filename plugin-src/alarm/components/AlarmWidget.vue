<!--
  文件说明：以首页 Widget 展示闹钟与时间信息，复用插件存储和用户显示偏好。
-->

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref } from 'vue';
import { AlarmClock, Maximize2, Power } from 'lucide-vue-next';
import { PLUGIN_COMPONENT_API_KEY, type PluginComponentApi } from '@wttch-hub/plugin-api';
import { alarmState, connectAlarmStore, nextAlarmOccurrence, toggleAlarm } from '../store';

const props = withDefaults(defineProps<{
  widgetLimit?: number; clock24Hour?: boolean; showSeconds?: boolean; floatingAlwaysOnTop?: boolean; floatingLocked?: boolean;
}>(), { widgetLimit: 3, clock24Hour: true, showSeconds: true, floatingAlwaysOnTop: true, floatingLocked: false });
const api = inject<PluginComponentApi>(PLUGIN_COMPONENT_API_KEY); connectAlarmStore(api);
const now = ref(new Date()); const timer = setInterval(() => { now.value = new Date(); }, 1000); onBeforeUnmount(() => clearInterval(timer));
const upcoming = computed(() => alarmState.alarms.filter((alarm) => alarm.enabled).map((alarm) => ({ alarm, next: nextAlarmOccurrence(alarm, now.value) })).filter((item) => item.next).sort((a, b) => a.next!.getTime() - b.next!.getTime()).slice(0, Math.max(1, props.widgetLimit)));
const countdown = (date?: Date) => { if (!date) return ''; const seconds = Math.max(0, Math.floor((date.getTime() - now.value.getTime()) / 1000)); const days = Math.floor(seconds / 86400); const hours = Math.floor(seconds % 86400 / 3600); const minutes = Math.floor(seconds % 3600 / 60); return days ? `${days}天 ${hours}小时` : hours ? `${hours}小时 ${minutes}分` : `${minutes}分 ${seconds % 60}秒`; };
const currentTime = computed(() => now.value.toLocaleTimeString('zh-CN', { hour12: !props.clock24Hour, hour: '2-digit', minute: '2-digit', second: props.showSeconds ? '2-digit' : undefined }));
const currentDate = computed(() => now.value.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }));
const openFloating = async () => {
  if (!api) return;
  try {
    const opened = await api.host.openFloatingWidget({ alwaysOnTop: props.floatingAlwaysOnTop, locked: props.floatingLocked });
    api.ui.showToast(opened ? '浮动时钟已打开' : '浮动时钟未能显示', opened ? 'success' : 'error');
  } catch (error) {
    api.ui.showToast(`浮动时钟打开失败：${error instanceof Error ? error.message : String(error)}`, 'error', 5000);
  }
};
</script>

<template>
  <section class="alarm-widget"><header><span><AlarmClock :size="15" />时间与提醒</span><button type="button" title="打开浮动时钟" @click="openFloating"><Maximize2 :size="13" /></button></header><div class="clock-row"><time>{{ currentTime }}</time><span>{{ currentDate }}</span></div><div v-if="upcoming.length" class="alarms"><div v-for="item in upcoming" :key="item.alarm.id"><button type="button" aria-label="关闭闹钟" @click="toggleAlarm(item.alarm.id)"><Power :size="13" /></button><span><strong>{{ item.alarm.label }}</strong><small>{{ item.next?.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) }}</small></span><time>{{ countdown(item.next) }}</time></div></div><div v-else class="empty"><span>暂无开启的闹钟</span></div></section>
</template>

<style scoped>
.alarm-widget { height: 100%; padding: 12px 16px; color: var(--text); } header, header span, .clock-row, .alarms > div, .empty { display: flex; align-items: center; } header { justify-content: space-between; padding-right: 96px; } header span { gap: 6px; color: var(--text-secondary); font-size: 10px; font-weight: 600; } header span svg { color: var(--warning); } header > button { position: relative; z-index: 3; display: inline-flex; padding: 4px; border: 0; border-radius: 5px; background: transparent; color: var(--warning); cursor: pointer; } header > button:hover { background: var(--accent-weak); }
.clock-row { gap: 9px; margin-top: 4px; } .clock-row time { color: var(--text); font-size: 25px; font-weight: 700; letter-spacing: -.03em; font-variant-numeric: tabular-nums; } .clock-row span { color: var(--text-secondary); font-size: 9px; }
.alarms { margin-top: 3px; } .alarms > div { gap: 7px; padding: 3px 0; border-top: 1px solid var(--hairline); } .alarms button { display: inline-flex; padding: 3px; border: 0; background: transparent; color: var(--warning); cursor: pointer; } .alarms span { display: flex; flex: 1; min-width: 0; flex-direction: column; } .alarms strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; } .alarms small { color: var(--text-secondary); font-size: 8px; } .alarms time { color: var(--warning); font-size: 9px; font-variant-numeric: tabular-nums; } .empty { justify-content: flex-start; height: 24px; border-top: 1px solid var(--hairline); color: var(--text-secondary); font-size: 9px; }
</style>
