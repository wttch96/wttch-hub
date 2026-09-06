/**
 * 文件说明：验证闹钟重复规则、时间边界和触发判定，保证调度计算在关键时间点正确。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dueKey, isAlarmTime, nextAlarmOccurrence, type AlarmItem } from '../plugin-src/alarm/schedule';

const alarm = (overrides: Partial<AlarmItem> = {}): AlarmItem => ({
  id: 'test', label: '测试', repeat: 'daily', time: '23:59', enabled: true,
  createdAt: '2026-09-04', ...overrides,
});

test('时间校验拒绝越界、缺失和不规范输入', () => {
  for (const value of ['24:00', '25:99', '12:60', '1:00', '', undefined, null]) {
    assert.equal(isAlarmTime(value), false);
  }
  for (const value of ['00:00', '12:30', '23:59']) assert.equal(isAlarmTime(value), true);
});

test('跨午夜补发保留前一天的去重键，并遵守补偿窗口', () => {
  const now = new Date(2026, 8, 5, 0, 3);
  assert.equal(dueKey(alarm(), now, 10 * 60_000), 'daily:2026-09-04:23:59');
  assert.equal(dueKey(alarm(), now, 3 * 60_000), undefined);
  assert.equal(dueKey(alarm(), now, NaN), undefined);
});

test('周六可补发周五提醒，周末不会生成新的工作日提醒', () => {
  const weekday = alarm({ repeat: 'weekdays' });
  assert.equal(dueKey(weekday, new Date(2026, 8, 5, 0, 3), 600_000), 'weekdays:2026-09-04:23:59');
  assert.equal(dueKey(weekday, new Date(2026, 8, 6, 0, 3), 600_000), undefined);
  assert.equal(nextAlarmOccurrence(weekday, new Date(2026, 8, 4, 23, 59))?.getTime(), new Date(2026, 8, 7, 23, 59).getTime());
});

test('一次性提醒遵守触发边界，禁用和损坏数据不参与调度', () => {
  const once = alarm({ repeat: 'once', dateTime: new Date(2026, 8, 5, 10).toISOString() });
  const now = new Date(2026, 8, 5, 10);
  assert.ok(dueKey(once, now, 0));
  assert.equal(dueKey(once, new Date(now.getTime() - 1), 600_000), undefined);
  assert.equal(nextAlarmOccurrence(once, now), undefined);
  assert.equal(dueKey(alarm({ enabled: false }), now, 600_000), undefined);
  assert.equal(nextAlarmOccurrence(alarm({ time: '25:99' }), now), undefined);
  assert.equal(dueKey(alarm({ time: undefined }), now, 600_000), undefined);
});
