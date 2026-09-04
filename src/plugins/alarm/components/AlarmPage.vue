<script setup lang="ts">
import { computed, inject, onBeforeUnmount, reactive, ref } from 'vue';
import { AlarmClock, Bell, CalendarClock, Clock3, Maximize2, Power, Trash2 } from 'lucide-vue-next';
import { PLUGIN_COMPONENT_API_KEY, type PluginComponentApi } from '@wttch-hub/plugin-api';
import { addAlarm, alarmState, connectAlarmStore, nextAlarmOccurrence, removeAlarm, toggleAlarm, type AlarmRepeat } from '../store';

const api = inject<PluginComponentApi>(PLUGIN_COMPONENT_API_KEY); connectAlarmStore(api);
const tomorrow = new Date(Date.now() + 60 * 60 * 1000);
tomorrow.setSeconds(0, 0);
const localDateTime = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const draft = reactive({ label: '', repeat: 'once' as AlarmRepeat, dateTime: localDateTime(tomorrow), time: '09:00' });
const now = ref(new Date());
const timer = setInterval(() => { now.value = new Date(); }, 1000);
onBeforeUnmount(() => clearInterval(timer));
const repeats: Array<{ id: AlarmRepeat; label: string }> = [{ id: 'once', label: '仅一次' }, { id: 'daily', label: '每天' }, { id: 'weekdays', label: '工作日' }];
const sorted = computed(() => [...alarmState.alarms].sort((a, b) => (nextAlarmOccurrence(a, now.value)?.getTime() ?? Infinity) - (nextAlarmOccurrence(b, now.value)?.getTime() ?? Infinity)));
const enabledCount = computed(() => alarmState.alarms.filter((alarm) => alarm.enabled).length);
const submit = () => {
  if (!addAlarm(draft)) { api?.ui.showToast('请选择有效的未来时间', 'error'); return; }
  draft.label = ''; api?.ui.showToast('闹钟已创建', 'success');
};
const formatDate = (date?: Date) => date ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date) : '暂无下一次提醒';
const repeatLabel = (repeat: AlarmRepeat) => ({ once: '仅一次', daily: '每天', weekdays: '工作日' }[repeat]);
const openFloatingClock = async () => {
  if (!api) return;
  try {
    const opened = await api.host.openFloatingWidget({
      alwaysOnTop: api.settings.get('floatingAlwaysOnTop', true),
      locked: api.settings.get('floatingLocked', false),
    });
    api.ui.showToast(opened ? '浮动时钟已打开' : '浮动时钟未能显示', opened ? 'success' : 'error');
  } catch (error) {
    api.ui.showToast(`浮动时钟打开失败：${error instanceof Error ? error.message : String(error)}`, 'error', 5000);
  }
};
</script>

<template>
  <section class="alarm-page">
    <header><div><span>TIME & REMINDERS</span><h2><AlarmClock :size="24" />闹钟提醒</h2><p>工具页关闭后，插件仍会在后台检查提醒时间。</p></div><div class="clock"><strong>{{ now.toLocaleTimeString('zh-CN', { hour12: false }) }}</strong><span>{{ enabledCount }} 个闹钟已开启</span><button type="button" @click="openFloatingClock"><Maximize2 :size="13" />打开浮动时钟</button></div></header>
    <form class="composer card" @submit.prevent="submit"><input v-model="draft.label" maxlength="120" placeholder="提醒内容，例如：站起来活动" aria-label="提醒内容"><div class="segments"><button v-for="item in repeats" :key="item.id" type="button" :class="{ active: draft.repeat === item.id }" @click="draft.repeat = item.id">{{ item.label }}</button></div><label v-if="draft.repeat === 'once'"><CalendarClock :size="15" /><input v-model="draft.dateTime" type="datetime-local" aria-label="提醒日期和时间"></label><label v-else><Clock3 :size="15" /><input v-model="draft.time" type="time" aria-label="提醒时间"></label><button class="primary" type="submit"><Bell :size="15" />创建提醒</button></form>
    <div v-if="sorted.length" class="alarm-list"><article v-for="alarm in sorted" :key="alarm.id" class="alarm-item card" :class="{ disabled: !alarm.enabled }"><button class="power" type="button" :aria-label="alarm.enabled ? '关闭闹钟' : '开启闹钟'" @click="toggleAlarm(alarm.id)"><Power :size="17" /></button><div><div class="alarm-title"><strong>{{ alarm.label }}</strong><span>{{ repeatLabel(alarm.repeat) }}</span></div><time>{{ formatDate(nextAlarmOccurrence(alarm, now)) }}</time></div><button class="delete" type="button" aria-label="删除闹钟" @click="removeAlarm(alarm.id)"><Trash2 :size="15" /></button></article></div>
    <div v-else class="empty"><AlarmClock :size="32" /><strong>还没有闹钟</strong><span>选择提醒方式和时间，创建第一条提醒。</span></div>
  </section>
