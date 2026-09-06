/**
 * 文件说明：管理闹钟数据与变更订阅，运行到期检查调度器，并发布桌面通知和可订阅的闹钟服务结果。
 */

import { reactive, readonly } from 'vue';
import type { Disposable, PluginComponentApi } from '@wttch-hub/plugin-api';

import { dueKey, isAlarmRepeat, isAlarmTime, type AlarmItem, type AlarmRepeat } from './schedule';

// 保持原有组件导入路径兼容，时间算法本身集中在无副作用的 schedule 模块。
export { nextAlarmOccurrence } from './schedule';
export type { AlarmItem, AlarmRepeat } from './schedule';

const state = reactive({ alarms: [] as AlarmItem[], initialized: false });
let api: PluginComponentApi | undefined;
let subscription: Disposable | undefined;
let timer: ReturnType<typeof setInterval> | undefined;

/**
 * 持久化数据不受 TypeScript 约束，旧版本或外部窗口都可能写入不完整记录。
 * 在进入响应式状态前校验调度所需字段，防止缺少 time 的数据中断整个定时器。
 */
const validAlarms = (value: unknown): AlarmItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AlarmItem => {
    if (!item || typeof item !== 'object') return false;
    return typeof item.id === 'string' && typeof item.label === 'string'
      && typeof item.enabled === 'boolean' && typeof item.createdAt === 'string'
      && isAlarmRepeat(item.repeat)
      && (item.repeat === 'once'
        ? typeof item.dateTime === 'string' && Number.isFinite(new Date(item.dateTime).getTime()) && typeof item.time === 'string'
        : isAlarmTime(item.time));
  });
};

export const connectAlarmStore = (nextApi?: PluginComponentApi) => {
  if (!nextApi) return;
  api = nextApi;
  // 无订阅表示首次连接或卸载后重连：重新读取存储，接收离线期间其他窗口的改动。
  if (!subscription) {
    state.alarms = validAlarms(api.storage.get<unknown>('alarms', []));
    state.initialized = true;
  }
  if (!subscription) subscription = api.storage.onDidChange((key, value) => {
    if (key === 'alarms') state.alarms = validAlarms(value);
  });
};

const persist = () => api?.storage.update('alarms', state.alarms.map((alarm) => ({ ...alarm })));
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const alarmState = readonly(state);
export const addAlarm = (input: { label: string; repeat: AlarmRepeat; dateTime?: string; time: string }) => {
  if (!isAlarmRepeat(input.repeat)) return false;
  const label = input.label.trim() || '闹钟提醒';
  if (input.repeat === 'once' && !input.dateTime) return false;
  if (input.repeat === 'once') {
    const timestamp = new Date(input.dateTime!).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return false;
  }
  if (input.repeat !== 'once' && !isAlarmTime(input.time)) return false;
  state.alarms.push({ id: makeId(), label, repeat: input.repeat, dateTime: input.dateTime || undefined,
    time: input.repeat === 'once' ? (input.dateTime?.slice(11, 16) ?? '') : input.time,
    enabled: true, createdAt: new Date().toISOString() });
  persist(); return true;
};
export const toggleAlarm = (id: string) => { const alarm = state.alarms.find((item) => item.id === id); if (alarm) { alarm.enabled = !alarm.enabled; alarm.lastTriggeredKey = undefined; persist(); } };
export const removeAlarm = (id: string) => { state.alarms = state.alarms.filter((alarm) => alarm.id !== id); persist(); };

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
      // 先记录触发结果再发送通知，防止当前调度器在下一次 tick 重复提醒。
      // 此记录不具备跨窗口原子锁能力；浮动窗口应继续使用 schedule=false。
      alarm.lastTriggeredKey = key;
      if (alarm.repeat === 'once') alarm.enabled = false;
      persist();
      pluginApi.ui.showToast(`闹钟：${alarm.label}`, 'success', 10000);
      // 只发布业务结果，是否外发以及发给谁由宿主订阅决定；无订阅不会发送微信消息。
      void pluginApi.services.publish('triggered', {
        id: `${alarm.id}-${key}`, title: `闹钟：${alarm.label}`,
        text: alarm.repeat === 'once' ? '设定的提醒时间已到' : `重复闹钟 · ${alarm.time}`,
      });
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
