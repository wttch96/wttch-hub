import { reactive, readonly } from 'vue';
import type { Disposable, PluginComponentApi } from '@wttch-hub/plugin-api';

export type AlarmRepeat = 'once' | 'daily' | 'weekdays';
export type AlarmItem = {
  id: string;
  label: string;
  repeat: AlarmRepeat;
  dateTime?: string;
  time: string;
  enabled: boolean;
  createdAt: string;
  lastTriggeredKey?: string;
};

const state = reactive({ alarms: [] as AlarmItem[], initialized: false });
let api: PluginComponentApi | undefined;
let subscription: Disposable | undefined;
let timer: ReturnType<typeof setInterval> | undefined;

const validAlarms = (value: unknown): AlarmItem[] => Array.isArray(value)
  ? value.filter((item): item is AlarmItem => Boolean(item && typeof item === 'object'
    && typeof (item as AlarmItem).id === 'string' && typeof (item as AlarmItem).label === 'string'))
  : [];

export const connectAlarmStore = (nextApi?: PluginComponentApi) => {
  if (!nextApi) return;
  api = nextApi;
  if (!state.initialized) {
    state.alarms = validAlarms(api.storage.get<unknown>('alarms', []));
    state.initialized = true;
  }
  if (!subscription) subscription = api.storage.onDidChange((key, value) => {
    if (key === 'alarms') state.alarms = validAlarms(value);
  });
};

const persist = () => api?.storage.update('alarms', state.alarms.map((alarm) => ({ ...alarm })));
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const atTime = (date: Date, time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  const result = new Date(date); result.setHours(hour || 0, minute || 0, 0, 0); return result;
};
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const alarmState = readonly(state);
export const nextAlarmOccurrence = (alarm: AlarmItem, from = new Date()): Date | undefined => {
  if (!alarm.enabled) return undefined;
  if (alarm.repeat === 'once') {
    const date = new Date(alarm.dateTime ?? '');
    return Number.isNaN(date.getTime()) || date.getTime() <= from.getTime() ? undefined : date;
  }
  for (let offset = 0; offset <= 7; offset += 1) {
    const day = new Date(from); day.setDate(from.getDate() + offset);
    if (alarm.repeat === 'weekdays' && (day.getDay() === 0 || day.getDay() === 6)) continue;
    const candidate = atTime(day, alarm.time);
    if (candidate.getTime() > from.getTime()) return candidate;
  }
  return undefined;
};
export const addAlarm = (input: { label: string; repeat: AlarmRepeat; dateTime?: string; time: string }) => {
  const label = input.label.trim() || '闹钟提醒';
  if (input.repeat === 'once' && !input.dateTime) return false;
  if (input.repeat === 'once') {
    const timestamp = new Date(input.dateTime!).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return false;
  }
  if (input.repeat !== 'once' && !/^\d{2}:\d{2}$/.test(input.time)) return false;
  state.alarms.push({ id: makeId(), label, repeat: input.repeat, dateTime: input.dateTime || undefined,
    time: input.repeat === 'once' ? (input.dateTime?.slice(11, 16) ?? '') : input.time,
    enabled: true, createdAt: new Date().toISOString() });
  persist(); return true;
};
export const toggleAlarm = (id: string) => { const alarm = state.alarms.find((item) => item.id === id); if (alarm) { alarm.enabled = !alarm.enabled; alarm.lastTriggeredKey = undefined; persist(); } };
export const removeAlarm = (id: string) => { state.alarms = state.alarms.filter((alarm) => alarm.id !== id); persist(); };

const dueKey = (alarm: AlarmItem, now: Date, graceMs: number) => {
  if (!alarm.enabled) return undefined;
  if (alarm.repeat === 'once') {
    const due = new Date(alarm.dateTime ?? '');
    const distance = now.getTime() - due.getTime();
    return Number.isFinite(due.getTime()) && distance >= 0 && distance <= graceMs ? `once:${due.getTime()}` : undefined;
  }
  if (alarm.repeat === 'weekdays' && (now.getDay() === 0 || now.getDay() === 6)) return undefined;
  const scheduled = atTime(now, alarm.time);
  const distance = now.getTime() - scheduled.getTime();
  return distance >= 0 && distance <= graceMs ? `${alarm.repeat}:${dayKey(now)}:${alarm.time}` : undefined;
};

export const startAlarmScheduler = (pluginApi: PluginComponentApi, schedule = true) => {
  connectAlarmStore(pluginApi);
  clearInterval(timer);
  const cleanup = () => { clearInterval(timer); timer = undefined; subscription?.dispose(); subscription = undefined; api = undefined; };
  if (!schedule) return cleanup;
  const tick = () => {
    const now = new Date();
    const graceMs = Math.max(0, Number(pluginApi.settings.get('graceMinutes', 10))) * 60_000;
    for (const alarm of state.alarms) {
      const key = dueKey(alarm, now, graceMs);
      if (!key || alarm.lastTriggeredKey === key) continue;
      alarm.lastTriggeredKey = key;
      if (alarm.repeat === 'once') alarm.enabled = false;
      persist();
      pluginApi.ui.showToast(`闹钟：${alarm.label}`, 'success', 10000);
      void pluginApi.host.showNotification({
        title: alarm.label,
        body: alarm.repeat === 'once' ? '设定的提醒时间已到' : `重复闹钟 · ${alarm.time}`,
        silent: pluginApi.settings.get('silent', false),
      }).catch(() => undefined);
    }
  };
  tick();
  timer = setInterval(tick, 1000);
  return cleanup;
};
