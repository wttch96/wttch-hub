/**
 * 文件说明：适配 macOS 的内存与 Apple GPU 采样口径，避免把文件缓存当成已占用内存或把 GPU 未知值误报为 0%。
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const percentage = (value: number) => Math.max(0, Math.min(100, value));

/** macOS 的 available 已扣除不可回收内存；used 会包含可立即回收的文件缓存。 */
export const macMemoryUsage = (memory: { total: number; available?: number; used: number }) => {
  if (memory.total <= 0) return 0;
  const occupied = typeof memory.available === 'number'
    ? memory.total - memory.available
    : memory.used;
  return percentage(occupied / memory.total * 100);
};

/**
 * Apple Silicon 在 IORegistry 的 AGXAccelerator 节点公开设备利用率。
 * 不同 macOS 版本字段名略有差异，优先取 Device，再回退 Renderer。
 */
export const parseMacGpuUtilization = (output: string): number | undefined => {
  const device = output.match(/"Device Utilization %"\s*=\s*(\d+(?:\.\d+)?)/);
  const renderer = output.match(/"Renderer Utilization %"\s*=\s*(\d+(?:\.\d+)?)/);
  const value = Number(device?.[1] ?? renderer?.[1]);
  return Number.isFinite(value) ? percentage(value) : undefined;
};

/** 无权限、Intel Mac 或未来系统字段变化时返回 undefined，由调用方安全回退。 */
export const macGpuUtilization = async (): Promise<number | undefined> => {
  try {
    const { stdout } = await run('/usr/sbin/ioreg', ['-r', '-d', '1', '-w', '0', '-c', 'IOAccelerator'], {
      timeout: 1_000,
      maxBuffer: 1_000_000,
    });
    return parseMacGpuUtilization(stdout);
  } catch {
    return undefined;
  }
};
