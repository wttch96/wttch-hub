/**
 * 文件说明：读取和原子保存桌面关闭偏好，并判断关闭窗口时是否应隐藏到可用的系统托盘。
 */

import fs from 'node:fs';
import path from 'node:path';
import type { CloseBehavior } from '../data/backup';
/** 临时文件与目标放在同一目录，写完再替换，避免进程意外退出损坏配置。 */
export function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  try { fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600 }); fs.renameSync(temporary, file); }
  finally { fs.rmSync(temporary, { force: true }); }
}
export function createPreferences(directory: string) {
  const file = path.join(directory, 'desktop-config.json');
  let closeBehavior: CloseBehavior = 'quit';
  try { if (JSON.parse(fs.readFileSync(file, 'utf8')).closeBehavior === 'tray') closeBehavior = 'tray'; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('[desktop] 配置读取失败，使用关闭时退出', error); }
  return {
    get: () => closeBehavior,
    set(value: unknown) {
      if (value !== 'quit' && value !== 'tray') throw new Error('无效的关闭行为');
      writeJson(file, { closeBehavior: value });
      closeBehavior = value;
    },
  };
}
/** 真正退出（含 Cmd+Q、托盘退出）必须绕过隐藏逻辑；无托盘时也不能隐藏到不可达状态。 */
export const shouldHideOnClose = (behavior: CloseBehavior, quitting: boolean, trayAvailable: boolean) => behavior === 'tray' && !quitting && trayAvailable;
