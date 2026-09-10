/**
 * 文件说明：在主进程校验数据管理请求，通过原生对话框导出或导入备份，保存恢复前快照并安排页面重载。
 */

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_KEYS, MAX_BACKUP_BYTES, validateBackup } from './backup';
import { createPreferences, writeJson } from '../desktop/preferences';
import { debugError, debugLog, setDebugLoggingEnabled } from '../desktop/logger';

/** 文件路径只由原生对话框或宿主决定，渲染器不能传任意路径读写磁盘。 */
export function registerDataIpc(isAppUrl: (url: string) => boolean, preferences: ReturnType<typeof createPreferences>, trayAvailable: () => boolean, closeWidgets: () => void) {
  const directory = app.getPath('userData');
  const pendingFile = path.join(directory, 'pending-restore.json');
  let busy = false;
  const snapshot = (entries: unknown) => validateBackup({ format: 'wttch-hub-backup', version: 1, createdAt: new Date().toISOString(), closeBehavior: preferences.get(), entries });
  const readPending = () => fs.existsSync(pendingFile) ? validateBackup(JSON.parse(fs.readFileSync(pendingFile, 'utf8'))) : null;
  const handle = (name: string, action: (window: BrowserWindow, input: unknown) => unknown) => ipcMain.handle(`desktop:${name}`, (event, input: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || event.senderFrame !== event.sender.mainFrame || !isAppUrl(event.senderFrame.url)
      || new URL(event.senderFrame.url).hash.startsWith('#/floating/')) throw new Error('请在主工作台管理数据');
    return action(window, input);
  });
  handle('info', () => ({ directory, closeBehavior: preferences.get(), trayAvailable: trayAvailable(), debugLoggingEnabled: preferences.getDebugLoggingEnabled() }));
  handle('close-behavior', (_window, input) => { preferences.set(input); debugLog('desktop', 'close behavior changed', { behavior: input }); });
  handle('debug-logging', (_window, input) => {
    preferences.setDebugLoggingEnabled(input);
    setDebugLoggingEnabled(input as boolean);
    debugLog('desktop', 'debug logging setting changed', { enabled: input });
  });
  handle('open-directory', async () => { const error = await shell.openPath(directory); if (error) throw new Error(error); });
  handle('export', async (window, input) => {
    if (busy) throw new Error('已有数据操作正在进行');
    busy = true;
    try {
      const backup = snapshot(input);
      const result = await dialog.showSaveDialog(window, { title: '导出工作台备份', defaultPath: `wttch-hub-${Date.now()}.json`, filters: [{ name: '工作台备份', extensions: ['json'] }] });
      if (result.canceled || !result.filePath) return false;
      writeJson(result.filePath, backup);
      return true;
    } finally { busy = false; }
  });
  handle('import', async (window, input) => {
    if (busy) throw new Error('已有数据操作正在进行');
    busy = true;
    try {
      snapshot(input); // 先校验调用参数；真正的恢复前快照在用户确认后重新读取。
      const selected = await dialog.showOpenDialog(window, { title: '恢复工作台备份', properties: ['openFile'], filters: [{ name: '工作台备份', extensions: ['json'] }] });
      if (selected.canceled || !selected.filePaths[0]) return false;
      const file = selected.filePaths[0];
      if (fs.statSync(file).size > MAX_BACKUP_BYTES) throw new Error('备份超过 10 MB 限制');
      const backup = validateBackup(JSON.parse(fs.readFileSync(file, 'utf8')));
      const confirmation = await dialog.showMessageBox(window, { type: 'warning', title: '恢复数据', message: '用备份替换当前业务数据？', detail: `备份时间：${backup.createdAt}\n将替换插件数据与设置、导航、布局及关闭行为。AI 配置和密钥不受影响。浮动窗口会关闭，工作台会重新加载。恢复前备份将保存在数据目录的 backups 文件夹。`, buttons: ['取消', '恢复'], defaultId: 0, cancelId: 0 });
      if (confirmation.response !== 1) return false;
      // 文件选择和确认期间插件可能继续写数据，不能把打开对话框前的旧快照当成恢复前备份。
      // 脚本只读取固定白名单，不包含文件内容、用户输入或任意代码参数。
      if (window.isDestroyed() || !isAppUrl(window.webContents.getURL())) throw new Error('工作台页面已变化，请重试');
      const currentEntries = await window.webContents.executeJavaScript(`Object.fromEntries(${JSON.stringify(DATA_KEYS)}.flatMap(key => { const value = localStorage.getItem(key); return value === null ? [] : [[key, value]]; }))`);
      const previous = snapshot(currentEntries);
      writeJson(path.join(directory, 'backups', `before-restore-${Date.now()}.json`), previous);
      writeJson(pendingFile, backup);
      // 先销毁旧 Widget，再重新启动主渲染器，避免旧内存状态把导入的数据写回覆盖。
      closeWidgets();
      window.webContents.reload();
      return true;
    } finally { busy = false; }
  });
  handle('pending', () => readPending());
  handle('finish', () => {
    const pending = readPending();
    if (!pending) return;
    preferences.set(pending.closeBehavior);
    fs.unlinkSync(pendingFile);
  });
}
