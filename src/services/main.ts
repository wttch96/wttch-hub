/**
 * 文件说明：在主进程注册微信与服务分发接口，加密保存微信配置，生成登录二维码并向工作台广播状态。
 */

import { app, BrowserWindow, ipcMain, net, safeStorage } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { writeJson } from '../desktop/preferences';
import { createWechatRequest } from './wechatClient';
import { createWechatService, emptyWechat, parseWechatStored } from './wechatService';
import { debugLog } from '../desktop/logger';

/** 微信 token、会话 context、订阅一并加密保存；不进入 localStorage 或通用备份。 */
export function registerWechatIpc(isAppUrl: (url: string) => boolean) {
  const file = path.join(app.getPath('userData'), 'wechat-config.json');
  const secure = () => safeStorage.isEncryptionAvailable() && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');
  let initial = emptyWechat();
  let storageError = '';
  try {
    if (fs.existsSync(file)) {
      if (!secure()) throw new Error('系统安全存储不可用');
      initial = parseWechatStored(JSON.parse(safeStorage.decryptString(Buffer.from(JSON.parse(fs.readFileSync(file, 'utf8')).encrypted, 'base64'))));
    }
  } catch { storageError = '微信配置无法读取，请检查系统安全存储或重新登录'; }
  const service = createWechatService({
    initial,
    request: createWechatRequest((input, options) => net.fetch(input instanceof URL ? input.toString() : input, options)),
    qr: text => QRCode.toDataURL(text, { width: 240, margin: 2 }),
    save(value) {
      if (!secure()) throw new Error('系统安全存储不可用，无法保存微信配置');
      writeJson(file, { version: 1, encrypted: safeStorage.encryptString(JSON.stringify(value)).toString('base64') });
      storageError = '';
    },
    changed() {
      for (const window of BrowserWindow.getAllWindows()) if (!window.isDestroyed() && isAppUrl(window.webContents.getURL())
        && !new URL(window.webContents.getURL()).hash.startsWith('#/floating/')) window.webContents.send('wechat:changed', service.status());
    },
  });
  const trusted = (event: IpcMainInvokeEvent) => Boolean(BrowserWindow.fromWebContents(event.sender)) && event.senderFrame === event.sender.mainFrame
    && isAppUrl(event.senderFrame.url) && !new URL(event.senderFrame.url).hash.startsWith('#/floating/');
  const handle = (name: string, callback: (...input: unknown[]) => unknown) => ipcMain.handle(name, (event, ...input: unknown[]) => {
    if (!trusted(event)) throw new Error('请在主工作台使用微信服务');
    return callback(...input);
  });
  handle('wechat:status', () => ({ ...service.status(), ...(storageError ? { error: storageError } : {}) }));
  handle('wechat:login', () => { if (!secure()) throw new Error('系统安全存储不可用，不能保存登录凭据'); debugLog('wechat', 'login requested'); return service.login(); });
  handle('wechat:verify', code => service.verify(code));
  handle('wechat:cancel-login', () => { debugLog('wechat', 'login cancelled'); return service.cancelLogin(); });
  handle('wechat:logout', () => { debugLog('wechat', 'logout requested'); return service.logout(); });
  handle('wechat:enabled', enabled => { debugLog('wechat', 'enabled changed', { enabled }); return service.setEnabled(enabled); });
  handle('wechat:rules', rules => { debugLog('wechat', 'rules saved', { count: Array.isArray(rules) ? rules.length : undefined }); return service.saveRules(rules); });
  handle('services:register', input => { debugLog('services', 'registered', { count: Array.isArray(input) ? input.length : undefined }); return service.register(input); });
  handle('services:publish', async (topic, output) => { debugLog('services', 'publish requested', { topic }); const result = await service.publish(topic, output); debugLog('services', 'publish completed', { topic, sent: result.sent, failed: result.failed, skipped: result.skipped }); return result; });
  handle('services:status', topic => service.topicStatus(topic));
  app.on('before-quit', () => service.dispose());
  service.start();
}
