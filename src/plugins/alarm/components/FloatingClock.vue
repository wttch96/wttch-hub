<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref } from 'vue';
import { AlarmClock, Lock, Pin, PinOff, Unlock, X } from 'lucide-vue-next';
import { PLUGIN_COMPONENT_API_KEY, type PluginComponentApi } from '@wttch-hub/plugin-api';
import { alarmState, nextAlarmOccurrence } from '../store';

const props = withDefaults(defineProps<{
  clock24Hour?: boolean; showSeconds?: boolean; floatingAlwaysOnTop?: boolean; floatingLocked?: boolean;
}>(), { clock24Hour: true, showSeconds: true, floatingAlwaysOnTop: true, floatingLocked: false });
const api = inject<PluginComponentApi>(PLUGIN_COMPONENT_API_KEY);
const now = ref(new Date());
const locked = ref(props.floatingLocked);
const alwaysOnTop = ref(props.floatingAlwaysOnTop);
const timer = setInterval(() => { now.value = new Date(); }, 1000);
onBeforeUnmount(() => clearInterval(timer));
const time = computed(() => now.value.toLocaleTimeString('zh-CN', {
  hour12: !props.clock24Hour, hour: '2-digit', minute: '2-digit', second: props.showSeconds ? '2-digit' : undefined,
}));
const date = computed(() => now.value.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }));
const nextAlarm = computed(() => alarmState.alarms.filter((alarm) => alarm.enabled)
  .map((alarm) => ({ alarm, next: nextAlarmOccurrence(alarm, now.value) })).filter((item) => item.next)
  .sort((a, b) => a.next!.getTime() - b.next!.getTime())[0]);
const toggleLock = () => { locked.value = !locked.value; api?.settings.update('floatingLocked', locked.value); void api?.host.updateFloatingWidget({ locked: locked.value }).catch(() => undefined); };
const toggleTop = () => { alwaysOnTop.value = !alwaysOnTop.value; api?.settings.update('floatingAlwaysOnTop', alwaysOnTop.value); void api?.host.updateFloatingWidget({ alwaysOnTop: alwaysOnTop.value }).catch(() => undefined); };
const close = () => void api?.host.closeFloatingWidget().catch(() => undefined);
</script>

<template>
  <section class="floating-clock" :class="{ locked }">
    <div class="controls"><button type="button" :title="alwaysOnTop ? '取消置顶' : '始终置顶'" @click="toggleTop"><PinOff v-if="alwaysOnTop" :size="13" /><Pin v-else :size="13" /></button><button type="button" :title="locked ? '解锁位置' : '锁定位置'" @click="toggleLock"><Lock v-if="locked" :size="13" /><Unlock v-else :size="13" /></button><button type="button" title="关闭浮动时钟" @click="close"><X :size="14" /></button></div>
    <div class="eyebrow"><AlarmClock :size="14" />TIME</div>
    <time>{{ time }}</time>
    <div class="date">{{ date }}</div>
    <div v-if="nextAlarm" class="next"><span>{{ nextAlarm.alarm.label }}</span><strong>{{ nextAlarm.next?.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) }}</strong></div>
    <div v-else class="next empty">暂无即将到来的提醒</div>
  </section>
</template>

<style scoped>
.floating-clock { position: relative; width: 100%; height: 100%; padding: 22px 24px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--warning) 32%, var(--border)); border-radius: 38px 14px 38px 14px; background: linear-gradient(145deg, color-mix(in srgb, var(--panel) 92%, var(--warning)), color-mix(in srgb, var(--panel) 96%, transparent)); box-shadow: inset 0 1px rgba(255, 255, 255, .25); color: var(--text); -webkit-app-region: drag; user-select: none; }
.floating-clock::after { position: absolute; right: -28px; bottom: -36px; width: 120px; height: 120px; border-radius: 50%; background: color-mix(in srgb, var(--warning) 14%, transparent); content: ''; }
.controls { position: absolute; z-index: 2; top: 12px; right: 14px; display: flex; gap: 3px; -webkit-app-region: no-drag; } .controls button { display: inline-flex; padding: 5px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); cursor: pointer; } .controls button:hover { background: var(--accent-weak); color: var(--warning); }
.eyebrow { display: flex; align-items: center; gap: 5px; color: var(--warning); font-size: 9px; font-weight: 800; letter-spacing: .14em; } time { display: block; margin-top: 8px; font-size: clamp(34px, 15vw, 52px); font-weight: 750; letter-spacing: -.04em; line-height: 1; font-variant-numeric: tabular-nums; } .date { margin-top: 6px; color: var(--text-secondary); font-size: 11px; }
.next { position: absolute; z-index: 1; right: 22px; bottom: 18px; left: 24px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 9px; border-top: 1px solid var(--hairline); font-size: 10px; } .next span { overflow: hidden; color: var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; } .next strong { color: var(--warning); white-space: nowrap; } .next.empty { color: var(--text-secondary); }
</style>
