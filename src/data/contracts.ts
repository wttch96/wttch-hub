/**
 * 文件说明：定义桌面数据管理的跨进程桥接契约，包括关闭偏好、目录访问、备份导出和恢复确认。
 */

import type { Backup, CloseBehavior } from './backup';
export interface DesktopBridge {
  info(): Promise<{ directory: string; closeBehavior: CloseBehavior; trayAvailable: boolean; debugLoggingEnabled: boolean }>;
  setCloseBehavior(value: CloseBehavior): Promise<void>;
  setDebugLoggingEnabled(value: boolean): Promise<void>;
  openDirectory(): Promise<void>;
  exportBackup(entries: Record<string, string>): Promise<boolean>;
  importBackup(entries: Record<string, string>): Promise<boolean>;
  pendingRestore(): Promise<Backup | null>;
  finishRestore(): Promise<void>;
}