</template>

<style scoped>
.alarm-page { max-width: 900px; margin: 0 auto; padding: 24px 26px 60px; color: var(--text); } header, header h2, .composer, .composer label, .alarm-item, .alarm-title { display: flex; align-items: center; } header { justify-content: space-between; gap: 20px; } header > div:first-child > span { color: var(--text-secondary); font-size: 9px; font-weight: 700; letter-spacing: .12em; } header h2 { gap: 8px; margin: 4px 0 0; font-size: 24px; } header h2 svg { color: var(--warning); } header p { margin: 5px 0 0; color: var(--text-secondary); font-size: 12px; } .clock { display: flex; align-items: flex-end; flex-direction: column; text-align: right; } .clock strong { display: block; font-size: 25px; font-variant-numeric: tabular-nums; } .clock span { color: var(--text-secondary); font-size: 10px; } .clock button { display: inline-flex; align-items: center; gap: 4px; margin-top: 7px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 7px; background: var(--panel); color: var(--warning); font-size: 10px; cursor: pointer; }
.composer { gap: 10px; margin-top: 20px; padding: 14px; } input, button { font: inherit; } .composer > input { min-width: 0; flex: 1; padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px; outline: 0; background: var(--content-bg); color: var(--text); } .composer label { gap: 5px; color: var(--text-secondary); } input[type="datetime-local"], input[type="time"] { padding: 7px; border: 1px solid var(--border); border-radius: 7px; background: var(--content-bg); color: var(--text); font-size: 11px; }
.segments { display: inline-flex; flex: 0 0 auto; padding: 2px; border: 1px solid var(--border); border-radius: 8px; background: var(--content-bg); } .segments button { padding: 5px 8px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); font-size: 10px; cursor: pointer; } .segments button.active { background: var(--panel); color: var(--warning); box-shadow: 0 1px 4px var(--hairline); } .primary { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto; padding: 8px 11px; border: 0; border-radius: 7px; background: var(--warning); color: #fff; font-weight: 600; cursor: pointer; }
.alarm-list { display: grid; gap: 8px; margin-top: 16px; } .alarm-item { gap: 11px; padding: 14px; } .alarm-item > div { flex: 1; } .power, .delete { display: inline-flex; padding: 5px; border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; } .power { color: var(--warning); } .delete:hover { color: var(--danger); } .alarm-title { gap: 7px; } .alarm-title span { padding: 2px 6px; border-radius: 5px; background: color-mix(in srgb, var(--warning) 14%, transparent); color: var(--warning); font-size: 9px; } .alarm-item time { display: block; margin-top: 5px; color: var(--text-secondary); font-size: 11px; font-variant-numeric: tabular-nums; } .alarm-item.disabled { opacity: .5; } .alarm-item.disabled .power { color: var(--text-secondary); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 55px; color: var(--text-secondary); } .empty svg { color: var(--warning); } .empty strong { color: var(--text); } .empty span { font-size: 11px; }
@media (max-width: 800px) { .composer { align-items: stretch; flex-direction: column; } .primary { justify-content: center; } }
</style>
