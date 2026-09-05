/**
 * 文件说明：在 Electron 主进程注册 AI 接口，校验调用页面，使用系统安全存储保护密钥并广播连接状态。
 */

import { app, BrowserWindow, ipcMain, net, safeStorage } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { defaultConfiguration, parseStoredConfiguration } from './config';
import { createAiService } from './service';
import { aiFailure } from './shared';

/**
 * 主进程持有密钥、磁盘访问和网络请求。只有当前应用窗口的主 frame 可调用 AI IPC，
 * 外部页面或嵌入的 iframe 不可借用宿主密钥；插件仍处于现有的可信同渲染器模型中。
 */
export const registerAiIpc = (isAppUrl: (url: string) => boolean) => {
  const configurationFile = path.join(app.getPath('userData'), 'ai-config.json');
  const canEncrypt = () => safeStorage.isEncryptionAvailable()
    && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');
  const service = createAiService({
    read: () => existsSync(configurationFile) ? parseStoredConfiguration(readFileSync(configurationFile, 'utf8')) : defaultConfiguration(),
    write(config) {
      mkdirSync(path.dirname(configurationFile), { recursive: true });
      const temporary = `${configurationFile}.${process.pid}.tmp`;
      try {
        // 同目录原子替换避免中途退出留下半份 JSON，0600 限制其他系统用户读取文件。
        writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
        renameSync(temporary, configurationFile);
      } finally { rmSync(temporary, { force: true }); }
    },
    encrypt(key) {
      if (!canEncrypt()) throw new Error('系统安全存储不可用');
      return safeStorage.encryptString(key).toString('base64');
    },
    decrypt(ciphertext) {
      if (!canEncrypt()) throw new Error('系统安全存储不可用');
      return safeStorage.decryptString(Buffer.from(ciphertext, 'base64'));
    },
    fetch: (input, init) => net.fetch(input instanceof URL ? input.toString() : input, init),
    onStatus(status) {
      for (const window of BrowserWindow.getAllWindows()) {
        try {
          if (!window.isDestroyed() && isAppUrl(window.webContents.getURL())) window.webContents.send('ai:status-changed', status);
        } catch { /* 窗口可能在广播期间关闭，不影响其他窗口接收状态。 */ }
      }
    },
  });
  const trusted = (event: IpcMainInvokeEvent) => Boolean(BrowserWindow.fromWebContents(event.sender))
    && event.senderFrame === event.sender.mainFrame && isAppUrl(event.senderFrame.url);
  const ownerFor = (event: IpcMainInvokeEvent, owner: unknown) => {
    if (!trusted(event) || typeof owner !== 'string' || !/^(builtin-chat|settings|plugin:[a-z0-9][a-z0-9-]*)$/.test(owner)) return undefined;
    // 取消权限按窗口和调用方双重隔离，插件不能误停另一个插件或另一窗口的请求。
    return `${event.sender.id}:${owner}`;
  };
  ipcMain.handle('ai:status', (event) => trusted(event)
    ? { ok: true, value: service.getStatus() } : aiFailure('FORBIDDEN', '当前页面无权访问 AI 服务。'));
  ipcMain.handle('ai:configure', (event, input: unknown) => {
    if (!trusted(event) || new URL(event.senderFrame.url).hash.startsWith('#/floating/')) return aiFailure('FORBIDDEN', '请在主窗口设置中配置 AI。');
    return service.configure(input);
  });
  ipcMain.handle('ai:chat', (event, owner: unknown, input: unknown) => {
    const key = ownerFor(event, owner);
    return key ? service.chat(key, input) : aiFailure('FORBIDDEN', '当前页面无权调用 AI。');
  });
  ipcMain.handle('ai:test', (event, owner: unknown, requestId?: string) => {
    const key = ownerFor(event, owner);
    return key ? service.test(key, requestId) : aiFailure('FORBIDDEN', '当前页面无权测试 AI。');
  });
  ipcMain.handle('ai:cancel', (event, owner: unknown, requestId: unknown) => {
    const key = ownerFor(event, owner);
    return key && typeof requestId === 'string' ? service.cancel(key, requestId) : false;
  });
  app.on('web-contents-created', (_event, contents) => {
    const prefix = `${contents.id}:`;
    contents.once('destroyed', () => service.cancelWindow(prefix));
    // 刷新和导航会销毁旧页面的订阅，同时停止该页面遗留的网络请求。
    contents.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
      if (isMainFrame && !isInPlace) service.cancelWindow(prefix);
    });
  });
};
