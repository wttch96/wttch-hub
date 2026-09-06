/**
 * 文件说明：提供闹钟时间校验、重复规则和到期判断等纯计算逻辑，不直接读写存储或发送通知。
 */

/**
 * 闹钟领域逻辑：只负责校验和本地时间计算，不访问 Vue、存储或通知接口。
 * 调用方传入当前时间，便于稳定验证午夜、周末和补提醒窗口等边界。
 */
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

/** 必须同时限制格式和数值范围，避免 Date.setHours 将 25:99 自动滚动到次日。 */
export const isAlarmTime = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const isAlarmRepeat = (value: unknown): value is AlarmRepeat =>
  value === 'once' || value === 'daily' || value === 'weekdays';

/** 在本地日历上设置时分；不使用 UTC 日期字符串，避免时区导致提醒日期偏移。 */
const atTime = (date: Date, time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
};
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const isScheduledDay = (alarm: AlarmItem, date: Date) =>
  alarm.repeat !== 'weekdays' || (date.getDay() !== 0 && date.getDay() !== 6);

/** 返回严格晚于 from 的下一次提醒；每天/工作日最多查找未来一周。 */
export const nextAlarmOccurrence = (alarm: AlarmItem, from = new Date()): Date | undefined => {
  if (!alarm.enabled || !isAlarmRepeat(alarm.repeat)) return undefined;
  if (alarm.repeat === 'once') {
    const date = new Date(alarm.dateTime ?? '');
    return Number.isNaN(date.getTime()) || date.getTime() <= from.getTime() ? undefined : date;
  }
  if (!isAlarmTime(alarm.time)) return undefined;
  for (let offset = 0; offset <= 7; offset += 1) {
    const day = new Date(from); day.setDate(from.getDate() + offset);
    if (!isScheduledDay(alarm, day)) continue;
    const candidate = atTime(day, alarm.time);
    if (candidate.getTime() > from.getTime()) return candidate;
  }
  return undefined;
};
/**
 * 返回最近一次应补发提醒的去重键；未到时间或超出补偿窗口时返回 undefined。
 * 重复提醒从今天向前查找最近一个有效日，工作日判断使用计划日期。
 * 例如周六 00:03 仍可补发周五 23:59 的提醒，不能直接按“今天是周末”跳过。
 * 去重键保留计划日而非触发日，让午夜前后执行的 tick 识别为同一次提醒。
 */
export const dueKey = (alarm: AlarmItem, now: Date, graceMs: number): string | undefined => {
  if (!alarm.enabled || !isAlarmRepeat(alarm.repeat) || !Number.isFinite(graceMs) || graceMs < 0) return undefined;
  if (alarm.repeat === 'once') {
    const timestamp = new Date(alarm.dateTime ?? '').getTime();
    const distance = now.getTime() - timestamp;
    return Number.isFinite(timestamp) && distance >= 0 && distance <= graceMs ? `once:${timestamp}` : undefined;
  }
  if (!isAlarmTime(alarm.time)) return undefined;
  for (let offset = 0; offset <= 7; offset += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - offset);
    if (!isScheduledDay(alarm, day)) continue;
    const scheduled = atTime(day, alarm.time);
    const distance = now.getTime() - scheduled.getTime();
    if (distance < 0) continue;
    // 只补发最近一次；更早的日期只会离当前时间更远，无需继续扫描。
    return distance <= graceMs ? `${alarm.repeat}:${dayKey(day)}:${alarm.time}` : undefined;
  }
  return undefined;
};
