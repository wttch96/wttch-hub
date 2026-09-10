import assert from 'node:assert/strict';
import { test } from 'node:test';
import { macMemoryUsage, parseMacGpuUtilization } from '../src/system/macosStats';

test('macOS 内存占用排除可回收的文件缓存', () => {
  assert.equal(macMemoryUsage({ total: 16_000, used: 15_800, available: 12_000 }), 25);
  assert.equal(macMemoryUsage({ total: 16_000, used: 4_000 }), 25);
});

test('读取 Apple GPU 的 Device Utilization，并兼容旧版 Renderer 字段', () => {
  assert.equal(parseMacGpuUtilization('"Device Utilization %" = 68'), 68);
  assert.equal(parseMacGpuUtilization('"Renderer Utilization %" = 37.5'), 37.5);
  assert.equal(parseMacGpuUtilization('GPU unavailable'), undefined);
});
